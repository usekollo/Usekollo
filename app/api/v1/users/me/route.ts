import { requireUser } from "@/lib/api/auth";
import { handle, ok, readJson } from "@/lib/api/response";
import { updateProfileSchema } from "@/lib/api/schemas";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * The signed-in user's profile, in the shape ProfileView renders
 * (features/profile/types.ts ProfileDetails).
 */
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);

    return ok({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      hasPassword: user.hasPassword,
    });
  });
}

/**
 * Updates the editable parts of the profile.
 *
 * Email is deliberately not updatable: it is the account identifier set at
 * sign-up, and PersonalDetailsTab already renders it read-only. Accepting it
 * here would mean an email change that never took effect.
 */
export async function PATCH(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    const { fullName, avatarUrl } = updateProfileSchema.parse(await readJson(request));

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("users")
      .update({
        full_name: fullName,
        avatar_url: avatarUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id, full_name, email, avatar_url")
      .single();

    if (error) throw new Error(error.message);

    // Mirror onto the auth user too, so the name survives a profile row
    // rebuild from user_metadata (see requireUser's fallback).
    await admin.auth.admin.updateUserById(user.id, { user_metadata: { full_name: fullName } });

    return ok(
      {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        avatarUrl: data.avatar_url,
        // Unchanged by this route, but the client writes the response straight
        // into the ["profile"] cache — omitting it would blank the flag and
        // flip the security tab to the wrong panel after a name change.
        hasPassword: user.hasPassword,
      },
      "Profile updated.",
    );
  });
}
