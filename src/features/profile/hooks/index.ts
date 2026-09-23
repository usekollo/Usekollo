"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRoutes } from "@/lib/config/apiRoutes";
import { axiosAuth } from "@/lib/config/axios";
import { getApiErrorMessage } from "@/lib/utils";
import { ChangePasswordValues, PersonalDetailsValues } from "@/lib/validations/profileValidations";
import {
	WalletRejectedError,
	assertCorrectNetwork,
	connectWallet,
	signChallenge,
} from "@/lib/wallet/kit";
import type { ApiSuccessResponse } from "@/types/api";
import type { ProfileDetails, WalletConnection } from "../types";

// Same feature-hook pattern as features/dashboard/hooks (see that file's
// header comment). Logout itself lives in features/auth/hooks
// (useLogoutMutation) — it's session/token state, not profile state.

export const useProfile = () => {
	return useQuery({
		queryKey: ["profile"],
		queryFn: async () => {
			const { data } = await axiosAuth.get<ApiSuccessResponse<ProfileDetails>>(
				apiRoutes.users.ME,
			);
			return data.data;
		},
	});
};

export const useUpdateProfile = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (values: PersonalDetailsValues) => {
			// Two fields are deliberately not sent. Email is the account
			// identifier and is not editable (the form renders it read-only and
			// the API rejects changes). The photo saves through its own upload
			// endpoint the moment it is chosen, so sending it here too would
			// only risk overwriting the stored URL with a stale value.
			const { data } = await axiosAuth.patch<ApiSuccessResponse<ProfileDetails>>(
				apiRoutes.users.ME,
				{ fullName: values.fullName },
			);
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Couldn't update your profile — try again"));
		},
	});
};

export const useChangePassword = () => {
	return useMutation({
		mutationFn: async (values: ChangePasswordValues) => {
			const { data } = await axiosAuth.post<ApiSuccessResponse<null>>(
				apiRoutes.users.CHANGE_PASSWORD,
				{ currentPassword: values.currentPassword, newPassword: values.newPassword },
			);
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Couldn't update your password — try again"));
		},
	});
};

export const useWalletConnection = () => {
	return useQuery({
		queryKey: ["wallet-connection"],
		queryFn: async () => {
			const { data } = await axiosAuth.get<ApiSuccessResponse<WalletConnection>>(
				apiRoutes.wallet.STATUS,
			);
			return data.data;
		},
	});
};

export const useDisconnectWallet = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const { data } = await axiosAuth.post<ApiSuccessResponse<WalletConnection>>(
				apiRoutes.wallet.DISCONNECT,
			);
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["wallet-connection"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Couldn't disconnect that wallet — try again"));
		},
	});
};

/**
 * Links a wallet to the account, proving ownership first.
 *
 * The server issues a single-use challenge transaction, the wallet signs it,
 * and the server verifies that signature before storing the address. Without
 * that step anyone could claim any address simply by typing it.
 *
 * The challenge is a transaction rather than a message because signing a
 * message is not universal — Ledger, Trezor and Albedo all refuse it. It
 * carries sequence number 0, so the network can never accept it and signing
 * authorises nothing.
 */
export const useConnectWallet = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await assertCorrectNetwork();
			const address = await connectWallet();

			const { data: challenge } = await axiosAuth.post<
				ApiSuccessResponse<{ nonce: string; challengeXdr: string }>
			>(apiRoutes.wallet.CHALLENGE, { publicKey: address });

			const signedXdr = await signChallenge(challenge.data.challengeXdr, address);

			const { data } = await axiosAuth.post<ApiSuccessResponse<WalletConnection>>(
				apiRoutes.wallet.CONNECT,
				{ publicKey: address, nonce: challenge.data.nonce, signedXdr },
			);

			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["wallet-connection"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
		},
		onError: (error) => {
			if (error instanceof WalletRejectedError) {
				toast.error(error.message);
				return;
			}
			if (error instanceof Error && !("response" in error)) {
				toast.error(error.message);
				return;
			}
			toast.error(getApiErrorMessage(error, "Couldn't connect that wallet — try again"));
		},
	});
};

/** The UI promises "JPG or PNG, up to 2MB"; the server enforces the same. */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Uploads a profile photo and stores the resulting URL on the account.
 *
 * Sends the file as multipart form data rather than the base64 `data:` URL the
 * form used to submit — that put a ~2.7MB string on the user's database row
 * for a 2MB photo, read back on every profile load.
 *
 * Size and type are checked here as well as on the server: rejecting an
 * oversized file before it is uploaded is immediate, and saves pushing
 * megabytes up only to be told no.
 */
export const useUploadAvatar = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (file: File) => {
			if (file.size > MAX_AVATAR_BYTES) {
				const mb = (file.size / (1024 * 1024)).toFixed(1);
				throw new Error(`That image is ${mb}MB — the limit is 2MB.`);
			}
			if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
				throw new Error("Choose a JPG, PNG or WebP image.");
			}

			const body = new FormData();
			body.append("file", file);

			const { data } = await axiosAuth.post<ApiSuccessResponse<ProfileDetails>>(
				apiRoutes.users.AVATAR,
				body,
				// Let the browser set Content-Type so it can add the multipart
				// boundary; the axios instance defaults to application/json,
				// which would make the body unparseable server-side.
				{ headers: { "Content-Type": undefined } },
			);
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.setQueryData<ProfileDetails>(["profile"], data.data);
		},
		onError: (error) => {
			if (error instanceof Error && !("response" in error)) {
				toast.error(error.message);
				return;
			}
			toast.error(getApiErrorMessage(error, "Couldn't upload that photo — try again"));
		},
	});
};
