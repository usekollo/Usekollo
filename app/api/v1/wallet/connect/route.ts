import { requireUser } from "@/lib/api/auth";
import { badRequest, conflict, handle, ok, readJson } from "@/lib/api/response";
import { walletConnectSchema } from "@/lib/api/schemas";
import { verifyChallengeTransaction } from "@/lib/stellar/challenge";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Step two: check the signed challenge against the one we issued, then link
 * the address to the account.
 *
 * The nonce is consumed whatever the outcome, so a failed attempt cannot be
 * retried against the same challenge — that is what stops an intercepted
 * signature being replayed.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    const { publicKey, nonce, signedXdr } = walletConnectSchema.parse(await readJson(request));

    const admin = createSupabaseAdmin();

    const { data: challenge } = await admin
      .from("wallet_challenges")
      .select("id, user_id, public_key, nonce, challenge_xdr, expires_at, consumed_at")
      .eq("nonce", nonce)
      .maybeSingle();

    if (!challenge) throw badRequest("That wallet request is no longer valid — try again.");

    // Burn it first: whether we accept or reject below, this nonce is spent.
    await admin
      .from("wallet_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);

    if (challenge.consumed_at) {
      throw badRequest("That wallet request has already been used — try again.");
    }
    if (challenge.user_id !== user.id || challenge.public_key !== publicKey) {
      throw badRequest("That wallet request does not match this account.");
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      throw badRequest("That wallet request expired — try again.");
    }
    if (!challenge.challenge_xdr) {
      // Issued before challenges were stored. Nothing to compare against, so
      // the only safe answer is to make them start again.
      throw badRequest("That wallet request is no longer valid — try again.");
    }

    if (!verifyChallengeTransaction(publicKey, challenge.challenge_xdr, signedXdr)) {
      // The user can do nothing with the reason, but whoever is debugging
      // needs it. Nothing here is secret: the challenge is public by design
      // and the signature failed to verify, so it authenticates nothing.
      console.error("[wallet] challenge signature did not verify", {
        publicKey,
        nonce,
        signedXdrLength: signedXdr.length,
      });

      throw badRequest("We could not verify that signature. Try connecting again.");
    }

    // One wallet, one account. Without this a second account could claim an
    // address already linked elsewhere and see goals it does not own.
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("stellar_public_key", publicKey)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) throw conflict("That wallet is already linked to another account.");

    const now = new Date().toISOString();
    const { error } = await admin
      .from("users")
      .update({
        stellar_public_key: publicKey,
        wallet_connected_at: now,
        wallet_last_synced_at: now,
        updated_at: now,
      })
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    return ok({ connected: true, address: publicKey, lastSyncedAt: now }, "Wallet connected.");
  });
}
