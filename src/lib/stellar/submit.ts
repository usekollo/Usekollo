// Submitting a Freighter-signed transaction and waiting for its outcome.
import { rpc, scValToNative, type Transaction } from "@stellar/stellar-sdk";
import { ApiError } from "@/lib/api/response";
import { sorobanServer } from "./config";
import { toApiError } from "./contract";

export interface SubmitResult {
  hash: string;
  ledger: number | null;
  /** The contract call's decoded return value, if it returned one. */
  returnValue: unknown;
}

/**
 * How long to wait for a transaction to make it into a ledger.
 *
 * Testnet closes a ledger roughly every 5 seconds, so ~6 polls covers the
 * normal case with room to spare. The UI tells the user "this usually takes
 * 5-10 seconds" (see TransactionFlow), and this is what has to hold that
 * promise.
 */
const POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 2_000;

export async function submitSigned(tx: Transaction): Promise<SubmitResult> {
  const server = sorobanServer();

  const sent = await server.sendTransaction(tx);

  if (sent.status === "ERROR") {
    throw toApiError(
      // errorResult is XDR; its string form carries the contract error code.
      sent.errorResult ? sent.errorResult.toXDR("base64") : "unknown",
      "sendTransaction",
    );
  }

  if (sent.status === "DUPLICATE") {
    // Already in flight from an earlier attempt — fall through to polling
    // rather than treating a double-submit as a failure.
    return pollForResult(server, sent.hash);
  }

  return pollForResult(server, sent.hash);
}

async function pollForResult(server: rpc.Server, hash: string): Promise<SubmitResult> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const result = await server.getTransaction(hash);

    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        hash,
        ledger: result.ledger ?? null,
        returnValue: result.returnValue ? scValToNative(result.returnValue) : null,
      };
    }

    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw toApiError(
        result.resultXdr ? result.resultXdr.toXDR("base64") : "transaction failed",
        "getTransaction",
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // Not necessarily a failure — it may still land. Say so accurately rather
  // than reporting it as rejected, because the money may well have moved.
  throw new ApiError(
    504,
    "That transaction is taking longer than usual to confirm. Check your activity feed in a moment.",
    `PendingTransaction:${hash}`,
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
