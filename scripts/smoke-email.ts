// Sends one real verification email through the app's own email module, so
// the template, the From header and delivery are all exercised end to end.
//
//   pnpm smoke:email someone@example.com [Name]
//
// Sends actual mail. Use a inbox you control.
import { sendVerificationCode } from "@/lib/email";
import { getEnv } from "@/lib/env";

async function main() {
  const to = process.argv[2];
  const name = process.argv[3];

  if (!to) {
    console.error("usage: pnpm smoke:email <recipient> [name]");
    process.exitCode = 1;
    return;
  }

  // A throwaway code — this is a delivery test, not a real verification.
  const code = String(Math.floor(100000 + Math.random() * 900000));

  console.log("from:     ", getEnv().EMAIL_FROM);
  console.log("to:       ", to);
  console.log("test code:", code);

  await sendVerificationCode(to, code, name);

  console.log("\nsent: Resend accepted the message.");
  console.log("Check the inbox, and the spam folder — first send from a new");
  console.log("domain often lands there until the domain builds reputation.");
}

main().catch((error) => {
  console.error("\nsend FAILED:");
  console.error(error);
  process.exitCode = 1;
});
