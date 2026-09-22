"use client";

import { History, LayoutDashboard, Plus, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";
import { cn } from "@/lib/utils";

const navItems = [
	{ label: "Dashboard", href: pageRoutes.dashboardRoutes.DASHBOARD, icon: LayoutDashboard },
	{ label: "Savings Goals", href: pageRoutes.dashboardRoutes.SAVINGS_GOALS, icon: Target },
	{ label: "Activity Register", href: pageRoutes.dashboardRoutes.ACTIVITY, icon: History },
	{ label: "Profile Settings", href: pageRoutes.dashboardRoutes.PROFILE, icon: UserRound },
];

// Desktop-only (see DashboardBottomNav for the mobile equivalent). Stretches
// to the full height of the (non-scrolling) row it sits in — see
// dashboard/layout.tsx — so the "Create New Goal" button stays pinned at
// the bottom regardless of how tall `main` next to it is.
export default function DashboardSidebar() {
	const pathname = usePathname();

	return (
		<aside className="hidden shrink-0 lg:flex lg:h-full lg:w-64 lg:flex-col lg:rounded-3xl lg:bg-white lg:p-4 lg:shadow-xs">
			<nav className="flex flex-1 flex-col gap-1">
				{navItems.map(({ label, href, icon: Icon }) => {
					// "Dashboard" only matches the exact root; the rest also match
					// their own sub-routes (e.g. /dashboard/goals/new stays under
					// "Savings Goals").
					const active =
						href === pageRoutes.dashboardRoutes.DASHBOARD
							? pathname === href
							: pathname.startsWith(href);

					return (
						<Link
							key={label}
							href={href}
							className={cn(
								"flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
								active
									? "bg-blue-light text-primary"
									: "text-grey-light-active hover:bg-grey-lighter hover:text-grey-normal",
							)}
						>
							<Icon className="size-4" />
							{label}
						</Link>
					);
				})}
			</nav>

			<Button href={pageRoutes.dashboardRoutes.CREATE_GOAL} className="w-full">
				<Plus className="size-4" />
				Create New Goal
			</Button>
		</aside>
	);
}
