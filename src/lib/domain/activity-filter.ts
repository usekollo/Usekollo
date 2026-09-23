// Filtering the activity feed in the browser.
//
// The whole feed already arrives with the dashboard summary, so searching and
// filtering are local operations — no endpoint, no round trip, and they work
// on a flaky connection. This becomes wrong once the feed is paginated
// server-side: at that point a query can only match rows that happen to have
// been fetched, and the filter has to move to the API.

import type { ActivityItem, ActivityStatus } from "@/features/dashboard/types";

/** "all" means no asset filter, rather than an asset literally named all. */
export type AssetFilter = string | "all";

/**
 * Whether one row matches a free-text query.
 *
 * Matches on every field the row actually shows — the hash, the operation, the
 * asset and the status — so what a user reads on screen is what they can
 * search for. Amount is included as plain digits because "25" is a reasonable
 * thing to type when looking for a 25 XLM deposit.
 */
export function matchesQuery(item: ActivityItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    // Both forms: the full hash so a pasted one matches, and the truncated
    // one so typing the fragment shown on screen matches too.
    item.fullHash,
    item.hash,
    item.operation,
    item.currency,
    item.status,
    String(item.amount),
  ].some((field) => field?.toLowerCase().includes(needle));
}

/** Narrows to one asset code. Case-insensitive: the chip says XLM, rows say XLM. */
export function matchesAsset(item: ActivityItem, asset: AssetFilter): boolean {
  if (asset === "all") return true;
  return item.currency?.toLowerCase() === asset.toLowerCase();
}

export function filterActivity(
  items: ActivityItem[],
  filters: { query?: string; status?: ActivityStatus | "all"; asset?: AssetFilter },
): ActivityItem[] {
  const { query = "", status = "all", asset = "all" } = filters;

  return items.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      matchesAsset(item, asset) &&
      matchesQuery(item, query),
  );
}

/**
 * The asset codes actually present in the feed, for building the filter chips.
 *
 * Derived from the data rather than hardcoded, so a chip never offers an asset
 * with nothing behind it, and adding an asset to the registry needs no change
 * here.
 */
export function assetsInFeed(items: ActivityItem[]): string[] {
  return [...new Set(items.map((item) => item.currency).filter(Boolean))].sort();
}
