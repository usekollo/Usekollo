import { requireUser } from "@/lib/api/auth";
import { badRequest, handle, notFound, ok } from "@/lib/api/response";
import { toUiGoal } from "@/lib/domain/mappers";
import { getGoal } from "@/lib/stellar/contract";

/**
 * A single goal, read straight from the contract.
 *
 * Ownership is enforced here even though goal data is public on-chain: the
 * dashboard is a private view of *your* savings, and serving someone else's
 * goal through it would be surprising regardless of where the data lives.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser(request);
    const { id } = await ctx.params;

    const goalId = Number(id);
    if (!Number.isInteger(goalId) || goalId <= 0) throw badRequest("That is not a valid goal id.");

    const goal = await getGoal(goalId);
    if (!goal) throw notFound("That goal no longer exists.");

    if (!user.stellarPublicKey || goal.owner !== user.stellarPublicKey) {
      // Same response as a genuinely missing goal, so this cannot be used to
      // probe which ids exist.
      throw notFound("That goal no longer exists.");
    }

    return ok(toUiGoal(goal));
  });
}
