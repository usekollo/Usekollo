import { ApiSuccessResponse } from "@/types/api";
import { ActivityItem, DashboardSummary, Goal } from "@/features/dashboard/types";
import { CreateGoalValues } from "@/lib/validations/goalValidations";
import { getStoredActivity, getStoredGoals, setStoredActivity, setStoredGoals } from "./localStore";

// Same "no backend yet" pattern as authMocks.ts — see that file's header
// comment. Goals and activity persist to localStorage (see localStore.ts)
// so a created goal or a deposit survives a refresh; balance/currency/
// amountToNextGoal stay static mock figures since nothing here simulates a
// real wallet balance changing.
const MOCK_DELAY_MS = 1100;

const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

const envelope = <T>(data: T): ApiSuccessResponse<T> => ({
	statusCode: 200,
	message: "OK",
	timestamp: new Date().toISOString(),
	data,
});

// Reused wherever a "connected wallet" needs a stand-in address — the
// header chip, and the Add Savings / Goal Detail screens.
export const MOCK_WALLET_ADDRESS = "GCJ7...3F9A";

const seedGoals: Goal[] = [
	{
		id: "goal-1",
		name: "New Laptop",
		saved: 250,
		target: 500,
		currency: "USDC",
		status: "running",
		targetDate: "2026-08-15",
	},
	{
		id: "goal-2",
		name: "New Laptop",
		saved: 2700,
		target: 3000,
		currency: "USDC",
		status: "urgent",
		targetDate: "2026-01-10",
	},
	{
		id: "goal-3",
		name: "Emergency Fund",
		saved: 3000,
		target: 3000,
		currency: "USDC",
		status: "done",
		targetDate: "2025-11-01",
		totalDisbursed: 3050.9,
	},
];

const seedActivity: ActivityItem[] = [
	{
		id: "tx-1",
		hash: "7f3a9c...2b8e",
		operation: "Deposit to Laptop",
		dateTime: "Oct 24, 2023 · 14:32",
		amount: 500,
		currency: "USDC",
		direction: "in",
		status: "success",
	},
	{
		id: "tx-2",
		hash: "0xc5e2...93aa",
		operation: "Withdrawal",
		dateTime: "Oct 23, 2023 · 09:15",
		amount: 2450,
		currency: "USDC",
		direction: "out",
		status: "success",
	},
	{
		id: "tx-3",
		hash: "18db4e...91fa",
		operation: "Deposit Pending",
		dateTime: "Oct 22, 2023 · 18:45",
		amount: 1.28,
		currency: "USDC",
		direction: "in",
		status: "pending",
	},
	{
		id: "tx-4",
		hash: "7a22f0...c4da",
		operation: "Failed Deposit",
		dateTime: "Oct 21, 2023 · 11:20",
		amount: 0,
		currency: "XLM",
		direction: "in",
		status: "failed",
	},
	{
		id: "tx-5",
		hash: "9b41ac...5f2e",
		operation: "Initial Deposit",
		dateTime: "Oct 20, 2023 · 16:05",
		amount: 1000,
		currency: "USDC",
		direction: "in",
		status: "success",
	},
	{
		id: "tx-6",
		hash: "2ce88f...a013",
		operation: "Deposit to Emergency Fund",
		dateTime: "Oct 19, 2023 · 08:40",
		amount: 3000,
		currency: "USDC",
		direction: "in",
		status: "success",
	},
	{
		id: "tx-7",
		hash: "5d70b1...74c9",
		operation: "Withdrawal",
		dateTime: "Oct 18, 2023 · 12:15",
		amount: 2450,
		currency: "USDC",
		direction: "out",
		status: "success",
	},
	{
		id: "tx-8",
		hash: "e13f9a...b26d",
		operation: "Deposit Pending",
		dateTime: "Oct 17, 2023 · 21:30",
		amount: 250,
		currency: "USDC",
		direction: "in",
		status: "pending",
	},
	{
		id: "tx-9",
		hash: "084cd7...9e11",
		operation: "Failed Withdrawal",
		dateTime: "Oct 16, 2023 · 10:00",
		amount: 500,
		currency: "USDC",
		direction: "out",
		status: "failed",
	},
	{
		id: "tx-10",
		hash: "c76a2e...438f",
		operation: "Deposit to Laptop",
		dateTime: "Oct 15, 2023 · 07:55",
		amount: 250,
		currency: "USDC",
		direction: "in",
		status: "success",
	},
];

export async function mockGetDashboardSummary(): Promise<ApiSuccessResponse<DashboardSummary>> {
	await delay();
	return envelope({
		balance: 2480.0,
		currency: "USDC",
		amountToNextGoal: 550.0,
		goals: getStoredGoals(seedGoals),
		activity: getStoredActivity(seedActivity),
	});
}

export async function mockGetGoalById(id: string): Promise<ApiSuccessResponse<Goal | null>> {
	await delay();
	const goal = getStoredGoals(seedGoals).find((item) => item.id === id) ?? null;
	return envelope(goal);
}

export async function mockCreateGoal(values: CreateGoalValues): Promise<ApiSuccessResponse<Goal>> {
	await delay();

	const goal: Goal = {
		id: `goal-${Date.now()}`,
		name: values.name,
		saved: 0,
		target: Number(values.targetAmount),
		currency: values.asset,
		status: "running",
		targetDate: values.targetDate,
	};

	setStoredGoals([goal, ...getStoredGoals(seedGoals)]);
	return envelope(goal);
}

export interface AddSavingsResult {
	success: boolean;
	transactionId: string;
	amount: number;
	currency: string;
	goalId: string;
	goalName: string;
	goal?: Goal;
}

function generateTransactionId() {
	const segment = () => Math.random().toString(16).slice(2, 8);
	return `${segment()}...${segment().slice(0, 4)}`;
}

// Simulates depositing into a goal. Never rejects — success/failure is
// carried in the result itself (`success: false` roughly 1 in 5 times, the
// same "a real network is unreliable" idea as the FAILED row already in
// the seed activity feed) so the UI can render a proper Transfer Failed
// state instead of just a toast.
export async function mockAddSavings(goalId: string, amount: number): Promise<ApiSuccessResponse<AddSavingsResult>> {
	await delay();

	const goals = getStoredGoals(seedGoals);
	const goal = goals.find((item) => item.id === goalId);
	const transactionId = generateTransactionId();

	if (!goal) {
		return envelope({
			success: false,
			transactionId,
			amount,
			currency: "USDC",
			goalId,
			goalName: "Goal",
		});
	}

	const success = Math.random() >= 0.2;

	if (!success) {
		return envelope({
			success,
			transactionId,
			amount,
			currency: goal.currency,
			goalId,
			goalName: goal.name,
		});
	}

	const saved = Math.min(goal.target, goal.saved + amount);
	const updatedGoal: Goal = {
		...goal,
		saved,
		status: saved >= goal.target ? "done" : goal.status,
	};

	setStoredGoals(goals.map((item) => (item.id === goalId ? updatedGoal : item)));
	setStoredActivity([
		{
			id: `tx-${Date.now()}`,
			hash: transactionId,
			operation: `Deposit to ${goal.name}`,
			dateTime: new Date().toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}),
			amount,
			currency: goal.currency,
			direction: "in",
			status: "success",
		},
		...getStoredActivity(seedActivity),
	]);

	return envelope({
		success,
		transactionId,
		amount,
		currency: goal.currency,
		goalId,
		goalName: goal.name,
		goal: updatedGoal,
	});
}

// Same shape/behaviour as mockAddSavings (never rejects, ~1 in 5 fails) —
// just pulls the amount back out of the goal instead of adding to it. If a
// withdrawal drops a completed goal back under its target, its status
// reverts to "running" rather than staying stuck on "done".
export async function mockWithdraw(goalId: string, amount: number): Promise<ApiSuccessResponse<AddSavingsResult>> {
	await delay();

	const goals = getStoredGoals(seedGoals);
	const goal = goals.find((item) => item.id === goalId);
	const transactionId = generateTransactionId();

	if (!goal) {
		return envelope({
			success: false,
			transactionId,
			amount,
			currency: "USDC",
			goalId,
			goalName: "Goal",
		});
	}

	const success = Math.random() >= 0.2;

	if (!success) {
		return envelope({
			success,
			transactionId,
			amount,
			currency: goal.currency,
			goalId,
			goalName: goal.name,
		});
	}

	const saved = Math.max(0, goal.saved - amount);
	const updatedGoal: Goal = {
		...goal,
		saved,
		status: saved >= goal.target ? "done" : "running",
	};

	setStoredGoals(goals.map((item) => (item.id === goalId ? updatedGoal : item)));
	setStoredActivity([
		{
			id: `tx-${Date.now()}`,
			hash: transactionId,
			operation: `Withdrawal from ${goal.name}`,
			dateTime: new Date().toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}),
			amount,
			currency: goal.currency,
			direction: "out",
			status: "success",
		},
		...getStoredActivity(seedActivity),
	]);

	return envelope({
		success,
		transactionId,
		amount,
		currency: goal.currency,
		goalId,
		goalName: goal.name,
		goal: updatedGoal,
	});
}
