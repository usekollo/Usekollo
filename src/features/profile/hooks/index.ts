"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	mockChangePassword,
	mockConnectWallet,
	mockDisconnectWallet,
	mockGetProfile,
	mockGetWalletConnection,
	mockUpdateProfile,
} from "@/lib/mocks/profileMocks";
import { getApiErrorMessage } from "@/lib/utils";
import { ChangePasswordValues, PersonalDetailsValues } from "@/lib/validations/profileValidations";

// Same feature-hook pattern as features/dashboard/hooks (see that file's
// header comment). Logout itself lives in features/auth/hooks
// (useLogoutMutation) — it's session/token state, not profile state.
export const useProfile = () => {
	return useQuery({
		queryKey: ["profile"],
		queryFn: async () => (await mockGetProfile()).data,
	});
};

export const useUpdateProfile = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (values: PersonalDetailsValues & { email: string; avatarUrl: string | null }) =>
			mockUpdateProfile(values),
		onSuccess: () => {
			toast.success("Profile updated.");
			queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Couldn't update your profile — try again"));
		},
	});
};

export const useChangePassword = () => {
	return useMutation({
		mutationFn: (values: ChangePasswordValues) => mockChangePassword(values),
		onSuccess: () => {
			toast.success("Password updated.");
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Couldn't update your password — try again"));
		},
	});
};

export const useWalletConnection = () => {
	return useQuery({
		queryKey: ["wallet-connection"],
		queryFn: async () => (await mockGetWalletConnection()).data,
	});
};

export const useDisconnectWallet = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: mockDisconnectWallet,
		onSuccess: () => {
			toast.success("Wallet disconnected.");
			queryClient.invalidateQueries({ queryKey: ["wallet-connection"] });
		},
	});
};

export const useConnectWallet = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: mockConnectWallet,
		onSuccess: () => {
			toast.success("Wallet connected.");
			queryClient.invalidateQueries({ queryKey: ["wallet-connection"] });
		},
	});
};
