import type { Metadata } from "next";
import type { ReactNode } from "react";
import DashboardBottomNav from "@/components/dashboard/DashboardBottomNav";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

// dashboard/page.tsx is a Client Component (it reads useDashboardSummary),
// so it can't export its own `metadata` — this layout carries it instead.
export const metadata: Metadata = {
	title: "Dashboard",
};

// Built from the pasted "Dashboard" screenshot (desktop + mobile). Desktop:
// header, then a light-grey page holding a sidebar card + a white main
// content card side by side. Mobile: header, then plain white content
// (no card chrome), with a fixed bottom tab bar instead of the sidebar.
//
// App-shell layout: the whole thing is pinned to exactly one viewport
// height (`h-screen` + `overflow-hidden`) — header and sidebar/bottom nav
// never scroll, only `main` does (`overflow-y-auto`), same as most
// dashboard apps.
export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-screen flex-col overflow-hidden bg-background lg:bg-grey-lighter">
			<DashboardHeader />

			<div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-6 lg:px-8 lg:py-6">
				<DashboardSidebar />

				<main className="flex-1 overflow-y-auto px-4 pt-6 pb-20 lg:rounded-3xl lg:bg-white lg:p-8 lg:shadow-xs">
					{children}
				</main>
			</div>

			<DashboardBottomNav />
		</div>
	);
}
