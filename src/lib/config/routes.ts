// Central place for every in-app page path — reference `pageRoutes.x` from
// components/hooks instead of hardcoding strings, so a path only ever
// changes in one place.
export const pageRoutes = {
	HOME: "/",
	authRoutes: {
		SIGN_IN: "/auth/sign-in",
		SIGN_UP: "/auth/sign-up",
		FORGOT_PASSWORD: "/auth/forgot-password",
		RESET_PASSWORD_OTP: "/auth/reset-password/verify",
		RESET_PASSWORD: "/auth/reset-password",
		ACCOUNT_CREATED: "/auth/account-created",
		VERIFY_EMAIL: "/auth/verify-email",
		// Where Supabase sends the browser back after a Google sign-in.
		// Must also be allowlisted in Supabase -> Authentication -> URL Configuration.
		OAUTH_CALLBACK: "/auth/callback",
	},
	dashboardRoutes: {
		DASHBOARD: "/dashboard",
		SAVINGS_GOALS: "/dashboard/goals",
		CREATE_GOAL: "/dashboard/goals/new",
		GOAL_DETAIL: (id: string) => `/dashboard/goals/${id}`,
		ADD_SAVINGS: (id: string) => `/dashboard/goals/${id}/add`,
		WITHDRAW: (id: string) => `/dashboard/goals/${id}/withdraw`,
		ACTIVITY: "/dashboard/activity",
		PROFILE: "/dashboard/profile",
	},
};
