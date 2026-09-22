// Establishing a trustline so the wallet can hold a non-native asset.
// SERVER ONLY — like everything else here, this builds unsigned XDR and never
// touches a secret key.
//
// This is the one part of the app that is NOT a Soroban contract call. A
// trustline is classic Stellar (a `changeTrust` operation), so it is built
// against Horizon and submitted there, not through the Soroban RPC path in
// submit.ts. It is a prerequisite for everything else: the savings contract's
// `deposit` calls `transfer` on the asset's SAC, and that reverts with
// TrustlineMissing if the wallet cannot hold the asset in the first place.

import {
  Asset,
  BASE_FEE,
  Horizon,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { ApiError } from "@/lib/api/response";
import { assetByCode, horizonServer, networkPassphrase } from "./config";

/** The reserve Stellar locks up per trustline — worth telling the user about. */
export const TRUSTLINE_RESERVE_XLM = 0.5;

export interface PreparedTrustline {
  xdr: string;
  networkPassphrase: string;
  /** The linked wallet this was built for — see UnsignedTransaction.source. */
  source: string;
  assetCode: string;
  /** XLM that becomes unspendable while the trustline exists. */
  reserveXlm: number;
}

/**
 * Builds an unsigned `changeTrust` for `assetCode`, for the browser to sign.
 *
 * No limit is set, so the trustline is unlimited — the alternative is picking
 * a cap the user did not ask for and that silently rejects a later deposit
 * once they cross it.
 */
export async function buildChangeTrust(params: {
  owner: string;
  assetCode: string;
}): Promise<PreparedTrustline> {
  const asset = assetByCode(params.assetCode);
  if (!asset) throw new ApiError(400, `${params.assetCode} is not a supported asset.`);

  if (asset.issuer === null) {
    throw new ApiError(400, `${asset.code} is the native asset — it needs no trustline.`);
  }

  const server = horizonServer();

  let account: Horizon.AccountResponse;
  try {
    account = await server.loadAccount(params.owner);
  } catch {
    throw new ApiError(
      400,
      "That Stellar account does not exist yet on this network — fund it first.",
    );
  }

  // Each trustline raises the account's minimum balance by 0.5 XLM. Checking
  // here turns an opaque `tx_insufficient_balance` at submission into
  // something the user can act on.
  const native = account.balances.find((balance) => balance.asset_type === "native");
  const spendable = Number(native?.balance ?? 0) - reserveFor(account) - TRUSTLINE_RESERVE_XLM;
  if (spendable < 0) {
    throw new ApiError(
      400,
      `Adding a ${asset.code} trustline locks up ${TRUSTLINE_RESERVE_XLM} XLM, and this account does not have that spare. Fund it with a little more XLM first.`,
    );
  }

  const alreadyTrusted = account.balances.some(
    (balance) =>
      (balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === asset.code &&
      balance.asset_issuer === asset.issuer,
  );
  if (alreadyTrusted) {
    throw new ApiError(409, `Your wallet can already hold ${asset.code}.`);
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(Operation.changeTrust({ asset: new Asset(asset.code, asset.issuer) }))
    // Matches the Soroban path: the user has to approve in their wallet,
    // which can take a while, and an expired transaction fails confusingly.
    .setTimeout(300)
    .build();

  return {
    xdr: tx.toXDR(),
    networkPassphrase: networkPassphrase(),
    source: params.owner,
    assetCode: asset.code,
    reserveXlm: TRUSTLINE_RESERVE_XLM,
  };
}

/**
 * Checks a signed envelope really is just the trustline we handed out.
 *
 * Same reasoning as `describeInvocation` for contract calls: the transaction
 * itself is the source of truth, so a client cannot get us to submit
 * something else through this route.
 */
export function assertIsChangeTrust(tx: Transaction, expectedCode: string): void {
  if (tx.operations.length !== 1) {
    throw new ApiError(400, "That transaction does not look like a trustline.");
  }

  const op = tx.operations[0];
  if (op.type !== "changeTrust") {
    throw new ApiError(400, "That transaction does not look like a trustline.");
  }

  // `line` is an Asset for a classic trustline (or a LiquidityPoolAsset,
  // which has no `getCode` — hence the guard rather than a cast).
  const line = op.line;
  if (!("getCode" in line) || line.getCode() !== expectedCode) {
    throw new ApiError(400, "That trustline is for a different asset.");
  }
}

/** Submits the signed classic transaction through Horizon. */
export async function submitTrustline(tx: Transaction): Promise<{ hash: string }> {
  try {
    const result = await horizonServer().submitTransaction(tx);
    return { hash: result.hash };
  } catch (error) {
    throw toHorizonError(error);
  }
}

/**
 * Minimum XLM the account must retain: 1 XLM base reserve (2 x 0.5) plus 0.5
 * per existing subentry. Mirrors `nativeReserve` in account.ts.
 */
function reserveFor(account: Horizon.AccountResponse): number {
  return 0.5 * (2 + (account.subentry_count ?? 0));
}

/**
 * Horizon reports a rejection as a nested result-codes object rather than a
 * message, so the useful part has to be dug out or the user gets "Request
 * failed with status code 400".
 */
function toHorizonError(error: unknown): ApiError {
  const codes = (
    error as {
      response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } };
    }
  )?.response?.data?.extras?.result_codes;

  const operation = codes?.operations?.find((code) => code !== "op_success");

  if (operation === "op_low_reserve") {
    return new ApiError(
      400,
      `Adding this trustline locks up ${TRUSTLINE_RESERVE_XLM} XLM, and this account does not have that spare.`,
    );
  }
  if (codes?.transaction === "tx_insufficient_balance") {
    return new ApiError(400, "This account does not have enough XLM to cover the network fee.");
  }
  if (codes?.transaction === "tx_bad_auth" || operation === "op_no_source_account") {
    return new ApiError(400, "That transaction was not signed correctly.");
  }

  console.error("[stellar] trustline submission failed:", codes ?? error);
  return new ApiError(502, "The Stellar network rejected that trustline. Please try again.");
}
