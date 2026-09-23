import { create } from "zustand";
import Cookies from "js-cookie";
import { getQueryClient } from "@/components/providers/ReactQueryProvider";
import { AuthTokensData } from "@/types/api";

const ACCESS_TOKEN_COOKIE = "kollo_access_token";
const REFRESH_TOKEN_COOKIE = "kollo_refresh_token";
const SESSION_EXPIRES_AT_COOKIE = "kollo_session_expires_at";

// Adjust to taste — this caps a session at 7 days *from login*, regardless
// of activity. A token refresh keeps the user signed in for the rest of
// that window but never pushes the cap further out.
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Whether to mark the auth cookies `secure`.
 *
 * Over HTTPS: always. Over plain HTTP the browser discards a `secure` cookie
 * outright, so the session silently fails to persist — the user signs in, gets
 * a session, and is bounced straight back to sign-in with nothing in the
 * console to explain it.
 *
 * This used to exempt only localhost by name, which covered a developer on
 * Safari but not a phone pointed at the dev server over the LAN
 * (http://192.168.x.x:3000) — there the hostname is an IP, the cookies were
 * marked secure over HTTP, and every mobile sign-in failed for that reason
 * alone.
 *
 * Keyed on the environment rather than the hostname so the relaxation cannot
 * follow the code into production: a deployed build over plain HTTP keeps
 * `secure` and fails closed, which is the right outcome — that configuration
 * is broken and should not quietly start sending tokens in the clear.
 */
const isSecureOrigin =
	typeof window === "undefined" ||
	window.location.protocol === "https:" ||
	process.env.NODE_ENV === "production";

const cookieOptions = { secure: isSecureOrigin, sameSite: "strict" as const };

const msToDays = (ms: number) => ms / 86_400_000;

interface UserProfile {
	id: string;
	email: string;
	fullName?: string;
}

interface AuthState {
	user: UserProfile | null;
	accessToken: string | null;
	refreshToken: string | null;
	sessionExpiresAt: number | null;
	isAuthenticated: boolean;
	isInitialized: boolean;
	login: (tokens: AuthTokensData, user?: UserProfile) => void;
	setTokens: (tokens: AuthTokensData) => void;
	setUser: (user: UserProfile) => void;
	logout: () => void;
	/** Drop any existing identity before establishing a new one. */
	resetSession: () => void;
	initializeAuth: () => void;
}

// `isNewLogin: true` starts a fresh session clock (real sign-in). `false`
// (a token refresh) reuses whatever's already on the clock — capped to
// however much of the original window is left, never extended.
const persistTokens = (tokens: AuthTokensData, isNewLogin: boolean) => {
	const existingExpiry = Number(Cookies.get(SESSION_EXPIRES_AT_COOKIE));
	const sessionExpiresAt =
		isNewLogin || !existingExpiry ? Date.now() + SESSION_MAX_AGE_MS : existingExpiry;

	const remainingMs = Math.max(sessionExpiresAt - Date.now(), 0);
	const remainingDays = msToDays(remainingMs);

	Cookies.set(SESSION_EXPIRES_AT_COOKIE, String(sessionExpiresAt), {
		...cookieOptions,
		expires: remainingDays,
	});
	Cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
		...cookieOptions,
		expires: Math.min(msToDays(tokens.expiresIn * 1000), remainingDays),
	});
	Cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
		...cookieOptions,
		expires: remainingDays,
	});

	return sessionExpiresAt;
};

// Every trace of the previous user — cookies, in-memory auth state, and the
// React Query cache — so nothing from one account lingers into the next.
//
// The cache is the part that bites. `getQueryClient()` is a per-tab
// singleton that survives client-side navigation, and queries default to a
// 60s staleTime, so a cached ["dashboard-summary"] (which holds goals AND the
// activity feed) is handed straight to whoever asks next and is not even
// refetched for a minute. Clearing it is what stops one account's
// transactions rendering in another's dashboard.
const clearSession = () => {
	Cookies.remove(ACCESS_TOKEN_COOKIE);
	Cookies.remove(REFRESH_TOKEN_COOKIE);
	Cookies.remove(SESSION_EXPIRES_AT_COOKIE);

	getQueryClient().clear();
};

/** The signed-out auth slice, so logout and identity changes agree on it. */
const SIGNED_OUT = {
	user: null,
	accessToken: null,
	refreshToken: null,
	sessionExpiresAt: null,
	isAuthenticated: false,
} as const;

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	accessToken: null,
	refreshToken: null,
	sessionExpiresAt: null,
	isAuthenticated: false,
	isInitialized: false,

	login: (tokens, user) => {
		// Unconditionally, before anything is written for the incoming user.
		// Signing in is an identity change, and the previous identity's cached
		// queries must not outlive it — without this, signing in as B on a
		// browser that was signed in as A renders A's goals and activity feed
		// to B, because the cache is keyed only by query name.
		clearSession();

		const sessionExpiresAt = persistTokens(tokens, true);
		set({
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			sessionExpiresAt,
			user: user ?? null,
			isAuthenticated: true,
		});
	},

	// Drops any signed-in identity without the caller needing to know whether
	// there was one. Used at the head of the sign-up and sign-in flows: those
	// are about to establish a *new* identity, so an existing session left
	// standing is what let a registering user land in someone else's account.
	resetSession: () => {
		clearSession();
		set({ ...SIGNED_OUT });
	},

	setTokens: (tokens) => {
		const sessionExpiresAt = persistTokens(tokens, false);
		set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, sessionExpiresAt });
	},

	setUser: (user) => set({ user }),

	logout: () => {
		clearSession();
		set({ ...SIGNED_OUT });
	},

	initializeAuth: () => {
		const accessToken = Cookies.get(ACCESS_TOKEN_COOKIE) ?? null;
		const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE) ?? null;
		const sessionExpiresAt = Number(Cookies.get(SESSION_EXPIRES_AT_COOKIE)) || null;

		// Belt-and-suspenders: the cookies carry a matching `expires` too, so
		// the browser normally clears them on its own — but a tab left open
		// continuously since before the cap won't notice that mid-session, so
		// check the timestamp directly rather than trusting mere presence.
		if (sessionExpiresAt && sessionExpiresAt <= Date.now()) {
			clearSession();
			set({ ...SIGNED_OUT, isInitialized: true });
			return;
		}

		set({
			accessToken,
			refreshToken,
			sessionExpiresAt,
			isAuthenticated: !!accessToken,
			isInitialized: true,
		});
	},
}));

export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useLogout = () => useAuthStore((state) => state.logout);
