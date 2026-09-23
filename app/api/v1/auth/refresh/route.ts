import { handle, ok, readJson, unauthorized } from "@/lib/api/response";
import { refreshSchema } from "@/lib/api/schemas";
import { toTokens } from "@/lib/api/supabase-auth";
import { createSupabaseAuthClient } from "@/lib/supabase/server";

/**
 * Called by the axios response interceptor on a 401, with the stored refresh
 * token. Anything other than a fresh token pair here signs the user out, so
 * this must fail with 401 rather than a generic error.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { refreshToken } = refreshSchema.parse(await readJson(request));

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      throw unauthorized("Your session has expired — sign in again.");
    }

    return ok(toTokens(data.session), "Session refreshed");
  });
}
