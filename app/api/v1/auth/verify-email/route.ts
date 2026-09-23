import { badRequest, handle, ok, readJson } from "@/lib/api/response";
import { confirmUserEmail } from "@/lib/api/otp";
import { verifyOtpSchema } from "@/lib/api/schemas";
import { consumeCode } from "@/lib/auth/otp-store";

/**
 * Confirms the code from the sign-up email.
 *
 * The code is this app's, not Supabase's (see lib/auth/otp-store). All
 * Supabase is told is that the address checked out, which is what lifts its
 * block on signing in.
 *
 * The UI routes to Account Created -> Sign In rather than straight into the
 * dashboard, so no session is issued here.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { email, otp } = verifyOtpSchema.parse(await readJson(request));

    const userId = await consumeCode(email, "signup", otp);

    // One message for every failure — wrong code, expired, already used, no
    // such account. Distinguishing them would leak whether an address has an
    // account and whether a code is still live.
    if (!userId) {
      throw badRequest("That code has expired or is not valid — request a new one.");
    }

    await confirmUserEmail(userId);

    return ok(null, "Email verified — you can sign in now.");
  });
}
