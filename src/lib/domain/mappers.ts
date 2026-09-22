// Chain and database rows -> the exact shapes the existing UI already reads.
//
// The frontend is the specification here: `Goal`, `ActivityItem` and
// `DashboardSummary` in features/dashboard/types.ts were built against the
// mock data layer, and every component renders off them. Nothing in this file
// invents a field the UI does not already use, and nothing renames one.

import type { ActivityItem, ActivityStatus, Goal, GoalStatus } from "@/features/dashboard/types";
import { fromBaseUnits } from "@/lib/stellar/amounts";
import { assetByContractId } from "@/lib/stellar/config";
import type { OnChainGoal } from "@/lib/stellar/contract";

/**
 * A goal inside this window is shown as "urgent" rather than "running".
 *
 * The contract has no such state — it only knows Active/Completed/Withdrawn —
 * so urgency is derived here from the target date, which is what the three
 * badge colours in the UI are keyed off.
 */
const URGENT_WINDOW_DAYS = 30;

export function toUiGoal(goal: OnChainGoal): Goal {
  const asset = assetByContractId(goal.asset);
  const decimals = asset?.decimals ?? 7;

  const saved = fromBaseUnits(goal.currentAmount, decimals);
  const target = fromBaseUnits(goal.targetAmount, decimals);

  return {
    id: String(goal.id),
    name: goal.name,
    saved,
    target,
    currency: asset?.code ?? "XLM",
    status: toUiStatus(goal, saved, target),
    targetDate: toIsoDate(goal.targetDate),
    // Only read once a goal is done. The amount actually sitting in the
    // contract is the honest figure — it can exceed `target` when the final
    // deposit overshot.
    ...(goal.status === "Completed" ? { totalDisbursed: saved } : {}),
  };
}

function toUiStatus(goal: OnChainGoal, saved: number, target: number): GoalStatus {
  if (goal.status === "Completed" || (target > 0 && saved >= target)) return "done";

  // A withdrawn goal is back to zero and still has a target to hit, so it
  // reads as running — the same way the UI's own withdraw flow drops a
  // completed goal back to "running" once it dips below target.
  const daysLeft = (goal.targetDate * 1000 - Date.now()) / 86_400_000;
  return daysLeft <= URGENT_WINDOW_DAYS ? "urgent" : "running";
}

/** Unix seconds -> "yyyy-mm-dd", which is what formatMonthYear parses. */
export function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

/** "yyyy-mm-dd" -> unix seconds, at end of day so the deadline is inclusive. */
export function fromIsoDate(value: string): number {
  return Math.floor(new Date(`${value}T23:59:59Z`).getTime() / 1000);
}

// -- activity -------------------------------------------------------------

export interface ActivityRow {
  id: string;
  goal_id: number | null;
  goal_name: string | null;
  type: string;
  amount: string | null;
  asset_code: string | null;
  status: string;
  tx_hash: string;
  created_at: string;
}

export function toUiActivity(row: ActivityRow): ActivityItem {
  return {
    id: row.id,
    hash: truncateHash(row.tx_hash),
    operation: describeOperation(row.type, row.goal_name),
    dateTime: formatDateTime(row.created_at),
    amount: row.amount ? Number(row.amount) : 0,
    currency: row.asset_code ?? "XLM",
    direction: row.type === "withdrawal" ? "out" : "in",
    status: toActivityStatus(row.status),
  };
}

function describeOperation(type: string, goalName: string | null): string {
  const name = goalName ?? "goal";

  switch (type) {
    case "deposit":
      return `Deposit to ${name}`;
    case "withdrawal":
      return `Withdrawal from ${name}`;
    case "create":
      return `Created ${name}`;
    default:
      return name;
  }
}

function toActivityStatus(value: string): ActivityStatus {
  if (value === "failed" || value === "pending") return value;
  return "success";
}

/** "7f3a9c...2b8e" — the same shape the feed already renders. */
function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/** "Oct 24, 2023 · 14:32", matching what the activity list expects. */
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * How much more is needed to finish the goal closest to completion.
 *
 * "Next goal" is the one with the least left to do, not the soonest due —
 * that is the figure the dashboard headline is encouraging the user toward.
 */
export function amountToNextGoal(goals: Goal[]): number {
  const outstanding = goals
    .filter((goal) => goal.status !== "done" && goal.target > goal.saved)
    .map((goal) => goal.target - goal.saved);

  if (outstanding.length === 0) return 0;
  return Math.min(...outstanding);
}
