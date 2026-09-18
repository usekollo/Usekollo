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

export interface DashboardSummary {
	balance: number;
	currency: string;
	amountToNextGoal: number;
	goals: Goal[];
	activity: ActivityItem[];
}
