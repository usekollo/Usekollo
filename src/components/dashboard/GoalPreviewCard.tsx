import { cn, formatMoney } from "@/lib/utils";

function formatTargetDate(value: string) {
	if (!value) return "--/--/----";
	const [year, month, day] = value.split("-");
	if (!year || !month || !day) return "--/--/----";
	return `${day}/${month}/${year}`;
}

// The live-updating preview shown while creating a goal — blue, no name
// heading on mobile; a plain white card with the name as its own heading
// (plus dividers between sections) on desktop. Same data either way, just
// re-themed per breakpoint since that's simpler than two components.
export default function GoalPreviewCard({
	name,
	targetAmount,
	asset,
	targetDate,
}: {
	name: string;
	targetAmount: string;
	asset: string;
	targetDate: string;
}) {
	const displayAmount = formatMoney(targetAmount || 0);

	return (
		<div className="rounded-3xl bg-primary p-6 text-primary-foreground md:divide-y md:divide-border md:rounded-3xl md:bg-white md:p-0 md:text-foreground">
			<div className="hidden md:block md:px-6 md:py-5">
				<h2 className="text-lg font-medium">{name || "Untitled Goal"}</h2>
			</div>

			<div className="md:px-6 md:py-5">
				<p className="text-xs font-medium tracking-wide uppercase opacity-80 md:text-grey-normal md:opacity-100">
					Target Amount
				</p>
				<p className="mt-2 flex items-baseline gap-2 text-4xl font-semibold">
					{displayAmount}
					<span className="text-base font-medium opacity-80 md:text-grey-normal md:opacity-100">
						{asset || "USDC"}
					</span>
				</p>
			</div>

			<div
				className={cn(
					"mt-5 flex items-center justify-between md:mt-0 md:px-6 md:py-5",
				)}
			>
				<div>
					<p className="text-xs font-medium tracking-wide uppercase opacity-80 md:text-grey-normal md:opacity-100">
						Target Date
					</p>
					<p className="mt-1 text-sm">{formatTargetDate(targetDate)}</p>
				</div>
				<span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium md:bg-blue-light md:text-primary">
					DRAFT
				</span>
			</div>
		</div>
	);
}
