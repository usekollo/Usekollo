"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiRoutes } from "@/lib/config/apiRoutes";
import { supabase } from "@/lib/supabase/client";
import { pageRoutes } from "@/lib/config/routes";
import { axiosAuth, axiosPublic } from "@/lib/config/axios";
import { useAuthStore } from "@/lib/stores/userAuthStore";
import { getApiErrorMessage } from "@/lib/utils";
import type { ApiSuccessResponse, AuthTokensData } from "@/types/api";
import { LoginPayload, RegisterPayload } from "../types";

// One useMutation per endpoint, wired to react-hook-form via the matching zod
// schema in lib/validations. These previously resolved against lib/mocks;
// every mutationFn now calls the real API through axiosPublic/axiosAuth. The
// forms, toasts and redirects are untouched — the response envelope is the
// same shape the mocks returned.
//
// Flow: Sign Up -> Verify Email (OTP) -> Account Created -> Dashboard.
// Sign In -> Dashboard. Forgot Password (email) -> Reset Password OTP ->
// Reset Password (new password) -> Sign In.

// The login response carries the user alongside the tokens, so the auth store
// is populated without a follow-up /users/me round trip.
type LoginResponse = AuthTokensData & {
	user: { id: string; email: string; fullName: string };
};

export const useRegister = () => {
	const router = useRouter();
	const resetSession = useAuthStore((state) => state.resetSession);

	return useMutation({
		mutationFn: async (values: RegisterPayload) => {
			// Before the request, not after. Registering establishes a new
			// identity, so any session already in this browser has to go first —
			// otherwise the sign-up -> verify -> dashboard flow lands the new
			// user in whoever was signed in here before, since /register issues
			// no session of its own and the stale cookie still satisfies
			// `isAuthenticated`. Clearing up front also means an abandoned or
			// failed registration cannot leave the old account reachable.
			resetSession();

			const { data } = await axiosPublic.post<ApiSuccessResponse<null>>(
				apiRoutes.auth.REGISTER,
				values,
			);
			return data;
		},
		onSuccess: (data, values) => {
			toast.success(data.message);
			router.push(
				`${pageRoutes.authRoutes.VERIFY_EMAIL}?email=${encodeURIComponent(values.email)}`,
			);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error));
		},
	});
};

export const useLogin = () => {
	const router = useRouter();
	const login = useAuthStore((state) => state.login);
	const resetSession = useAuthStore((state) => state.resetSession);

	return useMutation({
		mutationFn: async (values: LoginPayload) => {
			// `login()` clears the previous identity too, but only once the
			// request succeeds. Dropping it here as well means a *failed*
			// sign-in attempt cannot leave the previous account signed in and
			// reachable on a shared browser.
			resetSession();

			const { data } = await axiosPublic.post<ApiSuccessResponse<LoginResponse>>(
				apiRoutes.auth.LOGIN,
				values,
			);
			return data;
		},
		onSuccess: (data, values) => {
			const { user, ...tokens } = data.data;
			login(tokens, {
				id: user?.id ?? "",
				email: user?.email ?? values.email,
				fullName: user?.fullName,
			});
			toast.success(data.message);
			router.push(pageRoutes.dashboardRoutes.DASHBOARD);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Invalid email or password"));
		},
	});
};

/**
 * Starts the Google sign-in round trip.
 *
 * This is the only auth call that goes straight from the browser to Supabase
 * rather than through /api/v1/auth/*: the OAuth handshake is a redirect the
 * server cannot stand in for, and PKCE keeps the one-time verifier in this
 * browser. The browser comes back to /auth/callback, which exchanges the code
 * and puts the resulting tokens in the same store a password sign-in uses.
 *
 * Nothing resolves on success — the page navigates away.
 */
export const useGoogleSignIn = () => {
	return useMutation({
		mutationFn: async () => {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: `${window.location.origin}${pageRoutes.authRoutes.OAUTH_CALLBACK}`,
				},
			});
			if (error) throw error;
		},
		onError: (error) => {
			// The usual cause is the provider not being enabled in Supabase, or
			// this origin missing from the redirect allowlist — neither of which
			// the user can do anything about, so the message stays general and
			// the detail goes to the console.
			console.error("[auth] google sign-in:", error);
			toast.error(
				error instanceof Error && /provider is not enabled/i.test(error.message)
					? "Google sign-in isn't enabled yet."
					: "Could not start Google sign-in. Try again.",
			);
		},
	});
};

export const useForgotPassword = () => {
	const router = useRouter();

	return useMutation({
		mutationFn: async (values: { email: string }) => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<null>>(
				apiRoutes.auth.FORGOT_PASSWORD,
				values,
			);
			return data;
		},
		onSuccess: (data, values) => {
			toast.success(data.message);
			router.push(
				`${pageRoutes.authRoutes.RESET_PASSWORD_OTP}?email=${encodeURIComponent(values.email)}`,
			);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error));
		},
	});
};

export const useVerifyEmail = () => {
	const router = useRouter();

	return useMutation({
		mutationFn: async (values: { email: string; otp: string }) => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<null>>(
				apiRoutes.auth.VERIFY_EMAIL,
				values,
			);
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			router.push(pageRoutes.authRoutes.ACCOUNT_CREATED);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "That code didn't work — check it and try again"));
		},
	});
};

export const useResendOtp = () => {
	return useMutation({
		mutationFn: async (values: { email: string }) => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<null>>(
				apiRoutes.auth.RESEND_OTP,
				values,
			);
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error));
		},
	});
};

export const useVerifyResetOtp = () => {
	const router = useRouter();

	return useMutation({
		mutationFn: async (values: { email: string; otp: string }) => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<null>>(
				apiRoutes.auth.VERIFY_RESET_OTP,
				values,
				// The success response sets an httpOnly ticket cookie that the
				// reset step requires. Same-origin requests send it back
				// automatically; this keeps that working if the API is ever
				// moved to another origin.
				{ withCredentials: true },
			);
			return data;
		},
		onSuccess: (data, values) => {
			toast.success(data.message);
			router.push(
				`${pageRoutes.authRoutes.RESET_PASSWORD}?email=${encodeURIComponent(values.email)}`,
			);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "That code didn't work — check it and try again"));
		},
	});
};

export const useResetPassword = () => {
	const router = useRouter();

	return useMutation({
		mutationFn: async (values: { email: string; password: string }) => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<null>>(
				apiRoutes.auth.RESET_PASSWORD,
				values,
				{ withCredentials: true },
			);
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			router.push(pageRoutes.authRoutes.SIGN_IN);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error));
		},
	});
};

export const useLogoutMutation = () => {
	const router = useRouter();
	const logout = useAuthStore((state) => state.logout);

	return useMutation({
		mutationFn: async () => {
			const { data } = await axiosAuth.post<ApiSuccessResponse<null>>(apiRoutes.auth.LOGOUT);
			return data;
		},
		onSuccess: () => {
			logout();
			router.push(pageRoutes.authRoutes.SIGN_IN);
		},
		onError: () => {
			// Clear local state regardless so the user isn't stuck signed in
			// just because the network call failed.
			logout();
			router.push(pageRoutes.authRoutes.SIGN_IN);
		},
	});
};
