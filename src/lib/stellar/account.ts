// Classic account data — what the wallet itself holds, as opposed to what the
// savings contract is holding on the user's behalf.
import { Horizon } from "@stellar/stellar-sdk";
import { assetByCode, horizonServer } from "./config";
import { fromBaseUnits, toBaseUnits } from "./amounts";

export interface WalletBalance {
  assetCode: string;
  /** Decimal, ready for the UI's formatMoney. */
  amount: number;
  /** False when the account exists but holds no trustline for this asset. */
  available: boolean;
}

/**
 * Spendable balance of one asset.
 *
 * "Spendable" matters for XLM specifically: part of a Stellar account's native
 * balance is locked as the base reserve plus a per-entry reserve, and
 * attempting to send it fails. Horizon does not subtract that for us, so the
 * dashboard's "Available" figure would otherwise promise money the user cannot
 * actually move.
 */
export async function getWalletBalance(
  publicKey: string,
  assetCode: string,
): Promise<WalletBalance> {
  const asset = assetByCode(assetCode);
  if (!asset) return { assetCode, amount: 0, available: false };

  let account: Horizon.AccountResponse;
  try {
    account = await horizonServer().loadAccount(publicKey);
  } catch {
    // Unfunded accounts simply do not exist on Horizon yet.
    return { assetCode, amount: 0, available: false };
  }

  const entry = account.balances.find((balance) => {
    if (asset.issuer === null) return balance.asset_type === "native";
    return (
      (balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === asset.code &&
      balance.asset_issuer === asset.issuer
    );
  });

  if (!entry) return { assetCode, amount: 0, available: false };

  const raw = toBaseUnits(entry.balance, asset.decimals);
  const spendable = asset.issuer === null ? raw - nativeReserve(account, asset.decimals) : raw;

  return {
    assetCode: asset.code,
    amount: fromBaseUnits(spendable > 0n ? spendable : 0n, asset.decimals),
    available: true,
  };
}

/**
 * Minimum XLM the network requires an account to retain: a 1 XLM base reserve
 * (2 x 0.5) plus 0.5 per subentry — trustlines, offers, signers and data
 * entries.
 */
function nativeReserve(account: Horizon.AccountResponse, decimals: number): bigint {
  const half = toBaseUnits("0.5", decimals);
  const subentries = BigInt(account.subentry_count ?? 0);
  return half * (2n + subentries);
}

/** Whether an account exists on-chain at all — i.e. has been funded. */
export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await horizonServer().loadAccount(publicKey);
    return true;
  } catch {
    return false;
  }
}
