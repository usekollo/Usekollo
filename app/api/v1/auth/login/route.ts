import { ApiError, handle, ok, readJson } from "@/lib/api/response";
import { loginSchema } from "@/lib/api/schemas";
import { mapAuthError, toTokens } from "@/lib/api/supabase-auth";
import {
  assertLoginAllowed,
  callerAddress,
  clearLoginFailures,
  LoginLockedError,
  recordLoginFailure,
} from "@/lib/auth/login-throttle";
import { createSupabaseAuthClient } from "@/lib/supabase/server";

/**
 * Exchanges email + password for the token pair the axios interceptor stores.
 *
 * The user profile rides along in the same response so the client can populate
 * the auth store without a second round trip to /users/me on every sign-in.
 *
 * Attempts are throttled here rather than left to Supabase: this route proxies
 * sign-in, so every attempt arrives at Supabase from this server's address and
 * its per-IP limit never fires for a single attacker. See lib/auth/login-throttle.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { email, password } = loginSchema.parse(await readJson(request));
    const ip = callerAddress(request);

    // Before the password is checked, so a locked scope costs nothing and
    // cannot be used to probe whether a password was right.
    try {
      await assertLoginAllowed(email, ip);
    } catch (error) {
      if (error instanceof LoginLockedError) {
        throw new ApiError(429, error.message, "TooManyAttempts");
      }
      throw error;
    }

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      await recordLoginFailure(email, ip);
      // Same message either way — which of the two it was must not be
      // distinguishable, or the response reveals whether the address exists.
      throw error
        ? mapAuthError(error)
        : mapAuthError({ message: "Invalid login credentials" } as never);
    }

    await clearLoginFailures(email);

    return ok(
      {
        ...toTokens(data.session),
        user: {
          id: data.user.id,
          email: data.user.email ?? email,
          fullName: (data.user.user_metadata?.full_name as string | undefined) ?? "",
        },
      },
      "Welcome back!",
    );
  });
}
