import { ApiError, handle, ok, readJson } from "@/lib/api/response";
import { findUserIdByEmail } from "@/lib/api/otp";
import { emailOnlySchema } from "@/lib/api/schemas";
import { issueCode, OtpCooldownError } from "@/lib/auth/otp-store";
import { sendVerificationCode } from "@/lib/email";

/** Sends a fresh sign-up confirmation code. */
export async function POST(request: Request) {
  return handle(async () => {
    const { email } = emailOnlySchema.parse(await readJson(request));

    try {
      const userId = await findUserIdByEmail(email);
      // No account: fall through to the same answer. Whether an address has
      // one is not something this endpoint reveals.
      if (userId) {
        const code = await issueCode(userId, email, "signup");
        await sendVerificationCode(email, code);
      }
    } catch (error) {
      // A cooldown is worth surfacing — the user is looking at a button that
      // would otherwise appear to do nothing — as is a failed send.
      if (error instanceof OtpCooldownError) {
        throw new ApiError(429, `Wait ${error.retryAfterSeconds}s before requesting another code.`);
      }
      if (error instanceof ApiError) throw error;
      console.error("[auth] resend-otp:", error);
    }

    return ok(null, "We've sent a new code to your email.");
  });
}
