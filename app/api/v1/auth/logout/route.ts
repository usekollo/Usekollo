import { handle, ok } from "@/lib/api/response";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Best-effort server-side revocation.
 *
 * The client clears its cookies and query cache regardless of what happens
 * here (see useLogoutMutation's onError), so a failure must not leave the user
 * stuck signed in. Hence: never throw.
 *
 * Note this needs the service_role client — `auth.admin.*` is rejected under
 * the anon key, so revocation done there would fail silently and leave the
 * refresh token live after sign-out.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const header = request.headers.get("authorization") ?? "";
    const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7) : null;

    if (token) {
      try {
        const admin = createSupabaseAdmin();
        // Revokes the refresh token issued with this session, so a stolen copy
        // cannot be exchanged for a fresh access token afterwards.
        const { error } = await admin.auth.admin.signOut(token);
        if (error) throw new Error(error.message);
      } catch (error) {
        console.warn("[auth] sign-out revocation failed, clearing client anyway:", error);
      }
    }

    return ok(null, "Signed out.");
  });
}
