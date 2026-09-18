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

const cookieOptions = { secure: true, sameSite: "strict" as const };

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

// Every trace of the signed-out user — cookies, in-memory auth state, and
// the React Query cache — so nothing from one account lingers after they
// sign out (e.g. a second person using the same device+browser next).
const clearSession = () => {
	Cookies.remove(ACCESS_TOKEN_COOKIE);
	Cookies.remove(REFRESH_TOKEN_COOKIE);
	Cookies.remove(SESSION_EXPIRES_AT_COOKIE);

	getQueryClient().clear();
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	accessToken: null,
	refreshToken: null,
	sessionExpiresAt: null,
	isAuthenticated: false,
	isInitialized: false,

	login: (tokens, user) => {
		const sessionExpiresAt = persistTokens(tokens, true);
		set({
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			sessionExpiresAt,
			user: user ?? null,
			isAuthenticated: true,
		});
	},

	setTokens: (tokens) => {
		const sessionExpiresAt = persistTokens(tokens, false);
		set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, sessionExpiresAt });
	},

	setUser: (user) => set({ user }),

	logout: () => {
		clearSession();
		set({
			user: null,
			accessToken: null,
			refreshToken: null,
			sessionExpiresAt: null,
			isAuthenticated: false,
		});
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
			set({
				user: null,
				accessToken: null,
				refreshToken: null,
				sessionExpiresAt: null,
				isAuthenticated: false,
				isInitialized: true,
			});
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
