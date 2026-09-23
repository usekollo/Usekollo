// The two transactional emails this app sends.
//
// Plain template literals rather than React Email: these are the only two
// messages we send, they are mostly one big number, and a render dependency
// would cost more than it saves. Both return an HTML and a text part — some
// clients prefer text, and a message with no text part scores worse with spam
// filters.
//
// Inline styles only. Gmail and Outlook strip <style> blocks.

import { OTP_TTL_MINUTES } from "@/lib/auth/otp-store";

const BRAND = "UseKollo";

// Read from the TTL itself so the copy cannot drift from what the code does.
const EXPIRY = `${OTP_TTL_MINUTES} minutes`;
const WRAP =
  "margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const CARD =
  "max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;";
const CODE =
  "display:inline-block;font-size:34px;letter-spacing:10px;font-weight:700;color:#111827;" +
  "background:#f4f5f7;border-radius:12px;padding:16px 24px;margin:8px 0 4px;";
const MUTED = "color:#6b7280;font-size:13px;line-height:1.6;margin:16px 0 0;";

function shell(heading: string, intro: string, code: string, footer: string) {
  return `<!doctype html><html><body style="${WRAP}">
  <div style="${CARD}">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:1px;color:#6b7280;text-transform:uppercase;">${BRAND}</p>
    <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">${heading}</h1>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">${intro}</p>
    <div style="text-align:center;margin:24px 0;"><span style="${CODE}">${code}</span></div>
    <p style="${MUTED}">${footer}</p>
  </div>
</body></html>`;
}

export function verificationEmail(code: string, name?: string) {
  const greeting = name ? `Hi ${name}, welcome to ${BRAND}.` : `Welcome to ${BRAND}.`;
  return {
    subject: `${code} is your ${BRAND} verification code`,
    html: shell(
      "Confirm your email",
      `${greeting} Enter this code to finish setting up your account.`,
      code,
      `This code expires in ${EXPIRY}. If you did not sign up, you can ignore this email — no account will be created without it.`,
    ),
    text: `${greeting}\n\nYour ${BRAND} verification code is ${code}\n\nIt expires in ${EXPIRY}. If you did not sign up, ignore this email.`,
  };
}

export function passwordResetEmail(code: string) {
  return {
    subject: `${code} is your ${BRAND} password reset code`,
    html: shell(
      "Reset your password",
      "Enter this code to choose a new password.",
      code,
      `This code expires in ${EXPIRY}. If you did not ask to reset your password, ignore this email — your current password still works.`,
    ),
    text: `Your ${BRAND} password reset code is ${code}\n\nIt expires in ${EXPIRY}. If you did not request this, ignore this email — your current password still works.`,
  };
}
