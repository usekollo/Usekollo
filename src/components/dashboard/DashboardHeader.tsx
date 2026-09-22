"use client";

import { Bell, ChevronLeft, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletIcon from "@/components/icons/WalletIcon";
import ProfileAvatar from "./ProfileAvatar";
import { Input } from "@/components/ui/input";
import { useGoal, useDashboardSummary } from "@/features/dashboard/hooks";
import { useWalletConnection } from "@/features/profile/hooks";
import { pageRoutes } from "@/lib/config/routes";
import { formatAddress, formatMoney } from "@/lib/utils";

// On mobile, a bottom-nav tab's own root route (/dashboard, .../goals,
// .../activity, .../profile) always gets the normal logo/bell/avatar
// header — it's already a top-level destination, so there's nothing to go
// "back" from. Anything nested deeper than that (a sub route reached by
// drilling into something, not directly from the bottom nav) swaps to a
// centered-title bar with a back chevron instead. Desktop always keeps the
// normal header regardless of route.
const STATIC_MOBILE_SUB_ROUTE_HEADERS: Record<string, { title: string; backHref: string }> = {
	[pageRoutes.dashboardRoutes.CREATE_GOAL]: {
		title: "Create New Goal",
		backHref: pageRoutes.dashboardRoutes.SAVINGS_GOALS,
	},
};

const GOAL_DETAIL_PATTERN = /^\/dashboard\/goals\/([^/]+)$/;
const GOAL_ACTION_PATTERN = /^\/dashboard\/goals\/([^/]+)\/(add|withdraw)$/;
const GOAL_ACTION_TITLES: Record<string, string> = { add: "Add Savings", withdraw: "Withdraw" };

// The goal-scoped sub routes take an id, so their title/backHref can't live
// in the static map above — worked out from the pathname instead.
// `goalName` is only known once useGoal resolves; falls back to a plain
// "Goal" placeholder while loading.
function getMobileSubRouteHeader(pathname: string, goalName: string | undefined) {
	const actionMatch = pathname.match(GOAL_ACTION_PATTERN);
	if (actionMatch) {
		return {
			title: GOAL_ACTION_TITLES[actionMatch[2]],
			backHref: pageRoutes.dashboardRoutes.GOAL_DETAIL(actionMatch[1]),
		};
	}

	const detailMatch = pathname.match(GOAL_DETAIL_PATTERN);
	if (detailMatch && detailMatch[1] !== "new") {
		return { title: goalName ?? "Goal", backHref: pageRoutes.dashboardRoutes.SAVINGS_GOALS };
	}

	return STATIC_MOBILE_SUB_ROUTE_HEADERS[pathname];
}

// Desktop shows a search bar and a connected-wallet balance chip + avatar;
// mobile normally swaps that for a notification bell + profile icon (or,
// on the routes above, a close button + page title instead). No live
// wallet/notification data yet — the balance/address here are the same
// mock figures used throughout the landing page mockups, not a real
// connection. The avatar is the user's uploaded photo (see ProfileAvatar),
// falling back to a generic icon when they have not set one.
export default function DashboardHeader() {
	const pathname = usePathname();
	// Both are already cached by the dashboard pages, so the header chip reuses
	// them rather than issuing requests of its own.
	const { data: summary } = useDashboardSummary();
	const { data: wallet } = useWalletConnection();
	const detailMatch = pathname.match(GOAL_DETAIL_PATTERN);
	const goalId = detailMatch && detailMatch[1] !== "new" ? detailMatch[1] : undefined;
	const { data: goal } = useGoal(goalId);
	const subRouteHeader = getMobileSubRouteHeader(pathname, goal?.name);

	return (
		<header className="border-b border-border bg-background">
			<div className="px-4 py-4 md:px-8">
				{/* Desktop: always the normal header, regardless of route */}
				<div className="hidden items-center gap-4 md:flex">
					<Link
						href={pageRoutes.dashboardRoutes.DASHBOARD}
						className="flex shrink-0 items-center gap-2"
					>
						{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
						<img
							src="/images/logos/black-logo-icon.svg"
							alt=""
							width={271}
							height={267}
							className="h-8 w-auto"
						/>
						<span className="text-2xl font-medium lowercase tracking-tight text-foreground">
							usekollo
						</span>
					</Link>

					<span className="h-6 w-px shrink-0 bg-border" />

					<div className="flex-1">
						<div className="relative max-w-xl">
							<Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-grey-light-active" />
							<Input type="search" placeholder="Txn Hash or ID..." className="h-11 pl-11" />
						</div>
					</div>

					<div className="ml-auto flex items-center gap-3">
						<div className="flex items-center gap-2 rounded-full bg-grey-light py-1.5 pr-4 pl-1.5 text-sm">
							<span className="flex size-8 items-center justify-center rounded-md bg-grey-dark text-white">
								<WalletIcon className="size-4" />
							</span>
							<span className="font-semibold text-blue-darker">
								{formatMoney(summary?.balance ?? 0)} {summary?.currency ?? "XLM"}
							</span>
							<span className="h-4 w-px bg-grey-light-active" />
							<span className="text-grey-light-active">{formatAddress(wallet?.address)}</span>
						</div>
						<ProfileAvatar className="size-10" iconClassName="size-5" />
					</div>
				</div>

				{/* Mobile: back-chevron + title for sub routes, normal header for a tab's own root */}
				{subRouteHeader ? (
					<div className="flex items-center gap-4 md:hidden">
						<Link
							href={subRouteHeader.backHref}
							className="flex size-9 shrink-0 items-center justify-center rounded-full bg-grey-lighter text-foreground"
							aria-label="Back"
						>
							<ChevronLeft className="size-5" />
						</Link>
						<h1 className="flex-1 pr-9 text-center text-base font-medium text-foreground">
							{subRouteHeader.title}
						</h1>
					</div>
				) : (
					<div className="flex items-center gap-4 md:hidden">
						<Link
							href={pageRoutes.dashboardRoutes.DASHBOARD}
							className="flex shrink-0 items-center gap-2"
						>
							{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
							<img
								src="/images/logos/black-logo-icon.svg"
								alt=""
								width={271}
								height={267}
								className="h-7 w-auto"
							/>
							<span className="text-xl font-medium lowercase tracking-tight text-foreground">
								usekollo
							</span>
						</Link>

						<div className="ml-auto flex items-center gap-2">
							<span className="flex size-9 items-center justify-center rounded-full bg-blue-light text-primary">
								<Bell className="size-4" />
							</span>
							<ProfileAvatar className="size-9" iconClassName="size-4" />
						</div>
					</div>
				)}
			</div>
		</header>
	);
}
