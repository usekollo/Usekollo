// The Supabase Auth side of the OTP flows.
//
// The codes themselves are this app's (lib/auth/otp-store). What still belongs
// to Supabase is the account: creating it, looking it up, and flipping
// `email_confirmed_at` once a code checks out. Those three things live here so
// the routes never touch the admin API directly.
import { createSupabaseAdmin } from "@/lib/supabase/server";

/** GoTrue stores addresses lowercased; incoming payloads are not normalised. */
const normalise = (email: string) => email.trim().toLowerCase();

/**
 * Creates the account, unconfirmed and with no email sent.
 *
 * `createUser` rather than `signUp`: signUp would have Supabase mail its own
 * code, which is the thing we are replacing. `email_confirm: false` leaves the
 * address unverified, so the account cannot sign in until a code from us is
 * confirmed — Supabase refuses `signInWithPassword` on an unconfirmed address.
 *
 * Returns null when the address is already taken, so the caller can answer
 * exactly as it would for a fresh one. Which emails have accounts is not
 * something the response may reveal.
 */
export async function createPendingUser(
  email: string,
  password: string,
  fullName: string,
): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: normalise(email),
    password,
    email_confirm: false,
    // Read by the auth.users -> public.users trigger to populate the profile
    // row, so the name survives without a second write.
    user_metadata: { full_name: fullName },
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) return null;
    throw error;
  }
  return data.user?.id ?? null;
}

/**
 * The account id for an address, or null.
 *
 * Reads the mirror table rather than paging auth.users: one indexed lookup
 * (users_email_idx), kept in step with auth.users by the trigger in the
 * migrations.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("email", normalise(email))
    .maybeSingle();

  if (error) throw new Error(`Could not look up that account: ${error.message}`);
  return (data as { id: string } | null)?.id ?? null;
}

/** Marks the address verified, which is what lets the account sign in. */
export async function confirmUserEmail(userId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) throw error;
}
