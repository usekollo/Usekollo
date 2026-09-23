import { describe, expect, it } from "vitest";
import { monthlyPace } from "./pace";

// Fixed "today" so the suite does not drift with the calendar.
const NOW = new Date("2026-09-23T12:00:00Z");

const pace = (over: Partial<Parameters<typeof monthlyPace>[0]> = {}) =>
  monthlyPace({ target: 700, saved: 0, targetDate: "2026-12-23", now: NOW, ...over });

describe("monthlyPace", () => {
  it("spreads what is left over the months left", () => {
    // 91 days ≈ 3 months, nothing saved yet.
    const result = pace();
    expect(result.monthsRemaining).toBe(3);
    expect(result.amount).toBeCloseTo(700 / 3, 5);
  });

  it("counts only what is still missing, not the whole target", () => {
    // The old `target / 10` ignored this entirely.
    const result = pace({ saved: 400 });
    expect(result.amount).toBeCloseTo(300 / 3, 5);
  });

  it("reports a reached goal as complete rather than asking for more", () => {
    const result = pace({ saved: 700 });
    expect(result).toMatchObject({ complete: true, amount: 0 });
  });

  it("treats an overshot goal as complete, not negative", () => {
    expect(pace({ saved: 900 })).toMatchObject({ complete: true, amount: 0 });
  });

  it("asks for the full remainder when the goal is already past due", () => {
    const result = pace({ targetDate: "2026-08-01" });
    expect(result).toMatchObject({ overdue: true, amount: 700, monthsRemaining: 0 });
  });

  it("does not treat the target date itself as still having a month left", () => {
    const result = pace({ targetDate: "2026-09-23" });
    expect(result.overdue).toBe(true);
  });

  it("rounds a partial month up to one, never to zero", () => {
    // Eight days out: a quarter of a month is not an actionable figure, and
    // dividing by it would inflate the number.
    const result = pace({ targetDate: "2026-10-01" });
    expect(result.monthsRemaining).toBe(1);
    expect(result.amount).toBe(700);
  });

  it("scales to a long horizon", () => {
    const result = pace({ targetDate: "2029-09-23" });
    expect(result.monthsRemaining).toBe(36);
    expect(result.amount).toBeCloseTo(700 / 36, 5);
  });

  it("falls back to the remaining balance on an unusable date", () => {
    // Rendering NaN into the page is the one outcome that is never acceptable.
    const result = pace({ targetDate: "" });
    expect(Number.isFinite(result.amount)).toBe(true);
    expect(result.amount).toBe(700);
  });

  it("handles a zero target without dividing by it", () => {
    expect(pace({ target: 0 })).toMatchObject({ complete: true });
  });
});
