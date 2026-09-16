import { Check } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Goal, GoalStatus } from "@/features/dashboard/types";
import { cn, formatMoney } from "@/lib/utils";

const statusConfig: Record<GoalStatus, { label: string; badgeClassName: string; ringColor: string }> = {
	running: { label: "RUNNING", badgeClassName: "bg-blue-light text-primary", ringColor: "var(--blue-normal)" },
	urgent: {
		label: "URGENT",
		badgeClassName: "bg-red-100 text-destructive",
		ringColor: "var(--destructive)",
	},
	done: { label: "DONE", badgeClassName: "bg-blue-light text-primary", ringColor: "var(--blue-normal)" },
};

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function GoalRing({ percent, status }: { percent: number; status: GoalStatus }) {
	const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;

	return (
		<div className="relative flex size-9 shrink-0 items-center justify-center">
			<svg viewBox="0 0 36 36" className="size-9 -rotate-90">
				<circle cx="18" cy="18" r={RADIUS} fill="none" stroke="var(--grey-light)" strokeWidth="3" />
				<circle
					cx="18"
					cy="18"
					r={RADIUS}
					fill="none"
					stroke={statusConfig[status].ringColor}
					strokeWidth="3"
					strokeLinecap="round"
					strokeDasharray={CIRCUMFERENCE}
					strokeDashoffset={offset}
				/>
			</svg>
			{status === "done" ? (
				<Check className="absolute size-3.5 text-primary" strokeWidth={3} />
			) : (
				<span className="absolute text-[9px] font-semibold text-foreground">{percent}%</span>
			)}
		</div>
	);
}

// `href`, when passed, makes the whole row a link to that goal's detail
// page — optional so this still works unlinked wherever a plain summary
// row is enough.
export default function GoalCard({ goal, href }: { goal: Goal; href?: string }) {
	const percent = Math.round((goal.saved / goal.target) * 100);

	const content = (
		<>
			<GoalRing percent={percent} status={goal.status} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{goal.name}</p>
				<p className="text-xs text-grey-normal">
					{formatMoney(goal.saved)} / {formatMoney(goal.target)} {goal.currency}
				</p>
			</div>
			<span
				className={cn(
					"shrink-0 rounded-full px-3 py-1 text-xs font-medium",
					statusConfig[goal.status].badgeClassName,
				)}
			>
				{statusConfig[goal.status].label}
			</span>
		</>
	);

	const className = "flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xs";

	if (href) {
		return (
			<Link href={href} className={cn(className, "transition-opacity hover:opacity-80")}>
				{content}
			</Link>
		);
	}

	return <div className={className}>{content}</div>;
}

export function GoalCardSkeleton() {
	return (
		<div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xs">
			<Skeleton className="size-9 shrink-0 rounded-full" />
			<div className="min-w-0 flex-1 space-y-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-3 w-32" />
			</div>
			<Skeleton className="h-6 w-16 shrink-0 rounded-full" />
		</div>
	);
}
