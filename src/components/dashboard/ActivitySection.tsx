"use client";

import { ArrowDownLeft, ArrowUpRight, Clock, ExternalLink, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityItem, ActivityStatus } from "@/features/dashboard/types";
import { useMemo, useState } from "react";
import { filterActivity } from "@/lib/domain/activity-filter";
import { cn, formatMoney } from "@/lib/utils";

const STATUS_TABS: { label: string; value: ActivityStatus | "all" }[] = [
	{ label: "All", value: "all" },
	{ label: "Success", value: "success" },
	{ label: "Pending", value: "pending" },
	{ label: "Failed", value: "failed" },
];

export const statusBadge: Record<ActivityStatus, string> = {
	success: "bg-blue-light text-primary",
	pending: "bg-amber-100 text-amber-600",
	failed: "bg-red-100 text-destructive",
};

// Exported so the full Activity Register page can reuse the same
// status/direction → icon mapping instead of redefining it.
export function ActivityIcon({ item }: { item: ActivityItem }) {
	if (item.status === "failed") {
		return (
			<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-destructive">
				<X className="size-4" />
			</span>
		);
	}
	if (item.status === "pending") {
		return (
			<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
				<Clock className="size-4" />
			</span>
		);
	}
	return item.direction === "in" ? (
		<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-light text-primary">
			<ArrowDownLeft className="size-4" />
		</span>
	) : (
		<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-grey-light text-grey-normal">
			<ArrowUpRight className="size-4" />
		</span>
	);
}

export function formatSignedAmount(item: ActivityItem) {
	const sign = item.direction === "in" ? "+" : "-";
	return `${sign}${formatMoney(item.amount)} ${item.currency}`;
}

// Built from the pasted "populated dashboard" screenshots — mobile shows a
// simple icon/title/date list, desktop a full table with a search + status
// filter bar above it (not wired to real filtering yet). Same underlying
// data either way. `hideHeading` drops the "ACTIVITY / SEE ALL" row for
// pages (like the Savings Goals listing) that already have their own
// heading above where this gets embedded.
export default function ActivitySection({
	activity,
	hideHeading = false,
}: {
	activity: ActivityItem[];
	hideHeading?: boolean;
}) {
	// The search and status controls below are desktop-only, so on mobile
	// these stay at their defaults and `visible` is simply the full list.
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<ActivityStatus | "all">("all");

	const visible = useMemo(
		() => filterActivity(activity, { query, status }),
		[activity, query, status],
	);

	return (
		<div>
			{!hideHeading && (
				<div className="flex items-center justify-between text-xs font-medium text-grey-normal">
					<span>ACTIVITY</span>
					<span className="flex items-center gap-1 text-primary">
						SEE ALL <ExternalLink className="size-3" />
					</span>
				</div>
			)}

			{/* Mobile: card list */}
			<div className="mt-3 space-y-3 md:hidden">
				{activity.map((item) => (
					<div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xs">
						<ActivityIcon item={item} />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-foreground">{item.operation}</p>
							<p className="text-xs text-grey-light-active">{item.dateTime}</p>
						</div>
					</div>
				))}
			</div>

			{/* Desktop: search/filter bar + table */}
			<div className="mt-3 hidden lg:block">
				<div className="flex items-center gap-3">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-grey-light-active" />
						<Input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search hash, type, or asset..."
							className="h-11 pl-11"
						/>
					</div>
					<div className="flex shrink-0 items-center gap-1 rounded-full bg-grey-lighter p-1 text-sm font-medium">
						{STATUS_TABS.map(({ label, value }) => (
							<button
								key={value}
								type="button"
								onClick={() => setStatus(value)}
								className={cn(
									"rounded-full px-4 py-1.5 transition-colors",
									status === value ? "bg-grey-dark text-white" : "text-grey-normal",
								)}
							>
								{label}
							</button>
						))}
					</div>
				</div>

				<table className="mt-4 w-full text-left text-sm">
					<thead>
						<tr className="text-xs font-medium text-grey-light-active">
							<th className="pb-3 font-medium">Tx / Hash</th>
							<th className="pb-3 font-medium">Operation</th>
							<th className="pb-3 font-medium">Date / Time</th>
							<th className="pb-3 text-right font-medium">Amount</th>
							<th className="pb-3 text-center font-medium">Status</th>
							<th className="pb-3 font-medium">
								<span className="sr-only">Action</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{visible.map((item) => (
							<tr key={item.id} className="border-t border-border">
								<td className="py-4">
									<span className="flex items-center gap-2">
										<span
											className={cn(
												"size-2 shrink-0 rounded-full",
												item.status === "failed" ? "bg-destructive" : "bg-primary",
											)}
										/>
										{item.hash}
									</span>
								</td>
								<td className="py-4">{item.operation}</td>
								<td className="py-4 text-grey-normal">{item.dateTime}</td>
								<td className="py-4 text-right font-medium text-primary">
									{formatSignedAmount(item)}
								</td>
								<td className="py-4 text-center">
									<span
										className={cn(
											"rounded-full px-3 py-1 text-xs font-medium",
											statusBadge[item.status],
										)}
									>
										{item.status.toUpperCase()}
									</span>
								</td>
								<td className="py-4 text-right">
									<button
										type="button"
										className="text-grey-light-active hover:text-grey-normal"
										aria-label="View transaction"
									>
										<ExternalLink className="size-4" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export function ActivitySectionSkeleton() {
	return (
		<div>
			<div className="flex items-center justify-between text-xs font-medium text-grey-normal">
				<span>ACTIVITY</span>
				<span className="text-primary">SEE ALL</span>
			</div>

			{/* Mobile */}
			<div className="mt-3 space-y-3 lg:hidden">
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xs">
						<Skeleton className="size-9 shrink-0 rounded-full" />
						<div className="min-w-0 flex-1 space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
				))}
			</div>

			{/* Desktop */}
			<div className="mt-3 hidden lg:block">
				<div className="flex items-center gap-3">
					<Skeleton className="h-11 flex-1 rounded-full" />
					<Skeleton className="h-11 w-48 rounded-full" />
					<Skeleton className="h-11 w-28 rounded-full" />
				</div>
				<div className="mt-6 space-y-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton key={index} className="h-6 w-full" />
					))}
				</div>
			</div>
		</div>
	);
}
