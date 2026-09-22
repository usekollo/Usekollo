import { requireUser } from "@/lib/api/auth";
import { handle, ok } from "@/lib/api/response";
import { buildDashboardSummary } from "@/lib/domain/dashboard";

/**
 * Balance, goals and activity in one payload — the shape `useDashboardSummary`
 * already consumes, and the only query behind /dashboard, /dashboard/goals and
 * /dashboard/activity.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    return ok(await buildDashboardSummary(user));
  });
}
