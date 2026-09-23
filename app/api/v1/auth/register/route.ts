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

    // Null means the address is already taken. The wording must not reveal
    // that — an attacker could otherwise test addresses one by one to learn
    // who has an account here — so it stays identical to the success case.
    //
    // It does mention the two other ways in, because the previous copy
    // promised a code that this branch never sends: someone who signed up with
    // Google and came here to add a password waited on an email forever. Both
    // sentences are true whether or not the address is taken, so nothing
    // leaks.
    if (userId === null) {
      return ok(null, signUpMessage(email), 201);
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

    return ok(null, signUpMessage(email), 201);
  });
}

/**
 * The one reply this route ever gives.
 *
 * Both branches must return the *same bytes*. They did not previously — a
 * taken address answered "If that email is available…" while a fresh one
 * answered "Account created — …", which is exactly the difference the
 * indistinguishable-response rule exists to remove: anyone could tell which
 * addresses have accounts here by reading the message.
 *
 * The second sentence is here because the taken-address branch sends no email
 * at all. Someone who signed up with Google and came here to add a password
 * would otherwise wait forever on a code that was never issued. It is equally
 * true either way, so it leaks nothing.
 */
function signUpMessage(email: string): string {
  return (
    `If that email is available, we've sent a verification code to ${email}. ` +
    `Already have an account — including one created with Google? Sign in, or ` +
    `use "Forgot password" to set a password.`
  );
}
