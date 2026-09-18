"use client";

import { History, LayoutDashboard, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { pageRoutes } from "@/lib/config/routes";
import { cn } from "@/lib/utils";

const navItems = [
	{ label: "Home", href: pageRoutes.dashboardRoutes.DASHBOARD, icon: LayoutDashboard },
	{ label: "Goals", href: pageRoutes.dashboardRoutes.SAVINGS_GOALS, icon: Target },
	{ label: "Activity", href: pageRoutes.dashboardRoutes.ACTIVITY, icon: History },
	{ label: "Profile", href: pageRoutes.dashboardRoutes.PROFILE, icon: UserRound },
];

// Mobile-only stand-in for DashboardSidebar — fixed to the bottom of the
// viewport, so pages render with matching bottom padding to keep content
// from sliding under it.
export default function DashboardBottomNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background py-2 md:hidden">
			{navItems.map(({ label, href, icon: Icon }) => {
				const active =
					href === pageRoutes.dashboardRoutes.DASHBOARD
						? pathname === href
						: pathname.startsWith(href);

				return (
					<Link
						key={label}
						href={href}
						className={cn(
							"flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs font-medium",
							active ? "bg-blue-light text-primary" : "text-grey-light-active",
						)}
					>
						<Icon className="size-5" />
						{label}
					</Link>
				);
			})}
		</nav>
	);
}
