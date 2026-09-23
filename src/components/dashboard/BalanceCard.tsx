"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
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
//
// The currency pill used to be a plain span with a chevron drawn next to it:
// it looked like a picker, and clicking it did nothing. The whole summary was
// pinned to `data.currency`, which the server hardcodes to PRIMARY_ASSET_CODE
// ("XLM"), so a USDC holder had no way to see any USDC figure at all. The data
// was already being fetched — `balances` is keyed by the server's asset
// registry and every supported asset is read (see domain/dashboard) — so this
// is a picker over data that was arriving and being discarded.
export default function BalanceCard({ data }: { data: DashboardSummary }) {
	const [picked, setPicked] = useState(data.currency);

	// Driven off the payload rather than a literal ["XLM", "USDC"], so adding a
	// third asset to the registry surfaces it here with no change to this file.
	const currencies = useMemo(() => {
		const codes = Object.keys(data.balances);
		return codes.length > 0 ? codes : [data.currency];
	}, [data.balances, data.currency]);

	// A summary built before a wallet is connected carries no balances at all
	// (see emptySummary), and the picked code can outlive a payload that no
	// longer lists it — either would leave the pill naming an asset that
	// nothing below it is actually filtered by.
	const currency = currencies.includes(picked) ? picked : currencies[0];

	// "Total Balance" is the money currently saved *in the app* — the sum of
	// what each goal is holding in the contract — not the wallet balance, which
	// is the line below and what TransactionFlow caps deposits against.
	//
	// Only goals denominated in the selected currency are counted. Goals can be
	// XLM or USDC, and adding those together would produce a number that is not
	// an amount of anything.
	const { totalSaved, progress, toNextGoal } = useMemo(() => {
		const inCurrency = data.goals.filter((goal) => goal.currency === currency);
		const saved = inCurrency.reduce((sum, goal) => sum + goal.saved, 0);
		const target = inCurrency.reduce((sum, goal) => sum + goal.target, 0);

		// Same rule as domain/mappers' amountToNextGoal, but scoped to the
		// selected currency — the server computes it across every goal at once,
		// so a min() over mixed XLM and USDC targets is not an amount either.
		// Not imported from there: mappers pulls in stellar/config, which is
		// server-only and reads getEnv().
		const outstanding = inCurrency
			.filter((goal) => goal.status !== "done" && goal.target > goal.saved)
			.map((goal) => goal.target - goal.saved);

		return {
			totalSaved: saved,
			progress: target > 0 ? Math.min(100, (saved / target) * 100) : 0,
			toNextGoal: outstanding.length > 0 ? Math.min(...outstanding) : 0,
		};
	}, [data.goals, currency]);

	// `available` is false when the account holds no trustline for this asset.
	// Rendering that as a bare 0.00 is how someone concludes their money is
	// missing, when the real answer is that the account cannot hold it yet.
	const wallet = data.balances[currency];
	const needsTrustline = wallet !== undefined && !wallet.available;

	return (
		<div className="rounded-3xl bg-primary p-6 text-primary-foreground">
			<div className="flex items-center justify-between text-xs font-medium tracking-wide uppercase opacity-80">
				<span>Total Balance</span>

				<Menu.Root>
					<Menu.Trigger
						className="flex items-center gap-1 rounded-full bg-blue-darker/50 px-3 py-1.5 text-xs font-medium normal-case transition-colors hover:bg-blue-darker/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						aria-label={`Currency: ${currency}. Change currency`}
					>
						{currency}
						<ChevronDown className="size-3.5 transition-transform data-popup-open:rotate-180" />
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Positioner sideOffset={8} align="end" className="z-50">
							<Menu.Popup className="min-w-32 rounded-2xl border border-border bg-background p-1 shadow-lg outline-none">
								<Menu.RadioGroup value={currency} onValueChange={(value) => setPicked(String(value))}>
									{currencies.map((code) => (
										<Menu.RadioItem
											key={code}
											value={code}
											className="flex cursor-default items-center justify-between gap-6 rounded-xl px-3 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-grey-lighter"
										>
											{code}
											<Menu.RadioItemIndicator>
												<Check className="size-4 text-primary" />
											</Menu.RadioItemIndicator>
										</Menu.RadioItem>
									))}
								</Menu.RadioGroup>
							</Menu.Popup>
						</Menu.Positioner>
					</Menu.Portal>
				</Menu.Root>
			</div>

			<p className="mt-2 text-4xl font-semibold lg:text-5xl">{formatMoney(totalSaved)}</p>

			<p className="mt-1 text-xs opacity-80">
				{needsTrustline
					? `No ${currency} trustline on this wallet yet`
					: `${formatMoney(wallet?.amount ?? 0)} ${currency} in wallet`}
			</p>

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
					{formatMoney(toNextGoal)} {currency} to Next Goal
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
			<Skeleton className="mt-2 h-3 w-32 bg-white/20" />
			<Skeleton className="mt-6 h-1.5 w-full bg-white/20" />
			<Skeleton className="mt-6 hidden h-15 w-full rounded-full bg-white/20 lg:block" />
			<div className="mt-4 flex items-center justify-between">
				<Skeleton className="h-3 w-20 bg-white/20" />
				<Skeleton className="h-3 w-24 bg-white/20" />
			</div>
		</div>
	);
}
