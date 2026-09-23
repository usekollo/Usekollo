import { describe, expect, it } from "vitest";
import { assetsInFeed, filterActivity, matchesQuery } from "./activity-filter";
import type { ActivityItem } from "@/features/dashboard/types";

const row = (over: Partial<ActivityItem> = {}): ActivityItem => ({
  id: "1",
  hash: "abc123...f456",
  fullHash: "abc123def4567890abcdef",
  operation: "Deposit",
  dateTime: "2026-09-23T10:00:00Z",
  amount: 25,
  currency: "XLM",
  direction: "out",
  status: "success",
  ...over,
});

const feed = [
  row({ id: "1", hash: "aaa111", operation: "Deposit", currency: "XLM", amount: 25 }),
  row({ id: "2", hash: "bbb222", operation: "Withdrawal", currency: "USDC", amount: 50, status: "failed" }),
  row({ id: "3", hash: "ccc333", operation: "Create", currency: "USDC", amount: 0, status: "pending" }),
];

describe("matchesQuery", () => {
  it("matches an empty query so the feed is unfiltered by default", () => {
    expect(matchesQuery(row(), "")).toBe(true);
    expect(matchesQuery(row(), "   ")).toBe(true);
  });

  it("matches the truncated hash shown on screen", () => {
    expect(matchesQuery(row({ hash: "7f3a9c...2b8e" }), "7f3a9c")).toBe(true);
  });

  it("matches a full hash pasted from an explorer", () => {
    // The regression this guards: the feed only renders a truncated hash, so
    // searching that alone meant a pasted hash — the exact thing the search
    // box asks for — matched nothing.
    const full = "fef105ee1e701bfcdf304f75725cd2e33ae7e704c2128a68d0ff774d6229fab1";
    expect(matchesQuery(row({ hash: "fef105...ab1", fullHash: full }), full)).toBe(true);
  });

  it("matches a middle fragment of the full hash that truncation hides", () => {
    const full = "fef105ee1e701bfcdf304f75725cd2e33ae7e704c2128a68d0ff774d6229fab1";
    expect(matchesQuery(row({ hash: "fef105...ab1", fullHash: full }), "725cd2e3")).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(matchesQuery(row({ operation: "Deposit" }), "  DEPOSIT ")).toBe(true);
  });

  it("matches the asset code", () => {
    expect(matchesQuery(row({ currency: "USDC" }), "usdc")).toBe(true);
    expect(matchesQuery(row({ currency: "XLM" }), "usdc")).toBe(false);
  });

  it("matches the amount typed as plain digits", () => {
    expect(matchesQuery(row({ amount: 25 }), "25")).toBe(true);
  });

  it("does not match something absent from every field", () => {
    expect(matchesQuery(row(), "zzzz")).toBe(false);
  });
});

describe("filterActivity", () => {
  it("returns everything when nothing is narrowed", () => {
    expect(filterActivity(feed, {})).toHaveLength(3);
  });

  it("narrows by status", () => {
    expect(filterActivity(feed, { status: "failed" }).map((r) => r.id)).toEqual(["2"]);
  });

  it("narrows by asset", () => {
    expect(filterActivity(feed, { asset: "USDC" }).map((r) => r.id)).toEqual(["2", "3"]);
  });

  it("applies query, status and asset together rather than as alternatives", () => {
    // USDC has two rows; only one of them failed.
    expect(filterActivity(feed, { asset: "USDC", status: "failed" }).map((r) => r.id)).toEqual(["2"]);
  });

  it("can return nothing without throwing", () => {
    expect(filterActivity(feed, { query: "nothing-matches-this" })).toEqual([]);
  });
});

describe("assetsInFeed", () => {
  it("lists each asset once, sorted, so chips are stable", () => {
    expect(assetsInFeed(feed)).toEqual(["USDC", "XLM"]);
  });

  it("is empty for an empty feed rather than offering dead chips", () => {
    expect(assetsInFeed([])).toEqual([]);
  });
});
