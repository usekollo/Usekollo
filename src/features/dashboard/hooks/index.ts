"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiRoutes } from "@/lib/config/apiRoutes";
import { axiosAuth } from "@/lib/config/axios";
import { pageRoutes } from "@/lib/config/routes";
import { formatAddress, getApiErrorMessage } from "@/lib/utils";
import { CreateGoalValues } from "@/lib/validations/goalValidations";
import {
	WalletRejectedError,
	assertCorrectNetwork,
	connectWallet,
	getConnectedAddress,
	signXdr,
} from "@/lib/wallet/kit";
import type { ApiSuccessResponse } from "@/types/api";
import type { AddSavingsResult, DashboardSummary, Goal } from "../types";

// Reads go straight to the API. Writes take the three-step non-custodial path:
//
//   1. POST /tx/prepare  — the server builds and simulates the contract call
//                          and returns unsigned XDR. Anything that would fail
//                          on-chain fails here, before the user is asked to
//                          approve anything.
//   2. Freighter signs   — in the extension, with the user's own key. Nothing
//                          in this app or on the server ever sees it.
//   3. POST /tx/submit   — the server submits the signed envelope, waits for
//                          the ledger, and records the activity row.
//
// `runTransaction` wraps all three so the deposit/withdraw hooks keep
// resolving to the same AddSavingsResult shape TransactionFlow already
// renders — including on failure, which is a resolved value here, not a throw.

export const useDashboardSummary = () => {
	return useQuery({
		queryKey: ["dashboard-summary"],
		queryFn: async () => {
			const { data } =
				await axiosAuth.get<ApiSuccessResponse<DashboardSummary>>(apiRoutes.dashboard.SUMMARY);
			return data.data;
		},
	});
};

// `id` can be undefined (e.g. DashboardHeader doesn't always know a goal
// id) — the query just stays disabled until one shows up.
export const useGoal = (id?: string) => {
	return useQuery({
		queryKey: ["goal", id],
		queryFn: async () => {
			const { data } = await axiosAuth.get<ApiSuccessResponse<Goal>>(
				apiRoutes.goals.DETAIL(id as string),
			);
			return data.data;
		},
		enabled: Boolean(id),
	});
};

interface PreparedTransaction {
	xdr: string;
	networkPassphrase: string;
	/** The linked wallet the server built this for; the signer must match. */
	source: string;
}

interface SubmitResponse {
	success: boolean;
	action: "create_goal" | "deposit" | "withdraw";
	transactionId: string;
	ledger: number | null;
	goalId: string;
	goalName: string;
	amount: number;
	currency: string;
	goal: Goal | null;
	/** Settled post-transaction state. Null only if the server could not read it. */
	summary: DashboardSummary | null;
}

/**
 * Pushes the settled post-transaction state into the cache.
 *
 * The alternative — invalidating and letting React Query refetch — leaves
 * every figure the transaction moved (balance, saved amount, progress ring,
 * amount to next goal, activity feed) showing its old value for as long as
 * the round trip takes, and /dashboard/summary is the slowest query in the
 * app because it reads Soroban, Horizon and Postgres. Writing the response we
 * already hold updates all of it in the same frame the result screen renders.
 *
 * These are post-confirmation figures read off the chain, not optimistic
 * arithmetic, so there is nothing to reconcile afterwards — no refetch is
 * triggered here. If the server could not read the summary, fall back to
 * invalidating so the numbers still correct themselves.
 */
function applyTransactionResult(
	queryClient: ReturnType<typeof useQueryClient>,
	result: SubmitResponse,
) {
	if (!result.summary) {
		queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
		queryClient.invalidateQueries({ queryKey: ["goal", result.goalId] });
		return;
	}

	queryClient.setQueryData<DashboardSummary>(["dashboard-summary"], result.summary);

	// Prime every goal detail query, not just the one that changed — a deposit
	// that completes a goal shifts `amountToNextGoal`, and the goals list is
	// already in hand, so seeding them all costs nothing and means navigating
	// to any goal renders without a loading skeleton.
	for (const goal of result.summary.goals) {
		queryClient.setQueryData<Goal>(["goal", goal.id], goal);
	}
}

/**
 * Signs prepared XDR with the wallet the transaction was actually built for.
 *
 * The server builds every transaction with the *linked* account as its
 * source, so signing with anything else produces an envelope the network
 * rejects as `tx_bad_auth` — which says nothing about the cause. Checking the
 * two against each other here catches it before the user is prompted.
 *
 * `getConnectedAddress` first, because opening the picker on every deposit is
 * both noisy and the very thing that lets a different account get selected.
 */
async function signAsLinkedWallet(prepared: PreparedTransaction): Promise<string> {
	let address = await getConnectedAddress();
	if (!address) address = await connectWallet();

	if (address !== prepared.source) {
		throw new Error(
			`Your wallet is on a different account than the one linked here (${formatAddress(prepared.source)}). Switch accounts in your wallet, or reconnect it under Profile.`,
		);
	}

	return signXdr(prepared.xdr, address);
}

/** prepare -> sign -> submit. Throws; callers decide how to present failure. */
async function runTransaction(payload: Record<string, unknown>): Promise<SubmitResponse> {
	// Signing against the wrong network produces a valid signature that the
	// network then rejects, with an error that points nowhere near the cause.
	await assertCorrectNetwork();

	const { data: prepared } = await axiosAuth.post<ApiSuccessResponse<PreparedTransaction>>(
		apiRoutes.tx.PREPARE,
		payload,
	);

	const signedXdr = await signAsLinkedWallet(prepared.data);

	const { data: submitted } = await axiosAuth.post<ApiSuccessResponse<SubmitResponse>>(
		apiRoutes.tx.SUBMIT,
		{ xdr: signedXdr },
	);

	return submitted.data;
}

export const useCreateGoal = () => {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (values: CreateGoalValues) =>
			runTransaction({
				action: "create",
				name: values.name,
				targetAmount: values.targetAmount,
				asset: values.asset,
				targetDate: values.targetDate,
			}),
		onSuccess: (result) => {
			toast.success(`"${result.goalName}" goal created.`);
			// Seeds the new goal's own query too, so the page pushed to below
			// renders its figures immediately rather than flashing a skeleton.
			applyTransactionResult(queryClient, result);
			// The newly created goal's own "previewed plan" page, not the
			// dashboard — see CreateGoalForm/GoalDetailView.
			router.push(pageRoutes.dashboardRoutes.GOAL_DETAIL(result.goalId));
		},
		onError: (error) => {
			toast.error(toWalletMessage(error, "Couldn't create that goal — try again"));
		},
	});
};

/**
 * Deliberately doesn't throw on a failed deposit — TransactionFlow drives its
 * Transfer Failed / Transfer Complete states off `result.success` in the
 * resolved value, not off mutation.isError. A rejected signature, a network
 * error or a contract revert all come back as `success: false` with a real
 * transaction id where one exists.
 */
function useTransaction(goalId: string, action: "deposit" | "withdraw") {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (amount: number): Promise<AddSavingsResult> => {
			try {
				const result = await runTransaction({ action, goalId: Number(goalId), amount });

				// Applied here rather than in onSuccess so every figure is already
				// correct by the time TransactionFlow swaps to its result screen —
				// the balance behind it, the goal's progress ring and the activity
				// feed all update in the same frame.
				applyTransactionResult(queryClient, result);

				return {
					success: true,
					transactionId: result.transactionId,
					amount: result.amount,
					currency: result.currency,
					goalId: result.goalId,
					goalName: result.goalName,
					goal: result.goal ?? undefined,
				};
			} catch (error) {
				const message = toWalletMessage(
					error,
					action === "deposit"
						? "That deposit didn't go through."
						: "That withdrawal didn't go through.",
				);

				// Surface the reason as well as the failure card — the card
				// itself has no room to explain *why*.
				toast.error(message);

				return {
					success: false,
					transactionId: "—",
					amount,
					currency: "",
					goalId,
					goalName: "",
					error: message,
				};
			}
		},
		// No onSuccess cache work: applyTransactionResult above has already
		// written the settled figures, and a failure leaves nothing to update.
	});
}

export const useAddSavings = (goalId: string) => useTransaction(goalId, "deposit");
export const useWithdraw = (goalId: string) => useTransaction(goalId, "withdraw");

interface PreparedTrustline extends PreparedTransaction {
	assetCode: string;
	reserveXlm: number;
}

interface TrustlineResponse {
	success: boolean;
	transactionId: string;
	assetCode: string;
	summary: DashboardSummary | null;
}

/**
 * Adds a trustline so the wallet can hold a non-native asset.
 *
 * Without one, the savings contract's `deposit` reverts inside the asset's
 * SAC with TrustlineMissing — so for a USDC goal this is a prerequisite, not
 * an optimisation. Same prepare -> sign -> submit shape as a deposit, but
 * against /wallet/trustline: a trustline is a classic `changeTrust`
 * operation, not a Soroban call, so it cannot go through /tx/submit.
 *
 * Unlike the deposit hooks this one throws on failure — there is no result
 * screen for it, just the button it is wired to.
 */
export const useAddTrustline = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (assetCode: string): Promise<TrustlineResponse> => {
			await assertCorrectNetwork();

			const { data: prepared } = await axiosAuth.post<ApiSuccessResponse<PreparedTrustline>>(
				apiRoutes.wallet.TRUSTLINE,
				{ asset: assetCode },
			);

			const signedXdr = await signAsLinkedWallet(prepared.data);

			const { data: submitted } = await axiosAuth.put<ApiSuccessResponse<TrustlineResponse>>(
				apiRoutes.wallet.TRUSTLINE,
				{ asset: assetCode, xdr: signedXdr },
			);

			return submitted.data;
		},
		onSuccess: (result) => {
			toast.success(`Your wallet can now hold ${result.assetCode}.`);

			// Writing the returned summary straight in is what unblocks the
			// deposit form in the same frame — it gates on
			// `balances[currency].available`, which this flips.
			if (result.summary) {
				queryClient.setQueryData<DashboardSummary>(["dashboard-summary"], result.summary);
			} else {
				queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
			}
		},
		onError: (error) => {
			toast.error(toWalletMessage(error, "Couldn't add that trustline — try again"));
		},
	});
};

/**
 * Wallet errors are thrown Errors, not axios responses, so getApiErrorMessage
 * alone would flatten "Freighter isn't installed" into the generic fallback.
 */
function toWalletMessage(error: unknown, fallback: string): string {
	if (error instanceof WalletRejectedError) return error.message;
	if (error instanceof Error && !("response" in error)) {
		return error.message || fallback;
	}
	return getApiErrorMessage(error, fallback);
}
