"use client";

import { Plus, Target } from "lucide-react";
import ActivitySection, { ActivitySectionSkeleton } from "@/components/dashboard/ActivitySection";
import BalanceCard, { BalanceCardSkeleton } from "@/components/dashboard/BalanceCard";
import OngoingGoalsSection, {
	OngoingGoalsSectionSkeleton,
} from "@/components/dashboard/OngoingGoalsSection";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { pageRoutes } from "@/lib/config/routes";

// Built from the pasted "Dashboard" screenshots — both the empty state
// (no goals yet) and the populated one. Desktop: balance card + ongoing
// goals side by side, activity table below. Mobile: everything stacked,
// activity as cards instead of a table, and the "Create Savings Goal"
// button sits on its own below Activity instead of inside the balance
// card (see BalanceCard's own header comment).
export default function DashboardPage() {
	const { data, isLoading } = useDashboardSummary();

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex flex-col gap-6 md:flex-row">
					<div className="md:w-2/5">
						<BalanceCardSkeleton />
					</div>
					<div className="md:flex-1">
						<OngoingGoalsSectionSkeleton />
					</div>
				</div>
				<ActivitySectionSkeleton />
			</div>
		);
	}

	if (!data || data.goals.length === 0) {
		return (
			<div className="flex flex-col items-center px-4 py-16 text-center md:py-24">
				<span className="flex size-20 items-center justify-center rounded-full bg-grey-lighter text-grey-dark">
					<Target className="size-8" strokeWidth={1.5} />
				</span>

				<h1 className="mt-6 text-2xl font-medium text-foreground md:text-3xl">No Active Goals</h1>

				<p className="mt-2 max-w-sm text-sm text-grey-normal">
					<span className="hidden md:inline">
						You haven&apos;t connected a wallet yet. Connect one to create your first savings
						goal and start tracking your progress.
					</span>
					<span className="md:hidden">
						You haven&apos;t allocated any funds to specific saving targets yet. Goals help you
						organize your assets.
					</span>
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
			<div className="flex flex-col gap-6 md:flex-row">
				<div className="md:w-2/5">
					<BalanceCard data={data} />
				</div>
				<div className="md:flex-1">
					<OngoingGoalsSection goals={data.goals} />
				</div>
			</div>

			<ActivitySection activity={data.activity} />

			{/* Mobile-only — desktop has this button inside BalanceCard instead */}
			<Button href={pageRoutes.dashboardRoutes.CREATE_GOAL} size="xl" className="w-full md:hidden">
				<Plus className="size-4" />
				Create Savings Goal
			</Button>
		</div>
	);
}
