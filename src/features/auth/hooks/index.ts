"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	mockForgotPassword,
	mockLogin,
	mockLogoutRequest,
	mockRegister,
	mockResendOtp,
	mockResetPassword,
	mockVerifyEmail,
	mockVerifyResetOtp,
} from "@/lib/mocks/authMocks";
import { pageRoutes } from "@/lib/config/routes";
import { useAuthStore } from "@/lib/stores/userAuthStore";
import { getApiErrorMessage } from "@/lib/utils";
import { LoginPayload } from "../types";

// Reference implementation for the feature-hook pattern: each feature gets
// its own hooks/index.ts exporting one useMutation/useQuery per endpoint,
// wired to react-hook-form via the matching zod schema in
// lib/validations. Every mutationFn below calls a mock in lib/mocks
// instead of axiosPublic/axiosAuth — there's no backend yet. Swap the
// matching mock import for `axiosPublic.post(apiRoutes.auth.X, values)`
// (see lib/config/axios.ts / apiRoutes.ts, already wired for this) once
// one exists; nothing else in these hooks needs to change.
//
// Flow: Sign Up -> Verify Email (OTP) -> Account Created -> Dashboard.
// Sign In -> Dashboard. Forgot Password (email) -> Reset Password OTP ->
// Reset Password (new password) -> Sign In.

export const useRegister = () => {
	const router = useRouter();

	return useMutation({
		mutationFn: mockRegister,
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

	return useMutation({
		mutationFn: (values: LoginPayload) => mockLogin(values),
		onSuccess: (data, values) => {
			login(data.data, { id: "mock-user-id", email: values.email });
			toast.success(data.message);
			router.push(pageRoutes.dashboardRoutes.DASHBOARD);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Invalid email or password"));
		},
	});
};

export const useForgotPassword = () => {
	const router = useRouter();

	return useMutation({
		mutationFn: (values: { email: string }) => mockForgotPassword(values),
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
		mutationFn: (values: { email: string; otp: string }) => mockVerifyEmail(values),
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
		mutationFn: (values: { email: string }) => mockResendOtp(values),
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
		mutationFn: (values: { email: string; otp: string }) => mockVerifyResetOtp(values),
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
		mutationFn: (values: { email: string; password: string }) => mockResetPassword(values),
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
		mutationFn: mockLogoutRequest,
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
