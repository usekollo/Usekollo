"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/userAuthStore";

// Cookie expiry alone only clears a session between page loads — a tab left
// open continuously past the cap wouldn't notice on its own, since nothing
// re-reads the cookies mid-session otherwise. Poll for it instead of
// relying purely on the next reload/request to discover it.
const SESSION_CHECK_INTERVAL_MS = 60 * 1000;

// Hydrates the auth store from the token cookies on first client render,
// and enforces the session cap for as long as the tab stays open.
export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const initializeAuth = useAuthStore((state) => state.initializeAuth);

	useEffect(() => {
		initializeAuth();

		const interval = setInterval(() => {
			const { sessionExpiresAt, isAuthenticated, logout } = useAuthStore.getState();

			if (isAuthenticated && sessionExpiresAt && sessionExpiresAt <= Date.now()) {
				logout();
			}
		}, SESSION_CHECK_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [initializeAuth]);

	return <>{children}</>;
}
