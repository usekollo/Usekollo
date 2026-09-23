import { cookies } from "next/headers";
import { handle, ok, readJson } from "@/lib/api/response";
import { resetPasswordSchema } from "@/lib/api/schemas";
import { RESET_TICKET_COOKIE, mapAuthError, verifyResetTicket } from "@/lib/api/supabase-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Sets the new password, gated on the ticket issued by /verify-reset-otp.
 *
 * The user id comes from the signed ticket, never from the request body — so
 * the email in the payload can only confirm which account is being reset, not
 * choose one.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { email, password } = resetPasswordSchema.parse(await readJson(request));

    const jar = await cookies();
    const userId = await verifyResetTicket(jar.get(RESET_TICKET_COOKIE)?.value, email);

    const admin = createSupabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });

    if (error) throw mapAuthError(error);

    const response = ok(null, "Password updated — you can sign in with it now.");

    // Single use: burn the ticket so a replayed request cannot set the
    // password a second time.
    response.cookies.set(RESET_TICKET_COOKIE, "", { path: "/", maxAge: 0 });

    return response;
  });
}
