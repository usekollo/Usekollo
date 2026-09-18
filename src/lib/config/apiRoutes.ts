// Central place for every backend endpoint — reference `apiRoutes.x` from
// feature hooks instead of hardcoding path strings. Fill these in to match
// your actual backend as it comes together.
export const apiRoutes = {
	health: "/health",

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
	},
};
