// Central place for every backend endpoint — reference `apiRoutes.x` from
// feature hooks instead of hardcoding path strings.
export const apiRoutes = {
	health: "/api/health",

	auth: {
		REGISTER: "/api/v1/auth/register",
		LOGIN: "/api/v1/auth/login",
		REFRESH: "/api/v1/auth/refresh",
		FORGOT_PASSWORD: "/api/v1/auth/forgot-password",
		RESET_PASSWORD: "/api/v1/auth/reset-password",
		LOGOUT: "/api/v1/auth/logout",
		VERIFY_EMAIL: "/api/v1/auth/verify-email",
		RESEND_OTP: "/api/v1/auth/resend-otp",
		VERIFY_RESET_OTP: "/api/v1/auth/verify-reset-otp",
	},

	users: {
		ME: "/api/v1/users/me",
		CHANGE_PASSWORD: "/api/v1/users/me/password",
		AVATAR: "/api/v1/users/me/avatar",
	},

	wallet: {
		STATUS: "/api/v1/wallet",
		CHALLENGE: "/api/v1/wallet/challenge",
		CONNECT: "/api/v1/wallet/connect",
		DISCONNECT: "/api/v1/wallet/disconnect",
		// POST prepares an unsigned changeTrust, PUT submits the signed one.
		TRUSTLINE: "/api/v1/wallet/trustline",
	},

	dashboard: {
		SUMMARY: "/api/v1/dashboard/summary",
	},

	goals: {
		DETAIL: (id: string) => `/api/v1/goals/${id}`,
	},

	// The two halves of the non-custodial write path: the server builds and
	// simulates the transaction, Freighter signs it in the browser, and the
	// server submits the signed result. See features/dashboard/hooks.
	tx: {
		PREPARE: "/api/v1/tx/prepare",
		SUBMIT: "/api/v1/tx/submit",
	},
};
