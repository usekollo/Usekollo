import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSummary } from "@/features/dashboard/types";
import { pageRoutes } from "@/lib/config/routes";
import { formatMoney } from "@/lib/utils";

// Built from the pasted "populated dashboard" screenshots. The
// "+ Create Savings Goal" button lives inside this card on desktop but sits
// on its own further down the page on mobile (see dashboard/page.tsx) —
// same button, just two render sites toggled per breakpoint rather than
// portalled, since that's simplest here.
export default function BalanceCard({ data }: { data: DashboardSummary }) {
	const totalSaved = data.goals.reduce((sum, goal) => sum + goal.saved, 0);
	const totalTarget = data.goals.reduce((sum, goal) => sum + goal.target, 0);
	const progress = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

	return (
		<div className="rounded-3xl bg-primary p-6 text-primary-foreground">
			<div className="flex items-center justify-between text-xs font-medium tracking-wide uppercase opacity-80">
				<span>Total Balance</span>
				<span className="flex items-center gap-1 rounded-full bg-blue-darker/50 px-3 py-1.5 text-xs font-medium normal-case">
					{data.currency}
					<ChevronDown className="size-3.5" />
				</span>
			</div>

			<p className="mt-2 text-4xl font-semibold lg:text-5xl">{formatMoney(data.balance)}</p>

			<div className="mt-5 h-1.5 rounded-full bg-white/25">
				<div className="h-1.5 rounded-full bg-white" style={{ width: `${progress}%` }} />
			</div>

			{/* Desktop-only — see file header comment */}
			<Button
				href={pageRoutes.dashboardRoutes.CREATE_GOAL}
				size="xl"
				variant="light"
				className="mt-6 hidden w-full lg:flex"
			>
				<Plus className="size-4" />
				Create Savings Goal
			</Button>

			<div className="mt-4 flex items-center justify-between text-xs opacity-80">
				<span>Ongoing Goals</span>
				<span>
					${formatMoney(data.amountToNextGoal)} to Next Goal
				</span>
			</div>
		</div>
	);
}

export function BalanceCardSkeleton() {
	return (
		<div className="rounded-3xl bg-primary p-6">
			<div className="flex items-center justify-between">
				<Skeleton className="h-3 w-24 bg-white/20" />
				<Skeleton className="h-7 w-16 rounded-full bg-white/20" />
			</div>
			<Skeleton className="mt-3 h-10 w-40 bg-white/20" />
			<Skeleton className="mt-6 h-1.5 w-full bg-white/20" />
			<Skeleton className="mt-6 hidden h-15 w-full rounded-full bg-white/20 lg:block" />
			<div className="mt-4 flex items-center justify-between">
				<Skeleton className="h-3 w-20 bg-white/20" />
				<Skeleton className="h-3 w-24 bg-white/20" />
			</div>
		</div>
	);
}
