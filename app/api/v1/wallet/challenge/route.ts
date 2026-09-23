import { requireUser } from "@/lib/api/auth";
import { handle, ok, readJson } from "@/lib/api/response";
import { walletChallengeSchema } from "@/lib/api/schemas";
import { buildChallengeTransaction, createNonce } from "@/lib/stellar/challenge";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/** How long the user has to approve the signature prompt in their wallet. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * Step one of connecting a wallet: hand out a single-use challenge for the
 * user to sign, so the address they claim is one they can prove they hold.
 *
 * The challenge is a transaction rather than a text message. Signing a message
 * is not something every wallet can do — Ledger, Trezor and Albedo refuse it
 * outright — whereas signing a transaction is universal. This one is built
 * with sequence number 0, which the network will never accept, so it proves
 * ownership while authorising nothing. See lib/stellar/challenge.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    const { publicKey } = walletChallengeSchema.parse(await readJson(request));

    const nonce = createNonce();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
    const challengeXdr = buildChallengeTransaction(publicKey, nonce);

    const admin = createSupabaseAdmin();
    const { error } = await admin.from("wallet_challenges").insert({
      user_id: user.id,
      public_key: publicKey,
      nonce,
      challenge_xdr: challengeXdr,
      created_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw new Error(error.message);

    return ok({
      nonce,
      // The client signs this and posts the result back to /wallet/connect.
      challengeXdr,
      expiresAt: expiresAt.toISOString(),
    });
  });
}
