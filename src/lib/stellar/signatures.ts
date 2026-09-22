// Checking a signed envelope before it is submitted. SERVER ONLY.
//
// Horizon and Soroban both collapse every signing problem into one code
// (`tx_bad_auth`), which is why "that transaction was not signed correctly"
// was all we could say. The two things that actually go wrong are
// distinguishable here, before submission:
//
//   - a different wallet signed than the one the transaction is for, which
//     the signature hint reveals without any crypto;
//   - the right wallet signed against the wrong network passphrase, which
//     shows up as a hint that matches but a signature that does not verify.
//
// Catching both here also means we stop burning a fee on a doomed submission.

import { Keypair, type Transaction } from "@stellar/stellar-sdk";
import { ApiError } from "@/lib/api/response";
import { networkPassphrase } from "./config";

/**
 * Verifies that `tx` carries a good signature from its own source account.
 *
 * Throws an ApiError naming the actual problem. Does not care about extra
 * signatures from other keys — multisig setups are legitimate, and the
 * network will judge those itself.
 */
export function assertSignedBySource(tx: Transaction): void {
  if (tx.signatures.length === 0) {
    throw new ApiError(400, "That transaction came back from your wallet unsigned.");
  }

  const source = Keypair.fromPublicKey(tx.source);
  const hint = toHex(source.signatureHint());

  const fromSource = tx.signatures.find((sig) => toHex(sig.hint) === hint);

  if (!fromSource) {
    // The hint is the last 4 bytes of the signing key, so a mismatch means a
    // different key signed — the usual cause is the wallet being on another
    // account than the one linked to this session.
    throw new ApiError(
      400,
      "That was signed by a different account than the wallet linked here. Switch your wallet to the linked account, or reconnect it under Profile, then try again.",
      "SignerMismatch",
    );
  }

  if (!source.verify(tx.hash(), Buffer.from(unwrap(fromSource.signature)))) {
    // Right key, bad signature: the only realistic cause is the wallet
    // signing against a different network than the one we built for.
    throw new ApiError(
      400,
      `Your wallet signed for a different network. Set it to ${networkName()} and try again.`,
      "NetworkMismatch",
    );
  }
}

function networkName(): string {
  return networkPassphrase().startsWith("Public") ? "Public Net" : "Test Net";
}

/**
 * XDR opaque fields arrive as a wrapper carrying the bytes on `.value` rather
 * than as a Buffer, so neither `Buffer.from` nor `.equals` works on them
 * directly. Unwrapped defensively: older and newer SDKs differ on this, and
 * being wrong here fails open into a misleading "wrong network" message.
 */
function unwrap(bytes: unknown): Uint8Array {
  const inner = (bytes as { value?: unknown })?.value;
  return (inner ?? bytes) as Uint8Array;
}

function toHex(bytes: unknown): string {
  return Buffer.from(unwrap(bytes)).toString("hex");
}
