import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Goal } from "@/features/dashboard/types";
import { pageRoutes } from "@/lib/config/routes";
import GoalCard, { GoalCardSkeleton } from "./GoalCard";

export default function OngoingGoalsSection({ goals }: { goals: Goal[] }) {
	return (
		<div>
			<div className="flex items-center justify-between text-xs font-medium text-grey-normal">
				<span>ONGOING GOALS ({goals.length})</span>
				<Link href={pageRoutes.dashboardRoutes.SAVINGS_GOALS} className="flex items-center gap-1 text-primary">
					SEE ALL <ExternalLink className="size-3" />
				</Link>
			</div>

			<div className="mt-3 space-y-3">
				{goals.map((goal) => (
					<GoalCard key={goal.id} goal={goal} href={pageRoutes.dashboardRoutes.GOAL_DETAIL(goal.id)} />
				))}
			</div>
		</div>
	);
}

export function OngoingGoalsSectionSkeleton() {
	return (
		<div>
			<div className="flex items-center justify-between text-xs font-medium text-grey-normal">
				<span>ONGOING GOALS</span>
				<span className="text-primary">SEE ALL</span>
			</div>

			<div className="mt-3 space-y-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<GoalCardSkeleton key={index} />
				))}
			</div>
		</div>
	);
}
