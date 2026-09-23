import { requireWallet } from "@/lib/api/auth";
import { badRequest, handle, notFound, ok, readJson } from "@/lib/api/response";
import { prepareSchema } from "@/lib/api/schemas";
import { fromIsoDate } from "@/lib/domain/mappers";
import { toBaseUnits } from "@/lib/stellar/amounts";
import { assetByCode, assetByContractId } from "@/lib/stellar/config";
import { buildCreateGoal, buildDeposit, buildWithdraw, getGoal } from "@/lib/stellar/contract";

/**
 * Builds and simulates the transaction, and returns it unsigned.
 *
 * This is half of the non-custodial flow: the server knows how to construct a
 * correct contract call but holds no key, so the XDR goes to the browser,
 * Freighter signs it, and it comes back to /api/v1/tx/submit. The server never
 * sees a secret key at any point.
 *
 * Simulating here rather than after signing means a doomed call — target date
 * in the past, more than the goal holds, unsupported asset — fails with a
 * readable message before the user is ever asked to approve anything.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireWallet(request);
    const body = prepareSchema.parse(await readJson(request));

    if (body.action === "create") {
      const asset = assetByCode(body.asset);
      if (!asset) throw badRequest(`${body.asset} is not a supported asset.`);

      const targetDate = fromIsoDate(body.targetDate);
      if (!Number.isFinite(targetDate)) throw badRequest("Choose a valid target date.");
      if (targetDate * 1000 <= Date.now()) throw badRequest("Choose a target date in the future.");

      const prepared = await buildCreateGoal({
        owner: user.stellarPublicKey,
        name: body.name,
        assetContractId: asset.contractId,
        targetAmount: toBaseUnits(body.targetAmount, asset.decimals),
        targetDate,
      });

      return ok(prepared);
    }

    // deposit / withdraw both act on an existing goal, so resolve and
    // ownership-check it before building anything.
    const goal = await getGoal(body.goalId);
    if (!goal) throw notFound("That goal no longer exists.");
    if (goal.owner !== user.stellarPublicKey) {
      throw notFound("That goal no longer exists.");
    }

    const asset = assetByContractId(goal.asset);
    const amount = toBaseUnits(body.amount, asset?.decimals ?? 7);

    if (body.action === "withdraw" && amount > goal.currentAmount) {
      throw badRequest("That is more than this goal is holding.");
    }

    const prepared =
      body.action === "deposit"
        ? await buildDeposit({ owner: user.stellarPublicKey, goalId: body.goalId, amount })
        : await buildWithdraw({ owner: user.stellarPublicKey, goalId: body.goalId, amount });

    return ok(prepared);
  });
}
