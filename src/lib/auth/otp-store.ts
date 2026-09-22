// Minting and verifying the codes this app emails.
//
// SERVER ONLY — keyed with JWT_SECRET.
//
// Supabase Auth remains the identity provider: it owns passwords, sessions and
// the `email_confirmed_at` flag. What it no longer owns is the code, because
// its length is a project-level dashboard setting the app cannot change at
// runtime. Everything that made its codes safe has to be reproduced here, and
// this module is the whole of it:
//
//   - the stored value is a keyed HMAC, not the code and not a bare digest
//   - codes expire, and expiry is checked on read rather than swept
//   - a code is single-use: verifying burns it
//   - guesses against a live code are capped
//   - minting a new code invalidates the account's older unused ones
//   - sends are rate limited per address and purpose
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { OTP_LENGTH } from "@/lib/auth-otp";
import { prisma } from "@/lib/db/client";
import { getEnv } from "@/lib/env";

export type OtpPurpose = "signup" | "recovery";

/** How long a code stays valid. Short enough to limit a stolen-inbox window,
 *  long enough to survive a slow mail hop and a distracted user. */
const TTL_MINUTES = 15;

/** Guesses allowed against one code before it is dead. Six digits is a
 *  million possibilities, so this is what keeps online guessing hopeless. */
const MAX_ATTEMPTS = 5;

/** Minimum gap between sends for the same address and purpose. Stops the
 *  "resend" button being used to flood an inbox we do not own. */
const RESEND_COOLDOWN_SECONDS = 60;

export const OTP_TTL_MINUTES = TTL_MINUTES;

const normalise = (email: string) => email.trim().toLowerCase();

/**
 * Keyed so a leaked table is not a leaked set of codes. An unkeyed SHA-256 of
 * a six-digit number is reversible by enumerating all million inputs in well
 * under a second; without JWT_SECRET this digest is not.
 */
function hash(code: string, purpose: OtpPurpose): string {
  return createHmac("sha256", getEnv().JWT_SECRET).update(`${purpose}:${code}`).digest("hex");
}

/** Constant-time compare, so verification cannot be steered by timing. */
function matches(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * A uniformly random OTP_LENGTH-digit code, leading zeros kept.
 *
 * `randomInt` rather than `Math.random`: the codes gate email confirmation and
 * password reset, so they have to be unguessable, and `Math.random` is
 * seedable and predictable from prior outputs.
 */
function generate(): string {
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

export class OtpCooldownError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`Wait ${retryAfterSeconds}s before requesting another code.`);
    this.name = "OtpCooldownError";
  }
}

/**
 * Issues a code for this user and purpose, and returns it in the clear —
 * the only moment it exists in plaintext, for the caller to email.
 *
 * Older unused codes for the same address and purpose are burned first, so a
 * resend makes the previous email useless rather than leaving two live codes.
 * That matches what Supabase did and keeps "the newest email is the right
 * one" true.
 */
export async function issueCode(
  userId: string,
  email: string,
  purpose: OtpPurpose,
): Promise<string> {
  const address = normalise(email);

  const latest = await prisma.emailOtp.findFirst({
    where: { email: address, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latest) {
    const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      throw new OtpCooldownError(Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
    }
  }

  const code = generate();

  await prisma.$transaction([
    prisma.emailOtp.updateMany({
      where: { email: address, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.emailOtp.create({
      data: {
        userId,
        email: address,
        purpose,
        codeHash: hash(code, purpose),
        expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
      },
    }),
  ]);

  return code;
}

/**
 * Checks a submitted code and burns it on success.
 *
 * Returns the user id the code was issued to, or null for anything wrong —
 * unknown address, wrong code, expired, already used, out of attempts. The
 * caller gets one undifferentiated failure on purpose: saying *which* of
 * those it was tells an attacker whether an address has an account and
 * whether a code is still live.
 */
export async function consumeCode(
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<string | null> {
  const address = normalise(email);

  const row = await prisma.emailOtp.findFirst({
    where: { email: address, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now() || row.attempts >= MAX_ATTEMPTS) {
    // Burn it rather than leaving a dead row to be retried against.
    await prisma.emailOtp.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return null;
  }

  if (!matches(row.codeHash, hash(code, purpose))) {
    await prisma.emailOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }

  await prisma.emailOtp.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });

  return row.userId;
}
