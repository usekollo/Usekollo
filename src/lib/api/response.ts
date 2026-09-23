// The one place an API response is shaped.
//
// Every frontend hook reads `{ statusCode, message, timestamp, data }` on
// success and `getApiErrorMessage` (lib/utils) reads `.message` — a string, or
// an array of per-field strings — on failure. See types/api.ts, which the
// client and these helpers both describe. The previous /api/health route
// returned a bare `{ data }` / `{ error }` shape that no hook could read;
// route handlers should return through `ok`/`fail`/`handle` only.

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

export function ok<T>(data: T, message = "OK", statusCode = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    { statusCode, message, timestamp: new Date().toISOString(), data },
    { status: statusCode },
  );
}

export function fail(statusCode: number, message: string | string[], error?: string) {
  return NextResponse.json<ApiErrorResponse>(
    { statusCode, message, timestamp: new Date().toISOString(), error },
    { status: statusCode },
  );
}

/**
 * An error a route raises on purpose, carrying the status and the message the
 * user should actually see. Anything else that escapes a handler is a bug and
 * is reported as a generic 500 without leaking internals.
 */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string | string[],
    readonly detail?: string,
  ) {
    super(Array.isArray(message) ? message.join(" ") : message);
    this.name = "ApiError";
    this.messages = message;
  }

  readonly messages: string | string[];
}

export const badRequest = (message: string | string[]) => new ApiError(400, message);
export const unauthorized = (message = "Your session has expired — sign in again.") =>
  new ApiError(401, message);
export const forbidden = (message = "You do not have access to that.") => new ApiError(403, message);
export const notFound = (message = "Not found.") => new ApiError(404, message);
export const conflict = (message: string) => new ApiError(409, message);

/**
 * Wraps a route handler so every failure path produces the same envelope.
 *
 * Zod errors are flattened to the array-of-strings form the client already
 * knows how to render, so a validation failure shows the user which field is
 * wrong rather than "Something went wrong".
 */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(
        400,
        error.issues.map((issue) => {
          const field = issue.path.join(".");
          return field ? `${field}: ${issue.message}` : issue.message;
        }),
        "ValidationError",
      );
    }

    if (error instanceof ApiError) {
      return fail(error.statusCode, error.messages, error.detail);
    }

    // Genuinely unexpected. Log the real thing server-side; tell the client
    // nothing that could help an attacker.
    console.error("[api] unhandled error:", error);
    return fail(500, "Something went wrong. Please try again.", "InternalServerError");
  }
}

/** Parses a JSON body, turning a malformed one into a 400 rather than a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}
