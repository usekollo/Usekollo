"use client";

import { ArrowLeft, Clock, ExternalLink, Plus, Target } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import GoalDetailRing from "@/components/dashboard/GoalDetailRing";
import WalletIcon from "@/components/icons/WalletIcon";
import { useGoal } from "@/features/dashboard/hooks";
import { GoalStatus } from "@/features/dashboard/types";
import { pageRoutes } from "@/lib/config/routes";
import { monthlyPace } from "@/lib/domain/pace";
import { useWalletConnection } from "@/features/profile/hooks";
import { cn, formatAddress, formatMoney, formatMonthYear } from "@/lib/utils";

const badgeClass: Record<GoalStatus, string> = {
	running: "bg-blue-light text-primary",
	urgent: "bg-red-100 text-destructive",
	done: "bg-blue-light text-primary",
};

function AmountSplit({
	value,
	size = "lg",
}: {
	value: number;
	size?: "lg" | "xl";
}) {
	const [whole, decimals] = formatMoney(value).split(".");
	return (
		<span className="flex items-baseline gap-0.5">
			<span
				className={cn(
					"font-semibold text-foreground",
					size === "xl" ? "text-4xl" : "text-3xl",
				)}
			>
				{whole}
			</span>
			<span className="text-sm text-grey-normal">.{decimals}</span>
		</span>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 py-4 text-sm">
			<span className="font-medium text-grey-normal uppercase tracking-wide text-xs">
				{label}
			</span>
			<span className="font-medium text-foreground uppercase">{value}</span>
		</div>
	);
}

function GoalActivityEmptyState() {
	return (
		<div className="mt-3 flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-xs md:bg-transparent md:shadow-none">
			<span className="flex size-12 items-center justify-center rounded-full bg-grey-lighter text-grey-dark">
				<Clock className="size-5" strokeWidth={1.5} />
			</span>
			<p className="mt-4 text-base font-medium text-foreground">
				No Activity Yet
			</p>
			<p className="mt-1 max-w-xs text-sm text-grey-normal">
				You haven&apos;t allocated any funds to specific saving targets yet.
				Goals help you organize your assets
			</p>
		</div>
	);
}

// Built from the pasted "Create New Goal" follow-up screenshots — the
// in-progress and 100%-complete variants of a single goal's detail page.
// Same data drives both; which one renders is purely `goal.status === "done"`
// (or saved >= target), not a separate route.
export default function GoalDetailView({ goalId }: { goalId: string }) {
	const { data: goal, isLoading } = useGoal(goalId);
	const { data: wallet } = useWalletConnection();

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:rounded-3xl md:bg-white md:p-8 md:shadow-xs">
					<Skeleton className="size-64 shrink-0 rounded-full md:size-48" />
					<div className="w-full space-y-3 md:flex-1">
						<Skeleton className="mx-auto h-6 w-40 md:mx-0" />
						<Skeleton className="mx-auto h-4 w-56 md:mx-0" />
					</div>
				</div>
			</div>
		);
	}

	if (!goal) {
		return (
			<div className="flex flex-col items-center px-4 py-16 text-center md:py-24">
				<span className="flex size-20 items-center justify-center rounded-full bg-grey-lighter text-grey-dark">
					<Target className="size-8" strokeWidth={1.5} />
				</span>
				<h1 className="mt-6 text-2xl font-medium text-foreground">
					Goal not found
				</h1>
				<p className="mt-2 max-w-sm text-sm text-grey-normal">
					This savings goal doesn&apos;t exist, or may have been removed.
				</p>
				<Button
					href={pageRoutes.dashboardRoutes.SAVINGS_GOALS}
					size="xl"
					className="mt-6"
				>
					Back to Savings Goals
				</Button>
			</div>
		);
	}

	const percent =
		goal.target > 0 ? Math.round((goal.saved / goal.target) * 100) : 0;
	const isDone = goal.status === "done" || goal.saved >= goal.target;
	// Withdrawing does not require the target to be met — the contract allows
	// any amount up to what the goal holds, and savings you cannot reach are
	// not savings. The only real precondition is that there is something in
	// there: an empty goal would fail on-chain with InsufficientBalance.
	const canWithdraw = goal.saved > 0;
	// What is still missing, spread over the months left until the target
	// date. Replaces a fixed `target / 10`, which ignored both the amount
	// already saved and when the goal was actually due.
	const pace = monthlyPace({
		target: goal.target,
		saved: goal.saved,
		targetDate: goal.targetDate,
	});
	const totalDisbursed = goal.totalDisbursed ?? goal.target;

	const ringContent = (
		<>
			<span className="text-xs font-medium tracking-wide text-grey-normal uppercase">
				Saved
			</span>
			<AmountSplit value={goal.saved} />
			<span className="mt-1 text-xs text-grey-normal">
				OF {formatMoney(goal.target)} {goal.currency}
			</span>
			<span
				className={cn(
					"mt-2 rounded-full px-3 py-1 text-[10px] font-medium",
					badgeClass[goal.status],
				)}
			>
				{percent}% DONE
			</span>
		</>
	);

	return (
		<div className="space-y-6">
			<div className="hidden items-center gap-2 text-sm text-grey-light-active md:flex">
				<Link
					href={pageRoutes.dashboardRoutes.DASHBOARD}
					className="flex items-center gap-2 hover:text-grey-normal"
				>
					<ArrowLeft className="size-4" /> Home
				</Link>
				<span>/</span>
				<span className="font-medium text-foreground">{goal.name}</span>
			</div>

			<div className="flex flex-col items-center text-center  md:flex-row md:items-center md:gap-8 md:rounded-3xl md:bg-white md:p-8 md:text-left md:shadow-xs">
				<GoalDetailRing percent={percent} status={goal.status}>
					{ringContent}
				</GoalDetailRing>

				{/* Mobile-only heading block under the ring */}
				<div className="mt-6 md:hidden">
					{isDone ? (
						<>
							<h1 className="text-2xl font-medium text-foreground">
								Goal Completed
							</h1>
							<p className="mt-2 max-w-xs text-sm text-grey-normal">
								You&apos;ve reached your target. Your funds are ready to
								withdraw whenever you&apos;re ready.
							</p>
						</>
					) : (
						<>
							<h1 className="text-2xl font-medium tracking-wide text-foreground uppercase">
								{goal.name}
							</h1>
							<p className="mt-2 text-sm text-grey-normal">
								GOAL: {formatMoney(goal.target)} {goal.currency} • DUE:{" "}
								{formatMonthYear(goal.targetDate)}
							</p>
						</>
					)}
				</div>

				{/* Desktop: stats column */}
				<div className="hidden flex-1 divide-y divide-border md:block">
					<div className="pb-5">
						<p className="text-xs font-medium tracking-wide text-grey-normal uppercase">
							{isDone ? "Goal Complete" : "Saved of Target"}
						</p>
						<p className="mt-2 flex items-baseline gap-2 text-4xl font-semibold text-foreground">
							${formatMoney(goal.saved)}
							<span className="text-base font-medium text-grey-normal">
								/ ${formatMoney(goal.target)}
							</span>
						</p>
					</div>
					<div className="grid grid-cols-2 gap-4 pt-5">
						<div>
							<p className="text-xs font-medium tracking-wide text-grey-normal uppercase">
								Monthly Pace
							</p>
							<p className="mt-1 text-lg font-medium text-foreground">
								{pace.complete ? "—" : `$${formatMoney(pace.amount)}`}
							</p>
							{/* The figure means little without its horizon: the same
							    amount is reassuring over a year and alarming over a
							    month. */}
							<p className="mt-0.5 text-xs text-grey-normal">
								{pace.complete
									? "Target reached"
									: pace.overdue
										? "Past due — full amount outstanding"
										: `over ${pace.monthsRemaining} month${pace.monthsRemaining === 1 ? "" : "s"}`}
							</p>
						</div>
						<div>
							<p className="text-xs font-medium tracking-wide text-grey-normal uppercase">
								Due Date
							</p>
							<p className="mt-1 text-lg font-medium text-foreground">
								{formatMonthYear(goal.targetDate)}
							</p>
						</div>
					</div>
				</div>

				{/* Desktop: quick actions column */}
				<div className="hidden w-1/3 shrink-0 space-y-3 md:block">
					<p className="text-xs font-medium tracking-wide text-grey-normal uppercase mb-7">
						Quick Actions
					</p>
					{isDone ? (
						<>
							<Button
								href={pageRoutes.dashboardRoutes.WITHDRAW(goal.id)}
								size="xl"
								className="w-full"
							>
								<WalletIcon className="size-4" />
								Withdraw
							</Button>
							<Button
								href={pageRoutes.dashboardRoutes.DASHBOARD}
								variant="outline"
								size="xl"
								className="w-full"
							>
								Back to Dashboard
								<ExternalLink className="size-4" />
							</Button>
						</>
					) : (
						<>
							<Button
								href={pageRoutes.dashboardRoutes.ADD_SAVINGS(goal.id)}
								size="xl"
								className="w-full"
							>
								<Plus className="size-4" />
								Add Savings
							</Button>
							{canWithdraw ? (
								<Button
									href={pageRoutes.dashboardRoutes.WITHDRAW(goal.id)}
									variant="outline"
									size="xl"
									className="w-full"
								>
									<WalletIcon className="size-4" />
									Withdraw
								</Button>
							) : (
								<Button variant="outline" size="xl" className="w-full" disabled>
									Withdraw
								</Button>
							)}
						</>
					)}
				</div>

				{/* Mobile-only actions */}
				<div className="mt-8 w-full space-y-3 md:hidden">
					{isDone ? (
						<Button
							href={pageRoutes.dashboardRoutes.WITHDRAW(goal.id)}
							size="xl"
							className="w-full"
						>
							<WalletIcon className="size-4" />
							Withdraw
						</Button>
					) : (
						<>
							<Button
								href={pageRoutes.dashboardRoutes.ADD_SAVINGS(goal.id)}
								size="xl"
								className="w-full"
							>
								<Plus className="size-4" />
								Add Savings
							</Button>
							{canWithdraw ? (
								<Button
									href={pageRoutes.dashboardRoutes.WITHDRAW(goal.id)}
									variant="outline"
									size="xl"
									className="w-full"
								>
									<WalletIcon className="size-4" />
									Withdraw
								</Button>
							) : (
								<Button variant="outline" size="xl" className="w-full" disabled>
									Withdraw
								</Button>
							)}
						</>
					)}
				</div>
			</div>

			{isDone ? (
				<div className="rounded-3xl bg-white md:p-8 md:shadow-xs">
					<div className="divide-y divide-border px-4 md:px-0">
						<DetailRow label="Target Name" value={goal.name} />
						<DetailRow label="Recipient Address" value={formatAddress(wallet?.address)} />
						<DetailRow
							label="Settlement Asset"
							value={`${goal.currency} (Native)`}
						/>
						<DetailRow
							label="Total Disbursed"
							value={`${formatMoney(totalDisbursed)} ${goal.currency}`}
						/>
					</div>
				</div>
			) : (
				<div>
					<div className="flex items-center justify-between text-xs font-medium text-grey-normal">
						<span>GOAL ACTIVITY</span>
						<span className="flex items-center gap-1 text-primary">
							SEE ALL <ExternalLink className="size-3" />
						</span>
					</div>
					<GoalActivityEmptyState />
				</div>
			)}
		</div>
	);
}
