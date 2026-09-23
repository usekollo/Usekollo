import { handle, ok, readJson } from "@/lib/api/response";
import { clientErrorSchema } from "@/lib/api/schemas";
import { callerAddress } from "@/lib/auth/login-throttle";

/**
 * Receives a client-side crash report and writes it to the server log.
 *
 * Unauthenticated on purpose: the errors most worth seeing are the ones that
 * stop someone signing in, and requiring a session would drop exactly those.
 * The trade is that anyone can post here, so the payload is strictly bounded
 * by the schema and nothing is persisted — this writes to the log stream only,
 * where volume is already monitored and a flood costs no storage.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const report = clientErrorSchema.parse(await readJson(request));

    console.error("[client-error]", {
      ...report,
      ip: callerAddress(request),
      at: new Date().toISOString(),
    });

    return ok(null, "Recorded.");
  });
}
