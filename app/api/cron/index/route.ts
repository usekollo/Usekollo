import { timingSafeEqual } from "node:crypto";
import { forbidden, handle, ok } from "@/lib/api/response";
import { getEnv } from "@/lib/env";
import { fromBaseUnits } from "@/lib/stellar/amounts";
import { assetByContractId, contractId } from "@/lib/stellar/config";
import { getGoal } from "@/lib/stellar/contract";
import { readGoalEvents, type GoalEvent } from "@/lib/stellar/events";
import { createSupabaseAdmin } from "@/lib/supabase/server";

// The submit route already writes an activity row the moment a transaction
// confirms, so this is a reconciliation pass, not the primary write path. It
// catches:
//   - transactions made against the contract outside this app (the CLI,
//     another client), which have no row at all;
//   - rows the submit route failed to write because the database was briefly
//     unavailable after the money had already moved.
//
// Every write is an upsert on (tx_hash, type) and the checkpoint only moves
// forward, so re-running it — or two runs overlapping — is a no-op for
// anything already recorded.
//
// Scheduled from Supabase Cron rather than vercel.json: Vercel's Hobby plan
// allows one cron run per day, where pg_cron has no such limit and can run
// this every few minutes. See supabase/cron.sql.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EVENT_TO_ACTIVITY: Record<GoalEvent["verb"], string | null> = {
  created: "create",
  deposit: "deposit",
  withdraw: "withdrawal",
  // Not a movement of money in its own right — it always accompanies the
  // deposit that triggered it, which is already recorded.
  completed: null,
};

export async function GET(request: Request) {
  return handle(async () => {
    assertCronAuthorised(request);

    const admin = createSupabaseAdmin();
    const contract = contractId();

    const { data: checkpoint } = await admin
      .from("indexer_checkpoint")
      .select("last_ledger")
      .eq("contract_id", contract)
      .maybeSingle();

    // +1 so a resumed pass does not re-read the ledger it last finished on.
    const startLedger = checkpoint?.last_ledger ? Number(checkpoint.last_ledger) + 1 : 1;
    const page = await readGoalEvents(startLedger);

    let recorded = 0;
    for (const event of page.events) {
      if (await recordEvent(event)) recorded += 1;
    }

    // `scannedTo` is how far the scan actually got, which is usually well short
    // of the node's latest ledger — RPC caps the range it will cover per
    // request. Saving anything further ahead would skip the gap for good.
    await admin.from("indexer_checkpoint").upsert(
      { contract_id: contract, last_ledger: page.scannedTo, updated_at: new Date().toISOString() },
      { onConflict: "contract_id" },
    );

    return ok({
      scannedFrom: startLedger,
      scannedTo: page.scannedTo,
      eventsRead: page.events.length,
      rowsRecorded: recorded,
      // True when a backlog remains; the next scheduled pass picks it up from
      // the checkpoint just saved.
      moreAvailable: page.moreAvailable,
    });
  });
}

/**
 * The scheduler presents CRON_SECRET as a bearer token. Without this check the
 * endpoint is a public, unauthenticated way to drive load onto Soroban RPC.
 *
 * Scheduled from Supabase Cron (pg_cron + pg_net) — see supabase/cron.sql.
 * Compared in constant time: a plain `!==` on a secret leaks its prefix
 * through response timing to anyone willing to measure.
 */
function assertCronAuthorised(request: Request) {
  const expected = `Bearer ${getEnv().CRON_SECRET}`;
  const received = request.headers.get("authorization") ?? "";

  const a = Buffer.from(expected);
  const b = Buffer.from(received);

  // timingSafeEqual requires equal lengths, and throws otherwise — so the
  // length check has to come first. Length alone reveals nothing useful.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw forbidden("Not authorised.");
  }
}

async function recordEvent(event: GoalEvent): Promise<boolean> {
  const type = EVENT_TO_ACTIVITY[event.verb];
  if (!type || !event.owner) return false;

  const admin = createSupabaseAdmin();

  // Only reach for the goal's details when there is actually a gap to fill —
  // the common case is that submit already wrote this row.
  const { data: existing } = await admin
    .from("activity")
    .select("id")
    .eq("tx_hash", event.txHash)
    .eq("type", type)
    .maybeSingle();

  if (existing) return false;

  const goal = event.goalId > 0 ? await getGoal(event.goalId) : null;
  const asset = event.assetContractId
    ? assetByContractId(event.assetContractId)
    : goal
      ? assetByContractId(goal.asset)
      : null;
  const decimals = asset?.decimals ?? 7;

  // Link it back to an app account where one has claimed this wallet. Rows for
  // unknown wallets are still stored: the address is the identity the chain
  // knows, and the row becomes visible the moment that wallet is connected.
  const { data: owner } = await admin
    .from("users")
    .select("id")
    .eq("stellar_public_key", event.owner)
    .maybeSingle();

  const { error } = await admin.from("activity").upsert(
    {
      goal_id: event.goalId > 0 ? event.goalId : null,
      goal_name: goal?.name ?? null,
      owner: event.owner,
      user_id: owner?.id ?? null,
      type,
      amount: event.amount != null ? String(fromBaseUnits(event.amount, decimals)) : null,
      asset_code: asset?.code ?? null,
      status: "success",
      tx_hash: event.txHash,
      ledger_sequence: event.ledger,
      created_at: event.createdAt,
    },
    { onConflict: "tx_hash,type" },
  );

  if (error) {
    console.error("[indexer] could not record event:", error.message);
    return false;
  }

  return true;
}
