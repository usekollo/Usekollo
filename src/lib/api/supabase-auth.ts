// Bridging Supabase Auth to the token shape the frontend already expects.
import type { AuthError, Session } from "@supabase/supabase-js";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import type { AuthTokensData } from "@/types/api";
import { ApiError, badRequest, unauthorized } from "./response";

/**
 * Supabase returns snake_case with an absolute expiry; the axios refresh
 * interceptor (lib/config/axios.ts) reads camelCase with a relative
 * `expiresIn`. This is the only place that translation happens.
 */
export function toTokens(session: Session): AuthTokensData {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in ?? 3600,
  };
}

/**
 * Turns a Supabase auth failure into something a user can act on.
 *
 * Supabase's own messages are generally fine but occasionally leak
 * implementation detail ("Token has expired or is invalid"), and its status
 * codes do not always match what the client should do — a wrong password
 * arrives as a 400, which the UI would otherwise show as a generic error.
 */
export function mapAuthError(error: AuthError): ApiError {
  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return new ApiError(401, "Invalid email or password.");
  }
  if (message.includes("email not confirmed")) {
    return new ApiError(403, "Verify your email address first — check your inbox for the code.");
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return new ApiError(409, "An account with that email already exists.");
  }
  if (message.includes("token has expired") || message.includes("invalid") || message.includes("expired")) {
    return new ApiError(400, "That code has expired or is not valid — request a new one.");
  }
  if (message.includes("for security purposes") || message.includes("rate limit")) {
    return new ApiError(429, "Too many attempts. Wait a moment and try again.");
  }
  if (message.includes("same password")) {
    return new ApiError(400, "That is already your current password.");
  }

  return new ApiError(error.status ?? 400, error.message);
}

// -- password reset ticket ------------------------------------------------
//
// The reset flow is: verify OTP -> choose a new password. The second request
// carries only an email address (see features/auth/hooks useResetPassword), so
// on its own it would let anyone reset any account's password just by knowing
// their email.
//
// Rather than change the form, the OTP step issues a short-lived signed ticket
// and sets it as an httpOnly cookie. The reset step requires it. The browser
// attaches it automatically on a same-origin request, so no component changes.

export const RESET_TICKET_COOKIE = "kollo_reset_ticket";
const RESET_TICKET_TTL = "15m";

function secret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function issueResetTicket(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(RESET_TICKET_TTL)
    .setAudience("password-reset")
    .sign(secret());
}

export async function verifyResetTicket(
  ticket: string | undefined,
  email: string,
): Promise<string> {
  if (!ticket) {
    throw badRequest("Verify the code we emailed you before setting a new password.");
  }

  try {
    const { payload } = await jwtVerify(ticket, secret(), { audience: "password-reset" });

    // The ticket is bound to the account it was issued for, so a valid ticket
    // for one account cannot be used to reset another.
    if (String(payload.email).toLowerCase() !== email.toLowerCase()) {
      throw unauthorized("That reset link was issued for a different account.");
    }

    return String(payload.sub);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw badRequest("That reset request has expired — start again.");
  }
}
