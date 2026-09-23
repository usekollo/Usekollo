import { requireUser } from "@/lib/api/auth";
import { handle, ok } from "@/lib/api/response";

/**
 * The wallet link, in the shape ProfileView's wallet tab renders
 * (features/profile/types.ts WalletConnection).
 */
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);

    return ok({
      connected: Boolean(user.stellarPublicKey),
      address: user.stellarPublicKey ?? "",
      lastSyncedAt: user.walletLastSyncedAt ?? user.walletConnectedAt ?? new Date().toISOString(),
    });
  });
}
