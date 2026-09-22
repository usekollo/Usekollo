export type GoalStatus = "running" | "urgent" | "done";

export interface Goal {
	id: string;
	name: string;
	saved: number;
	target: number;
	currency: string;
	status: GoalStatus;
	// ISO date (yyyy-mm-dd) — the <input type="date"> value from
	// CreateGoalForm, formatted for display via formatMonthYear.
	targetDate: string;
	// Only meaningful once a goal is done — the amount actually sent back
	// on withdrawal (can differ slightly from `target`, e.g. yield). Falls
	// back to `target` wherever it's missing.
	totalDisbursed?: number;
}

export type ActivityStatus = "success" | "pending" | "failed";
export type ActivityDirection = "in" | "out";

export interface ActivityItem {
	id: string;
	hash: string;
	operation: string;
	dateTime: string;
	amount: number;
	currency: string;
	direction: ActivityDirection;
	status: ActivityStatus;
}

/** What the wallet holds of one asset, per asset code. */
export interface AssetBalance {
	amount: number;
	/** False when the account holds no trustline for this asset — it cannot
	 *  receive or send it until one is added in the wallet. */
	available: boolean;
}

export interface DashboardSummary {
	/** Headline figure only — always the primary asset (XLM). Deposits must
	 *  gate on `balances[goal.currency]`, not on this. */
	balance: number;
	currency: string;
	/** Every supported asset, so a USDC goal can be checked against USDC. */
	balances: Record<string, AssetBalance>;
	amountToNextGoal: number;
	goals: Goal[];
	activity: ActivityItem[];
}

// The resolved value of a deposit/withdraw mutation. TransactionFlow drives
// its Transfer Complete / Transfer Failed states off `success` in here rather
// than off mutation.isError, so a rejected signature or a failed submission
// has to come back as a value, not a thrown error.
export interface AddSavingsResult {
	success: boolean;
	transactionId: string;
	amount: number;
	currency: string;
	goalId: string;
	goalName: string;
	goal?: Goal;
	/** Why it failed, when it did — shown as a toast alongside the failure card. */
	error?: string;
}
