"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	AddSavingsResult,
	mockAddSavings,
	mockCreateGoal,
	mockGetDashboardSummary,
	mockGetGoalById,
	mockWithdraw,
} from "@/lib/mocks/dashboardMocks";
import { pageRoutes } from "@/lib/config/routes";
import { getApiErrorMessage } from "@/lib/utils";
import { CreateGoalValues } from "@/lib/validations/goalValidations";

// Same feature-hook pattern as features/auth/hooks (see that file's header
// comment). Both resolve against mocks — swap the mock import for a real
// axiosPublic call once a backend exists; nothing else needs to change.
export const useDashboardSummary = () => {
	return useQuery({
		queryKey: ["dashboard-summary"],
		queryFn: async () => {
			const { data } = await mockGetDashboardSummary();
			return data;
		},
	});
};

// `id` can be undefined (e.g. DashboardHeader doesn't always know a goal
// id) — the query just stays disabled until one shows up.
export const useGoal = (id?: string) => {
	return useQuery({
		queryKey: ["goal", id],
		queryFn: async () => {
			const { data } = await mockGetGoalById(id as string);
			return data;
		},
		enabled: Boolean(id),
	});
};

export const useCreateGoal = () => {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (values: CreateGoalValues) => mockCreateGoal(values),
		onSuccess: (result) => {
			toast.success(`"${result.data.name}" goal created.`);
			queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
			// The newly created goal's own "previewed plan" page, not the
			// dashboard — see CreateGoalForm/GoalDetailView.
			router.push(pageRoutes.dashboardRoutes.GOAL_DETAIL(result.data.id));
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error, "Couldn't create that goal — try again"));
		},
	});
};

// Deliberately doesn't throw on a failed deposit (see mockAddSavings) —
// TransactionFlow drives its Transfer Failed / Transfer Complete states off
// `result.success` in the resolved value, not off mutation.isError.
export const useAddSavings = (goalId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (amount: number): Promise<AddSavingsResult> =>
			mockAddSavings(goalId, amount).then((res) => res.data),
		onSuccess: (result) => {
			if (!result.success) return;
			queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
			queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
		},
	});
};

// Same idea as useAddSavings, wired to mockWithdraw instead.
export const useWithdraw = (goalId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (amount: number): Promise<AddSavingsResult> =>
			mockWithdraw(goalId, amount).then((res) => res.data),
		onSuccess: (result) => {
			if (!result.success) return;
			queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
			queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
		},
	});
};
