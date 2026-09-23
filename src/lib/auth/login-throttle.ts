// Throttling password sign-in. SERVER ONLY.
//
// Supabase rate limits sign-in by caller IP. That protection does not apply
// here, because sign-in is proxied: every attempt reaches Supabase from this
// server's address, so one attacker making ten thousand guesses is
// indistinguishable to it from ordinary traffic. The limit has to be applied
// at the edge of our own API, where the real caller is still visible.
//
// Two scopes are counted separately, because they catch different attacks:
//
//   - by email, which stops a sustained run against one account, including
//     one spread across many source addresses;
//   - by IP, which stops one host spraying a common password across many
//     accounts, where no single account ever accumulates enough failures.
//
// A correct password clears that account's counter but deliberately not the
// IP's — otherwise a single known-good login would reset a spraying run.

import { prisma } from "@/lib/db/client";

/** Failures tolerated in one window before the scope is locked. */
const MAX_FAILURES = { email: 8, ip: 30 } as const;

/** How long a run of failures stays "current". */
const WINDOW_MS = 15 * 60_000;

/** How long a scope stays locked once it trips. */
const LOCKOUT_MS = 15 * 60_000;

type Scope = keyof typeof MAX_FAILURES;

const key = (scope: Scope, value: string) => `${scope}:${value.trim().toLowerCase()}`;

/**
 * The caller's address, as the proxy in front of this app reports it.
 *
 * `x-forwarded-for` is a list when there is more than one proxy, and the
 * client-controlled entries are on the left — the right-most is the one the
 * nearest trusted proxy added. Vercel puts the real client first and does not
 * pass through a client-supplied header, so the first entry is correct here;
 * behind a different proxy this is the line to revisit.
 */
export function callerAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export class LoginLockedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Too many sign-in attempts. Try again shortly.");
    this.name = "LoginLockedError";
  }
}

/**
 * Throws if either scope is currently locked.
 *
 * Called before the password is checked, so a locked scope costs nothing and
 * cannot be probed for whether the password was right.
 */
export async function assertLoginAllowed(email: string, ip: string): Promise<void> {
  const scopes = [key("email", email), key("ip", ip)];

  const rows = await prisma.loginAttempt.findMany({
    where: { scope: { in: scopes }, lockedUntil: { gt: new Date() } },
    select: { lockedUntil: true },
  });

  if (rows.length === 0) return;

  const until = rows
    .map((row) => row.lockedUntil!.getTime())
    .reduce((a, b) => Math.max(a, b), 0);

  throw new LoginLockedError(Math.max(1, Math.ceil((until - Date.now()) / 1000)));
}

/** Records a failed attempt against both scopes, locking either that trips. */
export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  await Promise.all([
    bump(key("email", email), MAX_FAILURES.email),
    bump(key("ip", ip), MAX_FAILURES.ip),
  ]);
}

/**
 * Clears the account's counter after a correct password.
 *
 * The IP counter is left alone on purpose: clearing it would let an attacker
 * spraying passwords across many accounts reset their budget by signing in to
 * one account they legitimately hold.
 */
export async function clearLoginFailures(email: string): Promise<void> {
  await prisma.loginAttempt
    .deleteMany({ where: { scope: key("email", email) } })
    .catch(() => {
      // Bookkeeping only — a failure here must not turn a correct sign-in into
      // an error. The row expires on its own window anyway.
    });
}

async function bump(scope: string, max: number): Promise<void> {
  const now = new Date();

  const existing = await prisma.loginAttempt.findUnique({ where: { scope } });

  // No row, or the previous run is older than the window: start a fresh one,
  // so occasional typos weeks apart never accumulate into a lockout.
  if (!existing || existing.firstFailureAt.getTime() + WINDOW_MS < now.getTime()) {
    await prisma.loginAttempt.upsert({
      where: { scope },
      create: { scope, failures: 1, firstFailureAt: now },
      update: { failures: 1, firstFailureAt: now, lockedUntil: null },
    });
    return;
  }

  const failures = existing.failures + 1;

  await prisma.loginAttempt.update({
    where: { scope },
    data: {
      failures,
      lockedUntil: failures >= max ? new Date(now.getTime() + LOCKOUT_MS) : existing.lockedUntil,
    },
  });
}
