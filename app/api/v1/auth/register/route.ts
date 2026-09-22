import { ApiError, handle, ok, readJson } from "@/lib/api/response";
import { createPendingUser } from "@/lib/api/otp";
import { registerSchema } from "@/lib/api/schemas";
import { issueCode, OtpCooldownError } from "@/lib/auth/otp-store";
import { sendVerificationCode } from "@/lib/email";

/**
 * Creates the account and emails the verification code.
 *
 * No session is returned even when one could be issued: the UI's flow is
 * Sign Up -> Verify Email -> Account Created -> Dashboard, so the user is not
 * signed in until the code is confirmed. Supabase enforces that too — it
 * refuses a password sign-in on an unconfirmed address.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { fullName, email, password } = registerSchema.parse(await readJson(request));

    const userId = await createPendingUser(email, password, fullName);

    // Null means the address is already taken. Say exactly what we would for a
    // fresh one: the response must not reveal which emails have accounts.
    if (userId === null) {
      return ok(
        null,
        `If that email is available, we've sent a verification code to ${email}.`,
        201,
      );
    }

    try {
      const code = await issueCode(userId, email, "signup");
      await sendVerificationCode(email, code, fullName);
    } catch (error) {
      if (error instanceof OtpCooldownError) {
        throw new ApiError(429, "We just sent a code — check your inbox before asking again.");
      }
      throw error;
    }

    return ok(null, `Account created — we've sent a verification code to ${email}.`, 201);
  });
}
