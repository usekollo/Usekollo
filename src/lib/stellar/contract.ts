// Talking to the savings-goal contract. SERVER ONLY.
//
// Writes are never signed here. The backend builds and simulates the
// transaction and hands back unsigned XDR; the browser signs it with Freighter
// (lib/wallet/freighter.ts) and posts it back to /api/v1/tx/submit. That is
// what keeps the app non-custodial — this process never sees a secret key.

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { ApiError } from "@/lib/api/response";
import { assetRegistry, contractId, networkPassphrase, sorobanServer } from "./config";
import type { AssetConfig } from "./config";

/** Mirrors the contract's `Error` enum. Keep the numbering in step with lib.rs. */
const CONTRACT_ERRORS: Record<number, string> = {
  1: "The savings contract has not been set up yet.",
  2: "The savings contract is already set up.",
  3: "That goal no longer exists.",
  4: "That goal belongs to a different wallet.",
  5: "Enter an amount greater than zero.",
  6: "That asset is not supported yet.",
  7: "Choose a target date in the future.",
  8: "That is more than this goal is holding.",
  9: "That amount is too large.",
  10: "That goal name is too long.",
};

/**
 * Mirrors the Stellar Asset Contract's own `ContractError` enum.
 *
 * A deposit is two calls, not one: our `deposit`, which then calls `transfer`
 * on the asset's SAC. When the SAC rejects — no trustline, not enough of the
 * asset, issuer froze it — the host reports it in exactly the same
 * `Error(Contract, #N)` shape as one of ours, with its own numbering. Reading
 * those N against CONTRACT_ERRORS is how "you have no USDC trustline" (#13)
 * became a generic 502, and how "not enough USDC" (#10) would have become
 * "That goal name is too long."
 *
 * `{asset}` is substituted with the asset code when it can be identified.
 */
const TOKEN_ERRORS: Record<number, string> = {
  4: "Your wallet did not authorize moving that {asset}.",
  5: "Your wallet did not authorize moving that {asset}.",
  6: "That Stellar account does not exist yet on this network — fund it first.",
  8: "Enter an amount greater than zero.",
  9: "Your wallet has not approved moving that {asset}.",
  10: "You do not have enough {asset} in your wallet.",
  11: "Your {asset} balance is frozen by its issuer and cannot be moved.",
  12: "That amount is too large.",
  13: "Your wallet cannot hold {asset} yet — add a {asset} trustline in your wallet, then try again.",
};

export type OnChainStatus = "Active" | "Completed" | "Withdrawn";

export interface OnChainGoal {
  id: number;
  owner: string;
  name: string;
  asset: string;
  targetAmount: bigint;
  currentAmount: bigint;
  targetDate: number;
  status: OnChainStatus;
  createdAt: number;
}

// -- reads ----------------------------------------------------------------

/**
 * Simulation-only call. Costs nothing, touches no account, and needs no
 * signature — which is why it can use a throwaway source account.
 */
async function simulateRead(method: string, args: xdr.ScVal[]): Promise<unknown> {
  const server = sorobanServer();
  const contract = new Contract(contractId());

  // Any well-formed address works: simulation never checks the source exists,
  // and nothing is submitted.
  const source = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw toApiError(sim.error, method);
  }

  if (!sim.result?.retval) return null;
  return scValToNative(sim.result.retval);
}

/** Every goal owned by `owner`, in one round trip (contract `get_goals`). */
export async function getGoals(owner: string): Promise<OnChainGoal[]> {
  const raw = await simulateRead("get_goals", [new Address(owner).toScVal()]);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeGoal);
}

export async function getGoal(goalId: number): Promise<OnChainGoal | null> {
  try {
    const raw = await simulateRead("get_goal", [nativeToScVal(goalId, { type: "u64" })]);
    return raw ? normalizeGoal(raw) : null;
  } catch (error) {
    // NotFound is an expected answer to "does this goal exist", not a failure.
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

/**
 * `scValToNative` gives us the contract's own field names (snake_case), i128s
 * as BigInt and u64s as BigInt. This is the single place that shape is
 * translated into the app's.
 */
function normalizeGoal(raw: unknown): OnChainGoal {
  const goal = raw as Record<string, unknown>;

  return {
    id: Number(goal.id),
    owner: String(goal.owner),
    name: String(goal.name),
    asset: String(goal.asset),
    targetAmount: BigInt(goal.target_amount as string | bigint),
    currentAmount: BigInt(goal.current_amount as string | bigint),
    targetDate: Number(goal.target_date),
    status: normalizeStatus(goal.status),
    createdAt: Number(goal.created_at),
  };
}

/**
 * A unit enum variant comes back either as the bare symbol or wrapped in a
 * single-element array, depending on SDK version. Accept both rather than
 * pinning behaviour we do not control.
 */
function normalizeStatus(value: unknown): OnChainStatus {
  const symbol = Array.isArray(value) ? value[0] : value;
  const name = String(symbol);

  if (name === "Completed" || name === "Withdrawn") return name;
  return "Active";
}

// -- writes (build + simulate only; the browser signs) --------------------

export interface UnsignedTransaction {
  /** Base64 XDR, fully prepared: simulated, with resource fees and auth set. */
  xdr: string;
  networkPassphrase: string;
  /**
   * The account this was built for — always the wallet linked to the session.
   * The browser checks the wallet it is about to sign with against this, so a
   * picker returning a different account fails with something readable
   * instead of `tx_bad_auth` after the fact.
   */
  source: string;
}

async function buildInvocation(
  source: string,
  method: string,
  args: xdr.ScVal[],
): Promise<UnsignedTransaction> {
  const server = sorobanServer();
  const passphrase = networkPassphrase();
  const contract = new Contract(contractId());

  let account: Account;
  try {
    account = await server.getAccount(source);
  } catch {
    throw new ApiError(
      400,
      "That Stellar account does not exist yet on this network — fund it first.",
    );
  }

  const tx = new TransactionBuilder(account, {
    // The inclusion fee. `assembleTransaction` adds the (much larger) Soroban
    // resource fee on top from the simulation result.
    fee: BASE_FEE,
    networkPassphrase: passphrase,
  })
    .addOperation(contract.call(method, ...args))
    // Generous but finite: the user has to approve in Freighter, which can
    // take a while, and an expired transaction fails confusingly.
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw toApiError(sim.error, method);
  }

  // Simulating before signing is what lets a doomed transaction fail here,
  // with a readable message, instead of after the user has approved it and
  // paid a fee.
  const prepared = rpc.assembleTransaction(tx, sim).build();

  return { xdr: prepared.toXDR(), networkPassphrase: passphrase, source };
}

export function buildCreateGoal(params: {
  owner: string;
  name: string;
  assetContractId: string;
  targetAmount: bigint;
  targetDate: number;
}): Promise<UnsignedTransaction> {
  return buildInvocation(params.owner, "create_goal", [
    new Address(params.owner).toScVal(),
    nativeToScVal(params.name, { type: "string" }),
    new Address(params.assetContractId).toScVal(),
    nativeToScVal(params.targetAmount, { type: "i128" }),
    nativeToScVal(params.targetDate, { type: "u64" }),
  ]);
}

export function buildDeposit(params: {
  owner: string;
  goalId: number;
  amount: bigint;
}): Promise<UnsignedTransaction> {
  return buildInvocation(params.owner, "deposit", [
    new Address(params.owner).toScVal(),
    nativeToScVal(params.goalId, { type: "u64" }),
    nativeToScVal(params.amount, { type: "i128" }),
  ]);
}

export function buildWithdraw(params: {
  owner: string;
  goalId: number;
  amount: bigint;
}): Promise<UnsignedTransaction> {
  return buildInvocation(params.owner, "withdraw", [
    new Address(params.owner).toScVal(),
    nativeToScVal(params.goalId, { type: "u64" }),
    nativeToScVal(params.amount, { type: "i128" }),
  ]);
}

/** Re-hydrates signed XDR the browser sends back. */
export function parseTransaction(signedXdr: string): Transaction {
  try {
    return new Transaction(signedXdr, networkPassphrase());
  } catch {
    throw new ApiError(400, "That signed transaction could not be read.");
  }
}

export interface Invocation {
  method: "create_goal" | "deposit" | "withdraw";
  goalId: number | null;
  /** Base units; null for create_goal, where the amount is a target, not a transfer. */
  amount: bigint | null;
  /** create_goal only. */
  name: string | null;
  assetContractId: string | null;
}

/**
 * Reads back what a signed transaction actually does.
 *
 * The client could simply tell us "this was a 50 USDC deposit to goal 3", but
 * then the activity feed would record whatever it claimed rather than what the
 * user signed. Decoding the envelope instead makes the transaction itself the
 * source of truth, and lets us reject anything aimed somewhere other than our
 * own contract.
 */
export function describeInvocation(tx: Transaction): Invocation {
  if (tx.operations.length !== 1) {
    throw new ApiError(400, "That transaction does not look like a savings operation.");
  }

  const op = tx.operations[0];
  if (op.type !== "invokeHostFunction") {
    throw new ApiError(400, "That transaction does not look like a savings operation.");
  }

  // `op.func` is a discriminated union keyed on `type`, so this narrows it to
  // the invoke-contract arm — no cast needed.
  if (op.func.type !== "hostFunctionTypeInvokeContract") {
    throw new ApiError(400, "That transaction does not call a contract.");
  }
  const invoked = op.func.invokeContract;

  const target = Address.fromScAddress(invoked.contractAddress).toString();
  if (target !== contractId()) {
    throw new ApiError(400, "That transaction targets a different contract.");
  }

  const method = invoked.functionName.toString();
  const args = invoked.args.map((arg: xdr.ScVal) => scValToNative(arg));

  switch (method) {
    case "create_goal":
      // (owner, name, asset, target_amount, target_date)
      return {
        method,
        goalId: null,
        amount: null,
        name: String(args[1]),
        assetContractId: String(args[2]),
      };
    case "deposit":
    case "withdraw":
      // (owner, goal_id, amount)
      return {
        method,
        goalId: Number(args[1]),
        amount: BigInt(args[2] as string | bigint),
        name: null,
        assetContractId: null,
      };
    default:
      throw new ApiError(400, "That transaction calls an unsupported operation.");
  }
}

// -- errors ---------------------------------------------------------------

/**
 * Which contract actually raised the error.
 *
 * `Error(Contract, #N)` carries no indication of whose enum N belongs to, and
 * the host escalates an inner failure outward unchanged — so a SAC error and
 * one of ours are textually identical. What does survive is the diagnostic
 * event log, which names the contract each frame belongs to. If an asset's
 * SAC appears in it, the deepest frame is the token's and N is a TokenError.
 */
function failingAsset(raw: string): AssetConfig | null {
  for (const asset of Object.values(assetRegistry())) {
    // Deliberately not a bare `includes`: `create_goal` takes an asset
    // address as an *argument*, so the id appears in the log of a genuine
    // InvalidAsset error from our own contract too. Only these two forms
    // mean a frame actually belongs to, or calls into, the SAC.
    const ownsFrame = raw.includes(`contract:${asset.contractId}`);
    const calledInto = raw.includes(`fn_call, ${asset.contractId},`);
    if (ownsFrame || calledInto) return asset;
  }
  return null;
}

/**
 * Soroban reports a contract error as a string containing `Error(Contract, #N)`.
 * Map N back onto the enum of whichever contract raised it, so the user sees
 * "add a USDC trustline in your wallet" rather than a raw host error — or,
 * worse, our own enum's message for the same number.
 */
export function toApiError(raw: string, context: string): ApiError {
  const match = /Error\(Contract,\s*#(\d+)\)/.exec(raw);

  if (match) {
    const code = Number(match[1]);
    const asset = failingAsset(raw);

    if (asset) {
      const template = TOKEN_ERRORS[code];
      if (template) {
        return new ApiError(
          400,
          template.replaceAll("{asset}", asset.code),
          `TokenError#${code}`,
        );
      }
      // An unmapped token error is still the token's, not ours — falling
      // through to CONTRACT_ERRORS here would misreport it.
      console.error(`[stellar] ${context} failed in ${asset.code} SAC:`, raw);
      return new ApiError(502, `Your wallet could not move that ${asset.code}. Please try again.`);
    }

    const message = CONTRACT_ERRORS[code];
    if (message) {
      // NotFound is the one that should read as a 404 to the client.
      return new ApiError(code === 3 ? 404 : 400, message, `ContractError#${code}`);
    }
  }

  console.error(`[stellar] ${context} simulation failed:`, raw);
  return new ApiError(502, "The Stellar network rejected that request. Please try again.");
}
