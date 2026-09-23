"use client";

// Getting a client-side crash somewhere a developer will actually see it.
//
// A console.error in the user's browser is invisible to us: by the time
// anyone reports "it broke", the stack is gone. This posts a small, bounded
// summary to the API, which logs it server-side where the platform's log
// drain already collects everything else.
//
// Deliberately not a third-party SDK. Those need an account, a DSN in the
// client bundle and a privacy review; this needs none of that, and the
// posting side can be pointed at a real provider later without the call
// sites changing.

import { apiRoutes } from "@/lib/config/apiRoutes";

/** Hard cap, because a stack can be enormous and this is an open endpoint. */
const MAX_STACK_CHARS = 4_000;

let reportedThisPage = 0;

/** Ceiling per page load, so a render loop cannot spam the endpoint. */
const MAX_REPORTS_PER_PAGE = 5;

export function reportError(error: Error & { digest?: string }, context?: string): void {
  // Still log locally — during development the console is the fast path, and
  // this keeps behaviour unchanged for anyone debugging.
  console.error(error);

  if (typeof window === "undefined") return;
  if (reportedThisPage >= MAX_REPORTS_PER_PAGE) return;
  reportedThisPage += 1;

  const body = JSON.stringify({
    message: String(error.message ?? "").slice(0, 500),
    // Next's digest is the only handle that ties a client error to the
    // server-side stack it came from, so it matters more than the rest.
    digest: error.digest,
    stack: error.stack?.slice(0, MAX_STACK_CHARS),
    context,
    url: window.location.pathname,
    userAgent: navigator.userAgent.slice(0, 200),
  });

  // keepalive so the report still goes out when the error is immediately
  // followed by a navigation away from the broken page.
  void fetch(apiRoutes.telemetry.ERROR, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Reporting a failure to report would recurse. Nothing to do.
  });
}
