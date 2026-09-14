"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { axiosPublic } from "@/lib/config/axios";
import { apiRoutes } from "@/lib/config/apiRoutes";
import { pageRoutes } from "@/lib/config/routes";
import { useAuthStore } from "@/lib/stores/userAuthStore";
import { getApiErrorMessage } from "@/lib/utils";
import { ApiSuccessResponse, AuthTokensData } from "@/types/api";
import { LoginPayload, RegisterPayload } from "../types";

// Reference implementation for the feature-hook pattern: each feature gets
// its own hooks/index.ts exporting one useMutation/useQuery per endpoint,
// wired to react-hook-form via the matching zod schema in
// lib/validations. Replace the payload/response shapes here once the real
// backend contract is known.

export const useRegister = () => {
	const router = useRouter();

	return useMutation({
		mutationFn: async (values: RegisterPayload) => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<unknown>>(
				apiRoutes.auth.REGISTER,
				values,
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

export const useLogin = () => {
	const router = useRouter();
	const login = useAuthStore((state) => state.login);

	return useMutation({
		mutationFn: async (values: LoginPayload) => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<AuthTokensData>>(
				apiRoutes.auth.LOGIN,
				values,
			);
			return data;
		},
		onSuccess: (data) => {
			login(data.data);
			toast.success(data.message);
			router.push(pageRoutes.dashboardRoutes.DASHBOARD);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Invalid email or password"));
		},
	});
};

export const useForgotPassword = () => {
	return useMutation({
		mutationFn: async (values: { email: string }) => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<unknown>>(
				apiRoutes.auth.FORGOT_PASSWORD,
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

export const useLogoutMutation = () => {
	const router = useRouter();
	const logout = useAuthStore((state) => state.logout);

	return useMutation({
		mutationFn: async () => {
			const { data } = await axiosPublic.post<ApiSuccessResponse<unknown>>(
				apiRoutes.auth.LOGOUT,
			);
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
