// What a goal needs per month to land on time.
//
// This replaces `target / 10`, which ignored both how much was already saved
// and when the goal was actually due — a goal due next month and one due in
// three years showed the same figure.
//
// Kept as a pure function rather than inline in the view so the awkward cases
// (due this month, already past due, already reached) can be tested; see
// pace.test.ts.

const MS_PER_DAY = 86_400_000;

export interface MonthlyPace {
  /** What to put in each month from now to hit the target on time. */
  amount: number;
  /** Whole months left, never less than 1 while the goal is still open. */
  monthsRemaining: number;
  /** Target date has passed and the goal is still short. */
  overdue: boolean;
  /** Nothing left to save. */
  complete: boolean;
}

/**
 * `targetDate` is the ISO `yyyy-mm-dd` the goal carries (see domain/mappers
 * toIsoDate). Both sides are compared at UTC midnight so that a user in a
 * timezone behind UTC does not see a goal fall a day early.
 */
export function monthlyPace(params: {
  target: number;
  saved: number;
  targetDate: string;
  /** Injectable for tests; defaults to now. */
  now?: Date;
}): MonthlyPace {
  const { target, saved, targetDate } = params;
  const now = params.now ?? new Date();

  const remaining = Math.max(0, target - saved);

  if (remaining === 0) {
    return { amount: 0, monthsRemaining: 0, overdue: false, complete: true };
  }

  const due = Date.parse(`${targetDate}T00:00:00Z`);

  // An unparseable or missing date should not render NaN into the page. The
  // remaining balance is the honest fallback: it is what is owed, over the
  // shortest horizon we can justify.
  if (Number.isNaN(due)) {
    return { amount: remaining, monthsRemaining: 1, overdue: false, complete: false };
  }

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  // Past due and still short: the whole remainder is owed now, and spreading
  // it over an imaginary future month would understate what is needed.
  if ((due - today) / MS_PER_DAY <= 0) {
    return { amount: remaining, monthsRemaining: 0, overdue: true, complete: false };
  }

  const monthsRemaining = wholeMonthsBetween(now, new Date(due));

  return {
    amount: remaining / monthsRemaining,
    monthsRemaining,
    overdue: false,
    complete: false,
  };
}

/**
 * Whole calendar months from `now` to `due`, floored at 1.
 *
 * Counted on the calendar rather than by dividing elapsed days, because days
 * per month is not constant: three years measured in average-length months
 * comes to 36.01 because of the leap day in between, which rounds up to 37 and
 * makes a goal three years out report an extra month it does not have.
 *
 * A partial month counts as none — 23 September to 1 December is two whole
 * months, not three. That errs towards asking for slightly more per month,
 * which reaches the target early rather than late.
 */
function wholeMonthsBetween(now: Date, due: Date): number {
  let months =
    (due.getUTCFullYear() - now.getUTCFullYear()) * 12 +
    (due.getUTCMonth() - now.getUTCMonth());

  // The anniversary day has not come round yet this month, so the final month
  // is incomplete.
  if (due.getUTCDate() < now.getUTCDate()) months -= 1;

  // Anything inside the current month still needs one payment.
  return Math.max(1, months);
}
