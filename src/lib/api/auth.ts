// Turning an incoming request into a known user.
//
// The browser stores Supabase's access token and sends it as a bearer token
// (see lib/config/axios.ts, which attaches it and retries once through
// /auth/refresh on a 401). These helpers verify that token and load the
// matching profile row.

import { createSupabaseAdmin, createSupabaseAuthClient } from "@/lib/supabase/server";
import { forbidden, unauthorized } from "./response";

export interface AuthedUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  stellarPublicKey: string | null;
  walletConnectedAt: string | null;
  walletLastSyncedAt: string | null;
  /** The caller's own access token, for calls that must act as them. */
  accessToken: string;
  /**
   * Whether this account has an email/password identity at all.
   *
   * False for an account created purely through Google: there is no password
   * to check, so "change password" cannot work and the UI needs to offer
   * setting one instead.
   */
  hasPassword: boolean;
}

/**
 * Whether the account carries an email/password identity.
 *
 * Supabase reports the linked providers in a couple of shapes depending on
 * how the user is read, so all three are checked. When none of them answers,
 * this assumes a password exists: the cost of being wrong that way is the old
 * behaviour (a form that reports a bad current password), whereas the reverse
 * would hide the password form from people who do have one.
 */
function hasPasswordIdentity(user: {
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: { provider?: string }[] | null;
}): boolean {
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers)) return providers.includes("email");

  if (Array.isArray(user.identities)) {
    return user.identities.some((identity) => identity.provider === "email");
  }

  const provider = user.app_metadata?.provider;
  return provider ? provider === "email" : true;
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw unauthorized("Sign in to continue.");
  }

  return token;
}

/**
 * Verifies the bearer token with Supabase and returns the app profile row.
 *
 * Throws 401 rather than returning null: every caller wants the same
 * behaviour, and an accidental `if (user)` that forgets the else branch would
 * otherwise serve data to an anonymous caller.
 */
export async function requireUser(request: Request): Promise<AuthedUser> {
  const accessToken = bearerToken(request);

  // getUser(jwt) validates the signature and expiry against the project's
  // keys — it does not merely decode the token.
  const auth = createSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(accessToken);

  if (error || !data.user) {
    throw unauthorized("Your session has expired — sign in again.");
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("users")
    .select(
      "id, email, full_name, avatar_url, stellar_public_key, wallet_connected_at, wallet_last_synced_at",
    )
    .eq("id", data.user.id)
    .maybeSingle();
  // `avatar_url` is now a short R2 URL, so selecting it here is cheap. It was
  // not always: profile photos used to be stored as base64 `data:` URLs in
  // this column, which meant ~2.7MB of text per row being read on *every*
  // authenticated request. If that column ever grows again, split it out of
  // this hot-path lookup and read it only in GET /users/me.

  // The auth.users -> public.users trigger normally creates this row (see
  // supabase/setup.sql). Recreate it rather than 500 if the trigger has not
  // been installed yet, so a half-configured project still works.
  if (!profile) {
    const fallback = {
      id: data.user.id,
      email: data.user.email ?? "",
      full_name: (data.user.user_metadata?.full_name as string | undefined) ?? "",
    };
    await admin.from("users").upsert(fallback, { onConflict: "id" });

    return {
      id: fallback.id,
      email: fallback.email,
      fullName: fallback.full_name,
      avatarUrl: null,
      stellarPublicKey: null,
      walletConnectedAt: null,
      walletLastSyncedAt: null,
      accessToken,
      hasPassword: hasPasswordIdentity(data.user),
    };
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name ?? "",
    avatarUrl: profile.avatar_url ?? null,
    stellarPublicKey: profile.stellar_public_key ?? null,
    walletConnectedAt: profile.wallet_connected_at ?? null,
    walletLastSyncedAt: profile.wallet_last_synced_at ?? null,
    accessToken,
    hasPassword: hasPasswordIdentity(data.user),
  };
}

/**
 * Same as requireUser, but also insists a wallet is linked — which every
 * on-chain action needs, since the contract authorises by Stellar address.
 *
 * Deliberately 403, not 401. The axios interceptor treats 401 as "token
 * expired", burns a refresh and bounces the user to sign-in; a signed-in user
 * who simply has not connected Freighter yet should see the message instead.
 */
export async function requireWallet(
  request: Request,
): Promise<AuthedUser & { stellarPublicKey: string }> {
  const user = await requireUser(request);

  if (!user.stellarPublicKey) {
    throw forbidden("Connect your Stellar wallet to continue.");
  }

  return user as AuthedUser & { stellarPublicKey: string };
}
