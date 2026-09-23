import { ApiError, handle, ok, readJson } from "@/lib/api/response";
import { findUserIdByEmail } from "@/lib/api/otp";
import { emailOnlySchema } from "@/lib/api/schemas";
import { issueCode, OtpCooldownError } from "@/lib/auth/otp-store";
import { sendPasswordResetCode } from "@/lib/email";

/**
 * Starts a password reset.
 *
 * Always reports success, whether or not the address has an account — the
 * message the UI shows ("If that email has an account...") is deliberately
 * non-committal for the same reason.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { email } = emailOnlySchema.parse(await readJson(request));

    try {
      const userId = await findUserIdByEmail(email);
      if (userId) {
        const code = await issueCode(userId, email, "recovery");
        await sendPasswordResetCode(email, code);
      }
    } catch (error) {
      if (error instanceof OtpCooldownError) {
        throw new ApiError(429, `Wait ${error.retryAfterSeconds}s before requesting another code.`);
      }
      if (error instanceof ApiError) throw error;
      console.error("[auth] forgot-password:", error);
    }

    return ok(null, "If that email has an account, we've sent a reset code.");
  });
}
