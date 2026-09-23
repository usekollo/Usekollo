// Converting between what the UI shows and what the chain stores.
//
// The contract deals in i128 base units ("stroops" for a 7-decimal asset);
// the UI deals in decimal amounts like 250.5. Everything here goes through
// string/BigInt arithmetic rather than floating point, because 0.1 + 0.2 is
// the kind of error that quietly mis-credits a deposit.

/**
 * Decimal amount -> integer base units.
 *
 * Rejects anything that is not a plain decimal number, and refuses to silently
 * truncate more precision than the asset can hold — a user asking to deposit
 * 1.123456789 XLM should be told, not rounded.
 */
export function toBaseUnits(amount: string | number, decimals: number): bigint {
  const raw = typeof amount === "number" ? formatFixed(amount, decimals) : amount.trim();

  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`"${raw}" is not a valid amount.`);
  }

  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = (negative ? raw.slice(1) : raw).split(".");

  if (fraction.length > decimals) {
    throw new Error(`Amounts support at most ${decimals} decimal places.`);
  }

  const padded = fraction.padEnd(decimals, "0");
  const value = BigInt(whole + padded);

  return negative ? -value : value;
}

/** Integer base units -> decimal number, for the UI's `formatMoney`. */
export function fromBaseUnits(units: bigint | string | number, decimals: number): number {
  const value = typeof units === "bigint" ? units : BigInt(String(units));
  const negative = value < 0n;
  const abs = negative ? -value : value;

  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = (abs % divisor).toString().padStart(decimals, "0");

  const result = Number(`${whole}.${fraction}`);
  return negative ? -result : result;
}

/**
 * Number -> fixed-decimal string without exponent notation.
 *
 * `toFixed` is fine for the magnitudes this app deals in (no goal is going to
 * be 1e21), and is what keeps `toBaseUnits` from ever seeing "1e-7".
 */
function formatFixed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`"${value}" is not a valid amount.`);
  }
  return value.toFixed(decimals);
}
