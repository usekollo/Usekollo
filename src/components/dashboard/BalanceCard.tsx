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
	// "Total Balance" is the money currently saved *in the app* — the sum of
	// what each goal is holding in the contract — not the wallet balance.
	// `data.balance` is the wallet, which the header chip and the deposit cap
	// in TransactionFlow both need, so it stays as it is and is simply not
	// what this card headlines.
	//
	// Only goals denominated in the currency on the chip are counted. Goals
	// can be XLM or USDC, and adding those together would produce a number
	// that is not an amount of anything.
	const inCurrency = data.goals.filter((goal) => goal.currency === data.currency);
	const totalSaved = inCurrency.reduce((sum, goal) => sum + goal.saved, 0);
	const totalTarget = inCurrency.reduce((sum, goal) => sum + goal.target, 0);
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

			<p className="mt-2 text-4xl font-semibold md:text-5xl">{formatMoney(totalSaved)}</p>

			<div className="mt-5 h-1.5 rounded-full bg-white/25">
				<div className="h-1.5 rounded-full bg-white" style={{ width: `${progress}%` }} />
			</div>

			{/* Desktop-only — see file header comment */}
			<Button
				href={pageRoutes.dashboardRoutes.CREATE_GOAL}
				size="xl"
				variant="light"
				className="mt-6 hidden w-full md:flex"
			>
				<Plus className="size-4" />
				Create Savings Goal
			</Button>

			<div className="mt-4 flex items-center justify-between text-xs opacity-80">
				<span>Ongoing Goals</span>
				<span>
					{formatMoney(data.amountToNextGoal)} {data.currency} to Next Goal
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
			<Skeleton className="mt-6 hidden h-15 w-full rounded-full bg-white/20 md:block" />
			<div className="mt-4 flex items-center justify-between">
				<Skeleton className="h-3 w-20 bg-white/20" />
				<Skeleton className="h-3 w-24 bg-white/20" />
			</div>
		</div>
	);
}
