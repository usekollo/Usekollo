"use client";

import { Plus, Target } from "lucide-react";
import { useMemo, useState } from "react";
import ActivitySection, { ActivitySectionSkeleton } from "@/components/dashboard/ActivitySection";
import BalanceCard, { BalanceCardSkeleton } from "@/components/dashboard/BalanceCard";
import GoalCard, { GoalCardSkeleton } from "@/components/dashboard/GoalCard";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { pageRoutes } from "@/lib/config/routes";
import { cn } from "@/lib/utils";

// Statuses a goal can be listed under. "Withdrawn" is deliberately its own
// option rather than folded into active: the contract distinguishes a goal
// someone emptied from one never funded, and hiding that distinction here
// would lose the only place a user can see it.
const GOAL_FILTERS: { label: string; value: string }[] = [
	{ label: "All Goals", value: "all" },
	{ label: "In Progress", value: "active" },
	{ label: "Completed", value: "done" },
];

// Built from the pasted "Savings Goals" screenshots — the root goals list
// (reuses BalanceCard/GoalCard/ActivitySection as-is), its own empty state
// (icon+button only on mobile, full copy on desktop, unlike the
// dashboard's own empty state which always shows the copy), and a loading
// skeleton matching each. "ALL GOALS"/"LAST 30 DAYS" are decorative, same
// as BalanceCard's currency pill — no real filtering yet.
export default function SavingsGoalsPage() {
	const { data, isLoading } = useDashboardSummary();
	const [goalFilter, setGoalFilter] = useState("all");

	const visibleGoals = useMemo(() => {
		if (!data) return [];
		if (goalFilter === "all") return data.goals;
		// "active" covers anything still being saved into, including a goal that
		// was emptied and has a target left to hit.
		return data.goals.filter((goal) =>
			goalFilter === "done" ? goal.status === "done" : goal.status !== "done",
		);
	}, [data, goalFilter]);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex flex-col gap-6 lg:flex-row">
					<div className="lg:w-2/5">
						<BalanceCardSkeleton />
					</div>
					<div className="space-y-3 lg:flex-1">
						{Array.from({ length: 3 }).map((_, index) => (
							<GoalCardSkeleton key={index} />
						))}
					</div>
				</div>
				<div className="hidden lg:block">
					<ActivitySectionSkeleton />
				</div>
			</div>
		);
	}

	if (!data || data.goals.length === 0) {
		return (
			<div className="flex flex-col items-center px-4 py-16 text-center lg:py-24">
				<span className="flex size-20 items-center justify-center rounded-full bg-grey-lighter text-grey-dark">
					<Target className="size-8" strokeWidth={1.5} />
				</span>

				<h1 className="mt-6 hidden text-2xl font-medium text-foreground lg:block lg:text-3xl">
					No Active Goals
				</h1>
				<p className="mt-2 hidden max-w-sm text-sm text-grey-normal lg:block">
					You haven&apos;t connected a wallet yet. Connect one to create your first savings goal and start
					tracking your progress.
				</p>

				<Button
					href={pageRoutes.dashboardRoutes.CREATE_GOAL}
					size="xl"
					className="mt-6 w-full sm:w-auto sm:px-10"
				>
					<Plus className="size-4" />
					Create Savings Goal
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="hidden items-center justify-between lg:flex">
				<span className="text-xs font-medium tracking-wide text-foreground uppercase">Savings Goals</span>
				{/* A "Last 30 Days" pill used to sit alongside these. It is gone
				    rather than wired: the UI goal carries no creation date, so
				    there is nothing to filter a date range against. */}
				<div className="flex items-center gap-2">
					{GOAL_FILTERS.map(({ label, value }) => (
						<button
							key={value}
							type="button"
							onClick={() => setGoalFilter(value)}
							className={cn(
								"rounded-full border px-4 py-2 text-xs font-medium transition-colors",
								goalFilter === value
									? "border-grey-dark bg-grey-dark text-white"
									: "border-border text-foreground",
							)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{/* Mobile-only filter pills */}
			<div className="flex items-center gap-2 lg:hidden">
				{GOAL_FILTERS.map(({ label, value }) => (
					<button
						key={value}
						type="button"
						onClick={() => setGoalFilter(value)}
						className={cn(
							"rounded-full border px-4 py-2 text-xs font-medium transition-colors",
							goalFilter === value
								? "border-grey-dark bg-grey-dark text-white"
								: "border-border bg-white text-foreground",
						)}
					>
						{label}
					</button>
				))}
			</div>

			<div className="flex flex-col gap-6 lg:flex-row">
				<div className="lg:w-2/5">
					<BalanceCard data={data} />
				</div>
				<div className="space-y-3 lg:flex-1">
					{visibleGoals.map((goal) => (
						<GoalCard key={goal.id} goal={goal} href={pageRoutes.dashboardRoutes.GOAL_DETAIL(goal.id)} />
					))}
				</div>
			</div>

			<div className="hidden lg:block">
				<ActivitySection activity={data.activity} hideHeading />
			</div>

			{/* Mobile-only — desktop shows the activity table above instead */}
			<Button href={pageRoutes.dashboardRoutes.ACTIVITY} size="xl" className="w-full lg:hidden">
				See Recent Transactions
			</Button>
		</div>
	);
}
