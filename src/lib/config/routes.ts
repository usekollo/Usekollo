// Central place for every in-app page path — reference `pageRoutes.x` from
// components/hooks instead of hardcoding strings, so a path only ever
// changes in one place.
export const pageRoutes = {
	HOME: "/",
	authRoutes: {
		SIGN_IN: "/auth/sign-in",
		SIGN_UP: "/auth/sign-up",
		FORGOT_PASSWORD: "/auth/forgot-password",
		RESET_PASSWORD: "/auth/reset-password",
	},
	dashboardRoutes: {
		DASHBOARD: "/dashboard",
		PROFILE: "/dashboard/profile",
	},
};
