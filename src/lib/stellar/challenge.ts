// Proving someone holds the key for a Stellar address.
//
// The proof is a transaction the user signs but which can never be submitted:
// it is built with sequence number 0, and the network only ever accepts
// `current + 1`. So signing it authorises nothing, moves nothing and costs
// nothing — it only demonstrates control of the key.
//
// Why a transaction rather than a signed message: message signing is not
// universal. Of the wallets the kit supports, Ledger, Trezor, Albedo, OneKey,
// Klever and Scopuly all reject `signMessage` outright, and over WalletConnect
// `stellar_signMessage` is an extension beyond the documented Stellar
// namespace rather than something every wallet implements. `signTransaction`
// is supported by all of them. This is the same shape as SEP-10's challenge
// transaction, minus the server account, which this app does not have and
// does not want — it holds no keys.
import { Account, BASE_FEE, Keypair, Operation, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

/** A single-use value binding one challenge to one connection attempt. */
export function createNonce(): string {
  return randomBytes(24).toString("hex");
}

/** Shown by the wallet as the operation's data-entry name. */
const ENTRY_NAME = "UseKollo wallet verification";

/**
 * Builds the unsigned challenge for an address.
 *
 * Deterministic on purpose: no timebounds, and a fixed sequence number, so
 * nothing about it depends on the clock. The previous message-based challenge
 * embedded a timestamp and had to have that exact instant stored to be
 * rebuildable — a Postgres-generated `now()` was a different clock and every
 * verification failed. There is nothing here to drift.
 */
export function buildChallengeTransaction(publicKey: string, nonce: string): string {
  // "-1" so the built transaction lands on sequence 0.
  const account = new Account(publicKey, "-1");

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getEnv().STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: ENTRY_NAME,
        // 64 bytes is the ceiling for a data entry value; the nonce is 48.
        value: nonce,
        source: publicKey,
      }),
    )
    // 0 means "no timebounds" — see the determinism note above.
    .setTimeout(0)
    .build()
    .toXDR();
}

/**
 * Checks that `signedXdr` is the challenge we issued, signed by the claimed
 * address.
 *
 * Comparing transaction hashes is what makes this tamper-proof: the hash
 * covers every field and the network passphrase, so a signature that verifies
 * against it cannot have been produced for a different transaction, a
 * different nonce or a different network.
 */
export function verifyChallengeTransaction(
  publicKey: string,
  issuedXdr: string,
  signedXdr: string,
): boolean {
  const networkPassphrase = getEnv().STELLAR_NETWORK_PASSPHRASE;

  let issued: Transaction;
  let signed: Transaction;
  let keypair: Keypair;

  try {
    issued = new Transaction(issuedXdr, networkPassphrase);
    signed = new Transaction(signedXdr, networkPassphrase);
    keypair = Keypair.fromPublicKey(publicKey);
  } catch {
    return false;
  }

  // Same transaction, not merely a similar-looking one.
  //
  // Wrapped in Buffer.from: stellar-sdk v17 returns a Uint8Array here, which
  // has no `.equals`, and `timingSafeEqual` needs Buffers on both sides.
  const signedHash = Buffer.from(signed.hash());
  const issuedHash = Buffer.from(issued.hash());
  if (signedHash.length !== issuedHash.length) return false;
  if (!timingSafeEqual(signedHash, issuedHash)) return false;

  // Belt and braces: this is what makes the challenge unsubmittable, so it is
  // worth asserting rather than assuming the builder did it.
  if (signed.sequence !== "0") return false;
  if (signed.source !== publicKey) return false;

  return signed.signatures.some((decorated) => {
    const bytes = signatureBytes(decorated);
    if (!bytes) return false;
    try {
      return keypair.verify(signedHash, Buffer.from(bytes));
    } catch {
      return false;
    }
  });
}

/**
 * The raw 64 ed25519 bytes out of a decorated signature.
 *
 * Its shape has moved around: a method on older stellar-sdk releases, a plain
 * Uint8Array on some, and on v17 a `Signature` XDR wrapper whose bytes live
 * on `.value`. All three are accepted rather than pinning one, because every
 * way of getting this wrong presents identically — as a signature that simply
 * does not verify.
 *
 * Note `.toXDR()` is deliberately not used: it returns 68 bytes, the 64 real
 * ones behind a 4-byte length prefix, which verifies against nothing.
 */
function signatureBytes(decorated: unknown): Uint8Array | null {
  const field = (decorated as { signature?: unknown }).signature;
  const raw = typeof field === "function" ? (field as () => unknown).call(decorated) : field;

  const bytes =
    raw instanceof Uint8Array
      ? raw
      : (raw as { value?: unknown } | undefined)?.value instanceof Uint8Array
        ? ((raw as { value: Uint8Array }).value)
        : null;

  // ed25519 signatures are exactly 64 bytes; anything else is the wrong field.
  return bytes && bytes.length === 64 ? bytes : null;
}
