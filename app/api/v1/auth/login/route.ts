import { handle, ok, readJson } from "@/lib/api/response";
import { loginSchema } from "@/lib/api/schemas";
import { mapAuthError, toTokens } from "@/lib/api/supabase-auth";
import { createSupabaseAuthClient } from "@/lib/supabase/server";

/**
 * Exchanges email + password for the token pair the axios interceptor stores.
 *
 * The user profile rides along in the same response so the client can populate
 * the auth store without a second round trip to /users/me on every sign-in.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { email, password } = loginSchema.parse(await readJson(request));

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw mapAuthError(error);
    if (!data.session) throw mapAuthError({ message: "Invalid login credentials" } as never);

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
