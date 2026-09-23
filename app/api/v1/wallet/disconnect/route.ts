import { requireUser } from "@/lib/api/auth";
import { handle, ok } from "@/lib/api/response";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Unlinks the wallet from the account.
 *
 * Purely an app-side association: nothing on-chain changes, the goals stay
 * exactly where they are, and reconnecting the same address brings them all
 * straight back. Activity rows are left alone so the history survives a
 * disconnect/reconnect cycle.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);

    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from("users")
      .update({
        stellar_public_key: null,
        wallet_connected_at: null,
        wallet_last_synced_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    return ok(
      { connected: false, address: "", lastSyncedAt: new Date().toISOString() },
      "Wallet disconnected.",
    );
  });
}
