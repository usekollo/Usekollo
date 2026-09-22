import { requireUser } from "@/lib/api/auth";
import { badRequest, handle, ok, readJson } from "@/lib/api/response";
import { changePasswordSchema } from "@/lib/api/schemas";
import { mapAuthError } from "@/lib/api/supabase-auth";
import { createSupabaseAdmin, createSupabaseAuthClient } from "@/lib/supabase/server";

/**
 * Changes the password for a signed-in user.
 *
 * The current password is genuinely checked, by attempting a sign-in with it,
 * rather than taken on trust. Without that, anyone with a borrowed access
 * token could lock the real owner out of their account.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    const { currentPassword, newPassword } = changePasswordSchema.parse(await readJson(request));

    const auth = createSupabaseAuthClient();
    const { error: signInError } = await auth.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) throw badRequest("That is not your current password.");

    const admin = createSupabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });

    if (error) throw mapAuthError(error);

    return ok(null, "Password updated.");
  });
}
