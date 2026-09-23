"use client";

import { ChevronDown, Clock, ExternalLink, Search } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActivityIcon, formatSignedAmount, statusBadge } from "@/components/dashboard/ActivitySection";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { ActivityStatus } from "@/features/dashboard/types";
import { assetsInFeed, filterActivity, type AssetFilter } from "@/lib/domain/activity-filter";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

// Pending is included here as well as in the mobile select. They disagreed
// before: a user could filter to Pending on a phone, widen the window, and
// land on a desktop bar where no pill matched the list they were looking at.
const STATUS_FILTERS: { label: string; value: ActivityStatus | "all" }[] = [
	{ label: "All", value: "all" },
	{ label: "Success", value: "success" },
	{ label: "Pending", value: "pending" },
	{ label: "Failed", value: "failed" },
];

// The full "Activity Register" — a searchable, filterable, paginated log,
// as opposed to the lightweight ActivitySection preview embedded on the
// Dashboard and Savings Goals pages (which link here via "SEE ALL"). Same
// underlying activity data and icon/badge language as that preview, reused
// via its exported helpers rather than redefined.
// useSearchParams forces this subtree to opt out of static prerendering, so
// it has to sit inside a Suspense boundary or the build fails. The fallback is
// the same skeleton the loading state already uses.
export default function ActivityPage() {
	return (
		<Suspense fallback={<ActivityPageSkeleton />}>
			<ActivityRegister />
		</Suspense>
	);
}

function ActivityPageSkeleton() {
	return (
		<div className="space-y-6">
			<Skeleton className="h-11 w-full rounded-full" />
			<div className="space-y-3">
				{Array.from({ length: 4 }).map((_, index) => (
					<Skeleton key={index} className="h-16 w-full rounded-2xl" />
				))}
			</div>
		</div>
	);
}

function ActivityRegister() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { data, isLoading } = useDashboardSummary();
	const [statusFilter, setStatusFilter] = useState<ActivityStatus | "all">("all");
	const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
	const [page, setPage] = useState(1);

	// The URL is the source of truth for the query, not local state. The
	// header carries its own search box on every dashboard page, and it hands
	// queries over through ?q= — with a second copy in local state the two
	// would drift apart the moment either one changed.
	const query = searchParams.get("q") ?? "";

	const setQuery = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value) params.set("q", value);
		else params.delete("q");

		// replace, not push: typing should not bury the previous page under a
		// history entry per keystroke. scroll:false keeps the list still.
		const search = params.toString();
		router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
		setPage(1);
	};

	const filtered = useMemo(
		() => (data ? filterActivity(data.activity, { query, status: statusFilter, asset: assetFilter }) : []),
		[data, query, statusFilter, assetFilter],
	);

	// Chips are built from the rows actually present, so none of them can be
	// selected only to show an empty list.
	const assets = useMemo(() => (data ? assetsInFeed(data.activity) : []), [data]);

	// Any narrowing can shorten the list past the current page; staying on
	// page 3 of a one-page result shows nothing at all.
	const narrow = <T,>(set: (value: T) => void) => (value: T) => {
		set(value);
		setPage(1);
	};

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	const changeStatus = narrow(setStatusFilter);

	if (isLoading) return <ActivityPageSkeleton />;

	if (!data || data.activity.length === 0) {
		return (
			<div className="flex flex-col items-center px-4 py-16 text-center lg:py-24">
				<span className="flex size-20 items-center justify-center rounded-full bg-grey-lighter text-grey-dark">
					<Clock className="size-8" strokeWidth={1.5} />
				</span>
				<h1 className="mt-6 text-2xl font-medium text-foreground lg:text-3xl">No Activity Yet</h1>
				<p className="mt-2 max-w-sm text-sm text-grey-normal">
					Your deposits, withdrawals, and transfers will show up here once you make one.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="hidden items-center gap-2 text-sm lg:flex">
				<span className="font-medium text-foreground">Activity</span>
			</div>

			{/* Mobile: status + month filter pills (month is decorative — no date
			    grouping model to back it yet) */}
			<div className="flex items-center gap-2 lg:hidden">
				<div className="relative">
					<select
						value={statusFilter}
						onChange={(event) => changeStatus(event.target.value as ActivityStatus | "all")}
						className="appearance-none rounded-full border border-border bg-white py-2 pr-9 pl-4 text-xs font-medium text-foreground outline-none"
					>
						<option value="all">All Statuses</option>
						<option value="success">Success</option>
						<option value="pending">Pending</option>
						<option value="failed">Failed</option>
					</select>
					<ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-grey-light-active" />
				</div>
				<span className="flex items-center gap-1 rounded-full border border-border bg-white px-4 py-2 text-xs font-medium text-foreground">
					By Month
					<ChevronDown className="size-3.5 text-grey-light-active" />
				</span>
			</div>

			{/* Desktop: search + status toggle + filter button */}
			<div className="hidden items-center gap-3 lg:flex">
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
					{STATUS_FILTERS.map(({ label, value }) => (
						<button
							key={value}
							type="button"
							onClick={() => changeStatus(value)}
							className={cn(
								"rounded-full px-4 py-1.5 transition-colors",
								statusFilter === value ? "bg-grey-dark text-white" : "text-grey-normal",
							)}
						>
							{label}
						</button>
					))}
				</div>
				{/* Replaces a "Filter" button that opened nothing. Asset is the one
				    axis the rows carry that status does not already cover. */}
				{assets.length > 1 && (
					<div className="flex shrink-0 items-center gap-1 rounded-full bg-grey-lighter p-1 text-sm font-medium">
						{(["all", ...assets] as AssetFilter[]).map((value) => (
							<button
								key={value}
								type="button"
								onClick={() => narrow(setAssetFilter)(value)}
								className={cn(
									"rounded-full px-4 py-1.5 transition-colors",
									assetFilter === value ? "bg-grey-dark text-white" : "text-grey-normal",
								)}
							>
								{value === "all" ? "All assets" : value}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Mobile: plain divided list, not individual cards */}
			<div className="divide-y divide-border rounded-3xl bg-white lg:hidden">
				{filtered.map((item) => (
					<div key={item.id} className="flex items-center gap-3 px-4 py-4">
						<ActivityIcon item={item} />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-foreground">{item.operation}</p>
							<p className="text-xs text-grey-light-active">{item.dateTime}</p>
						</div>
					</div>
				))}
			</div>

			{/* Desktop table + pagination */}
			<div className="hidden lg:block">
				<table className="w-full text-left text-sm">
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
						{pageItems.map((item) => (
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
								<td className="py-4 text-right font-medium text-primary">{formatSignedAmount(item)}</td>
								<td className="py-4 text-center">
									<span className={cn("rounded-full px-3 py-1 text-xs font-medium", statusBadge[item.status])}>
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

				<div className="mt-4 flex items-center justify-between text-sm text-grey-normal">
					<span>
						Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{" "}
						{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} transactions
					</span>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setPage((prev) => Math.max(1, prev - 1))}
							disabled={currentPage === 1}
							className="flex size-8 items-center justify-center rounded-full text-grey-normal hover:bg-grey-lighter disabled:pointer-events-none disabled:opacity-40"
							aria-label="Previous page"
						>
							‹
						</button>
						{Array.from({ length: totalPages }).map((_, index) => (
							<button
								key={index}
								type="button"
								onClick={() => setPage(index + 1)}
								className={cn(
									"flex size-8 items-center justify-center rounded-full font-medium",
									currentPage === index + 1 ? "bg-grey-dark text-white" : "text-grey-normal hover:bg-grey-lighter",
								)}
							>
								{index + 1}
							</button>
						))}
						<button
							type="button"
							onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
							disabled={currentPage === totalPages}
							className="flex size-8 items-center justify-center rounded-full text-grey-normal hover:bg-grey-lighter disabled:pointer-events-none disabled:opacity-40"
							aria-label="Next page"
						>
							›
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
