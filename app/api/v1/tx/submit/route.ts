import { requireWallet, type AuthedUser } from "@/lib/api/auth";
import { badRequest, handle, ok, readJson } from "@/lib/api/response";
import { submitSchema } from "@/lib/api/schemas";
import { buildDashboardSummary } from "@/lib/domain/dashboard";
import { toUiGoal } from "@/lib/domain/mappers";
import { fromBaseUnits } from "@/lib/stellar/amounts";
import { assetByContractId } from "@/lib/stellar/config";
import {
  describeInvocation,
  getGoal,
  parseTransaction,
  type Invocation,
} from "@/lib/stellar/contract";
import { assertSignedBySource } from "@/lib/stellar/signatures";
import { submitSigned } from "@/lib/stellar/submit";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Submits a Freighter-signed transaction and reports what it did.
 *
 * What the transaction does is read out of the envelope itself
 * (`describeInvocation`), never from the request body — so the activity feed
 * records what the user actually signed rather than whatever the client
 * claimed it was.
 *
 * The response also carries a freshly read dashboard summary. Every figure the
 * transaction moved — wallet balance, the goal's saved amount and status, the
 * amount left to the next goal, the activity feed — lands in one payload the
 * client writes straight into its cache, so the UI updates the instant the
 * result screen appears instead of waiting on a refetch of the slowest query
 * in the app.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireWallet(request);
    const { xdr } = submitSchema.parse(await readJson(request));

    const tx = parseTransaction(xdr);

    // The signer must be the wallet linked to this account. Without this, a
    // signed-in user could route someone else's transaction through us and
    // have it recorded against their own history.
    if (tx.source !== user.stellarPublicKey) {
      throw badRequest("That transaction was signed by a different wallet.");
    }

    // Also validates that it targets our contract and a method we expose.
    const invocation = describeInvocation(tx);

    // Catches a wrong-account or wrong-network signature here, where we can
    // say which it was, rather than as an opaque rejection from the network.
    assertSignedBySource(tx);

    const result = await submitSigned(tx);

    // create_goal returns the new id; deposit/withdraw carry theirs in the args.
    const goalId =
      invocation.method === "create_goal"
        ? Number(result.returnValue ?? 0)
        : (invocation.goalId ?? 0);

    // Read back the post-transaction state so the client can update without a
    // second round trip, and so the activity row records the real goal name.
    const goal = goalId > 0 ? await getGoal(goalId) : null;
    const asset = goal ? assetByContractId(goal.asset) : null;
    const decimals = asset?.decimals ?? 7;

    const amount =
      invocation.method === "create_goal"
        ? 0
        : fromBaseUnits(invocation.amount ?? 0n, decimals);

    // Recorded before the summary is read, so the new row is already in the
    // activity feed the client is about to be handed.
    await recordActivity({
      user,
      invocation,
      goalId,
      goalName: goal?.name ?? invocation.name,
      amount,
      assetCode: asset?.code ?? null,
      hash: result.hash,
      ledger: result.ledger,
    });

    return ok({
      success: true,
      action: invocation.method,
      transactionId: result.hash,
      ledger: result.ledger,
      goalId: String(goalId),
      goalName: goal?.name ?? invocation.name ?? "Goal",
      amount,
      currency: asset?.code ?? "XLM",
      goal: goal ? toUiGoal(goal) : null,
      summary: await readSummary(user),
    });
  });
}

/**
 * Post-transaction state for the client to prime its cache with.
 *
 * Read after the ledger has closed, so these are settled figures rather than
 * an optimistic guess — no drift to reconcile, and no need to subtract an
 * estimated network fee on the client to keep the balance looking right.
 *
 * Never allowed to fail the request: the money has already moved by this
 * point. A null summary just means the client falls back to refetching.
 */
async function readSummary(user: AuthedUser) {
  try {
    return await buildDashboardSummary(user);
  } catch (error) {
    console.error("[tx] could not read post-transaction summary:", error);
    return null;
  }
}

const ACTIVITY_TYPE = {
  create_goal: "create",
  deposit: "deposit",
  withdraw: "withdrawal",
} as const;

async function recordActivity(params: {
  user: AuthedUser;
  invocation: Invocation;
  goalId: number;
  goalName: string | null;
  amount: number;
  assetCode: string | null;
  hash: string;
  ledger: number | null;
}) {
  const admin = createSupabaseAdmin();

  // Upsert rather than insert: the cron indexer replays the same on-chain
  // event later, and the (tx_hash, type) unique index is what makes that a
  // no-op instead of a duplicate row in the feed.
  const { error } = await admin.from("activity").upsert(
    {
      goal_id: params.goalId > 0 ? params.goalId : null,
      goal_name: params.goalName,
      owner: params.user.stellarPublicKey,
      user_id: params.user.id,
      type: ACTIVITY_TYPE[params.invocation.method],
      amount: params.amount > 0 ? String(params.amount) : null,
      asset_code: params.assetCode,
      status: "success",
      tx_hash: params.hash,
      ledger_sequence: params.ledger,
    },
    { onConflict: "tx_hash,type" },
  );

  // The money has already moved — a failed bookkeeping write must not turn a
  // successful transaction into an error for the user. The indexer will pick
  // this up on its next pass.
  if (error) {
    console.error("[tx] could not record activity:", error.message);
  }
}
