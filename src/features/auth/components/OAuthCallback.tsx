"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { pageRoutes } from "@/lib/config/routes";
import { useAuthStore } from "@/lib/stores/userAuthStore";
import { OAUTH_STORAGE_KEY, supabase } from "@/lib/supabase/client";

/**
 * Where Google sends the browser back to.
 *
 * Supabase returns a one-time `code`, which is exchanged here — in the browser,
 * because PKCE keeps the matching verifier in this browser's storage and no
 * server route can reach it. The resulting tokens then go into the same
 * zustand store a password sign-in fills, so everything downstream (the axios
 * bearer header, the refresh interceptor, requireUser on the server) is
 * identical whichever way the user signed in.
 */
export default function OAuthCallback() {
	const router = useRouter();
	const params = useSearchParams();
	const login = useAuthStore((state) => state.login);
	const [message, setMessage] = useState("Signing you in…");

	// React runs effects twice in development's strict mode, and the code is
	// single-use — the second exchange would always fail and show the user an
	// error on a sign-in that actually worked.
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;

		const fail = (reason: string) => {
			setMessage(reason);
			toast.error(reason);
			router.replace(pageRoutes.authRoutes.SIGN_IN);
		};

		// Google reports a declined consent screen as an error on the redirect
		// rather than by not returning at all.
		const oauthError = params.get("error_description") ?? params.get("error");
		if (oauthError) {
			fail(/access_denied/i.test(oauthError) ? "Sign-in cancelled." : oauthError);
			return;
		}

		const code = params.get("code");
		if (!code) {
			fail("That sign-in link is incomplete — try again.");
			return;
		}

		void (async () => {
			const { data, error } = await supabase.auth.exchangeCodeForSession(code);

			if (error || !data.session) {
				console.error("[auth] oauth exchange:", error);
				fail("We could not complete that sign-in. Try again.");
				return;
			}

			const { session, user } = data;

			login(
				{
					accessToken: session.access_token,
					refreshToken: session.refresh_token,
					expiresIn: session.expires_in ?? 3600,
				},
				{
					id: user.id,
					email: user.email ?? "",
					// Google supplies `full_name`; `name` is the fallback for
					// providers that spell it differently.
					fullName:
						(user.user_metadata?.full_name as string | undefined) ??
						(user.user_metadata?.name as string | undefined) ??
						"",
				},
			);

			// supabase-js persisted its own copy of the session so the PKCE
			// verifier could survive the redirect. Drop it now the tokens are in
			// the store, so there is exactly one place that says who is signed in.
			//
			// Deleted straight out of storage rather than via `signOut()`. Even
			// `scope: "local"` posts to /logout, which revokes this session at
			// Supabase — so the tokens taken two lines above would be dead on
			// their first use and the interceptor would bounce the user to
			// sign-in from the dashboard.
			try {
				window.localStorage.removeItem(OAUTH_STORAGE_KEY);
			} catch {
				// Storage can be unavailable (private mode, blocked cookies). The
				// stale entry is harmless — nothing reads it after this point.
			}

			toast.success("Welcome back!");
			router.replace(pageRoutes.dashboardRoutes.DASHBOARD);
		})();
	}, [params, router, login]);

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
			<span
				className="size-8 animate-spin rounded-full border-2 border-grey-light border-t-primary"
				aria-hidden
			/>
			<p className="text-sm text-grey-normal">{message}</p>
		</div>
	);
}
