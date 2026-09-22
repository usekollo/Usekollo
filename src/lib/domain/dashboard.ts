// Assembling the dashboard payload.
import type { AuthedUser } from "@/lib/api/auth";
import type { DashboardSummary } from "@/features/dashboard/types";
import { getWalletBalance } from "@/lib/stellar/account";
import { PRIMARY_ASSET_CODE, assetRegistry } from "@/lib/stellar/config";
import { getGoals } from "@/lib/stellar/contract";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { amountToNextGoal, toUiActivity, toUiGoal, type ActivityRow } from "./mappers";

/** Rows the activity feed shows before it needs paginating. */
const ACTIVITY_LIMIT = 50;

/**
 * Everything /dashboard, /dashboard/goals and /dashboard/activity render, in
 * one call — the UI drives all three off a single `useDashboardSummary` query.
 *
 * Goals come from the chain rather than a database cache: `get_goals` resolves
 * an owner's whole portfolio in one simulated call, so reading through is both
 * cheaper than keeping a cache coherent and impossible to serve stale.
 * Activity comes from Postgres, because Soroban RPC only retains events for
 * about a week and the feed has to outlive that.
 */
export async function buildDashboardSummary(user: AuthedUser): Promise<DashboardSummary> {
  if (!user.stellarPublicKey) {
    return emptySummary();
  }

  const owner = user.stellarPublicKey;

  const assetCodes = Object.keys(assetRegistry());

  // Independent reads against different systems — no reason to queue them.
  // Every supported asset is read, not just the headline one: a deposit into
  // a USDC goal has to be checked against the wallet's USDC, and checking it
  // against XLM is how a deposit the wallet could never fund got as far as
  // the chain (and how one it *could* fund got its button disabled).
  const [onChainGoals, balances, activityRows] = await Promise.all([
    getGoals(owner),
    Promise.all(assetCodes.map((code) => getWalletBalance(owner, code))),
    loadActivity(owner),
  ]);

  const balance =
    balances.find((entry) => entry.assetCode === PRIMARY_ASSET_CODE) ??
    { assetCode: PRIMARY_ASSET_CODE, amount: 0, available: false };

  const goals = onChainGoals
    .map(toUiGoal)
    // Newest first, matching the order a user expects after creating one.
    .sort((a, b) => Number(b.id) - Number(a.id));

  return {
    balance: balance.amount,
    currency: balance.assetCode,
    balances: Object.fromEntries(
      balances.map((entry) => [
        entry.assetCode,
        { amount: entry.amount, available: entry.available },
      ]),
    ),
    amountToNextGoal: amountToNextGoal(goals),
    goals,
    activity: activityRows.map(toUiActivity),
  };
}

async function loadActivity(owner: string): Promise<ActivityRow[]> {
  const admin = createSupabaseAdmin();

  const { data, error } = await admin
    .from("activity")
    .select("id, goal_id, goal_name, type, amount, asset_code, status, tx_hash, created_at")
    .eq("owner", owner)
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (error) {
    // A failing feed should not take the whole dashboard down with it — the
    // balance and goals are the part the user actually needs.
    console.error("[dashboard] could not load activity:", error.message);
    return [];
  }

  return (data ?? []) as ActivityRow[];
}

/**
 * What a signed-in user sees before connecting a wallet. Deliberately a real,
 * empty summary rather than an error: the dashboard renders its own empty
 * states (see EmptyState / OngoingGoalsSection) and should show them.
 */
function emptySummary(): DashboardSummary {
  return {
    balance: 0,
    currency: PRIMARY_ASSET_CODE,
    balances: {},
    amountToNextGoal: 0,
    goals: [],
    activity: [],
  };
}
