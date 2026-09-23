import { badRequest, handle, ok, readJson } from "@/lib/api/response";
import { verifyOtpSchema } from "@/lib/api/schemas";
import { RESET_TICKET_COOKIE, issueResetTicket } from "@/lib/api/supabase-auth";
import { consumeCode } from "@/lib/auth/otp-store";

/**
 * Confirms the reset code and issues the ticket the next step requires.
 *
 * The form that follows this one submits only an email address and a new
 * password (see useResetPassword), which on its own would let anyone reset any
 * account. The ticket closes that hole without touching the form: it goes out
 * as an httpOnly cookie, which the browser attaches to the same-origin reset
 * request automatically.
 *
 * Note the code is consumed under the "recovery" purpose. A code minted to
 * confirm a new address cannot be replayed here to authorise a password
 * change, because the purpose is part of what is hashed and looked up.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { email, otp } = verifyOtpSchema.parse(await readJson(request));

    const userId = await consumeCode(email, "recovery", otp);

    if (!userId) {
      throw badRequest("That code has expired or is not valid — request a new one.");
    }

    const ticket = await issueResetTicket(userId, email);
    const response = ok(null, "Code confirmed — choose your new password.");

    response.cookies.set(RESET_TICKET_COOKIE, ticket, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Matches the ticket's own 15-minute expiry, so a stale cookie cannot
      // outlive the credential it carries.
      maxAge: 15 * 60,
    });

    return response;
  });
}
