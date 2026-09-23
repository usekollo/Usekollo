import { handle, ok } from "@/lib/api/response";
import { getEnv } from "@/lib/env";
import { sorobanServer } from "@/lib/stellar/config";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Liveness check for the two things this app cannot work without: the database
 * and Soroban RPC.
 *
 * Reports per-dependency status rather than a bare ok/fail, and still answers
 * 200 when one is down — the point of a health check is to say *what* is
 * broken, and a non-200 tells a load balancer to pull the instance when the
 * problem may be entirely external.
 *
 * Configuration is checked first and reported separately. `getEnv` validates
 * every variable at once, so probing dependencies with it broken would report
 * *both* as down over what is really one missing key — which is precisely the
 * misdiagnosis this endpoint exists to prevent.
 */
export async function GET() {
  return handle(async () => {
    const configuration = checkConfiguration();

    if (!configuration.ok) {
      return ok({
        status: "misconfigured",
        contractId: null,
        dependencies: { configuration },
      });
    }

    const [database, soroban] = await Promise.all([checkDatabase(), checkSoroban()]);
    const status = database.ok && soroban.ok ? "ok" : "degraded";

    return ok({
      status,
      contractId: getEnv().CONTRACT_ID,
      dependencies: { configuration, database, soroban },
    });
  });
}

function checkConfiguration() {
  try {
    getEnv();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

async function checkDatabase() {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from("users").select("id", { head: true, count: "exact" });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

async function checkSoroban() {
  try {
    const health = await sorobanServer().getHealth();
    return { ok: health.status === "healthy", latestLedger: health.latestLedger };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

const message = (error: unknown) => (error instanceof Error ? error.message : "unknown error");
