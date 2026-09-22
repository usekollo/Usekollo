// Outbound transactional email, via Resend.
//
// SERVER ONLY — reads RESEND_API_KEY.
//
// Supabase Auth is still the identity provider and still mints the codes, but
// it no longer delivers them: the routes call `admin.generateLink`, which
// generates a code *without* sending anything, and hand it to this module.
// That means the project's own SMTP settings and email templates are unused,
// and the copy lives in email/templates.ts instead.
import { Resend } from "resend";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/api/response";
import { passwordResetEmail, verificationEmail } from "./templates";

let client: Resend | null = null;

function resend(): Resend {
  if (!client) client = new Resend(getEnv().RESEND_API_KEY);
  return client;
}

type Message = { subject: string; html: string; text: string };

async function send(to: string, message: Message): Promise<void> {
  const { error } = await resend().emails.send({
    from: getEnv().EMAIL_FROM,
    to,
    ...message,
  });

  if (!error) return;

  // Resend's own message is the useful one here — "domain is not verified",
  // "sandbox mode can only send to your own address" — and it goes to the
  // server log rather than the user, who cannot act on any of it.
  console.error("[email] send failed:", error);

  // The most common misconfiguration by a distance, and completely opaque
  // from the user's side, so it gets named explicitly in the log.
  if (/domain|not verified|testing emails/i.test(error.message ?? "")) {
    console.error(
      "[email] Resend will only deliver to your own account address until a " +
        "sending domain is verified. Add the domain in Resend -> Domains and " +
        "point EMAIL_FROM at it.",
    );
  }

  throw new ApiError(502, "We could not send that email just now. Try again in a moment.");
}

export function sendVerificationCode(to: string, code: string, name?: string) {
  return send(to, verificationEmail(code, name));
}

export function sendPasswordResetCode(to: string, code: string) {
  return send(to, passwordResetEmail(code));
}
