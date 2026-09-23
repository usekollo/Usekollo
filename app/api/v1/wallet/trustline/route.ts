import { requireWallet } from "@/lib/api/auth";
import { badRequest, handle, ok, readJson } from "@/lib/api/response";
import { prepareTrustlineSchema, submitTrustlineSchema } from "@/lib/api/schemas";
import { buildDashboardSummary } from "@/lib/domain/dashboard";
import { parseTransaction } from "@/lib/stellar/contract";
import { assertSignedBySource } from "@/lib/stellar/signatures";
import { assertIsChangeTrust, buildChangeTrust, submitTrustline } from "@/lib/stellar/trustline";

/**
 * Prepares an unsigned `changeTrust`, so the wallet can hold a non-native
 * asset like USDC.
 *
 * Same non-custodial shape as /tx/prepare: the server builds it, the browser
 * signs it, and PUT below submits it. Split out from the transaction routes
 * because this is a classic Stellar operation, not a Soroban contract call —
 * /tx/submit decodes an `invokeHostFunction` and would reject this outright.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireWallet(request);
    const { asset } = prepareTrustlineSchema.parse(await readJson(request));

    return ok(await buildChangeTrust({ owner: user.stellarPublicKey, assetCode: asset }));
  });
}

/**
 * Submits the signed trustline and returns a fresh summary.
 *
 * The summary matters here: `balances[asset].available` is what the deposit
 * form gates on, so returning it means the form unblocks in the same frame
 * rather than after a refetch.
 */
export async function PUT(request: Request) {
  return handle(async () => {
    const user = await requireWallet(request);
    const { asset, xdr } = submitTrustlineSchema.parse(await readJson(request));

    const tx = parseTransaction(xdr);

    // Same guard as /tx/submit: the signer must be the wallet linked to this
    // account, so this route cannot be used to relay someone else's envelope.
    if (tx.source !== user.stellarPublicKey) {
      throw badRequest("That transaction was signed by a different wallet.");
    }

    assertIsChangeTrust(tx, asset.toUpperCase());

    // Before Horizon, which would flatten every signing problem into
    // `tx_bad_auth` and charge a fee for the privilege.
    assertSignedBySource(tx);

    const { hash } = await submitTrustline(tx);

    return ok({
      success: true,
      transactionId: hash,
      assetCode: asset.toUpperCase(),
      summary: await buildDashboardSummary(user),
    });
  });
}
