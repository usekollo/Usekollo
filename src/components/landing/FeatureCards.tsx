import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WalletIcon from "./WalletIcon";

function CardShell({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col justify-between gap-6 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8",
				className,
			)}
		>
			<div>
				<span className="inline-flex size-9 items-center justify-center rounded-full bg-white/15">
					<WalletIcon className="size-4 text-white" />
				</span>
				<h3 className="mt-5 text-xl font-semibold">{title}</h3>
				<p className="mt-2 text-sm opacity-85">{description}</p>
			</div>
			{children}
		</div>
	);
}

function WideCardShell({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-6 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8 md:flex-row md:items-center">
			<div className="md:w-2/5 md:shrink-0">
				<span className="inline-flex size-9 items-center justify-center rounded-full bg-white/15">
					<WalletIcon className="size-4 text-white" />
				</span>
				<h3 className="mt-5 text-xl font-semibold">{title}</h3>
				<p className="mt-2 text-sm opacity-85">{description}</p>
			</div>
			<div className="md:flex-1">{children}</div>
		</div>
	);
}

// Figma "Landing Page" feature cards (104-3807 / 104-5087): on desktop, a
// narrower "Stay in control" card (icon/title/desc stacked above its mock,
// same as mobile) sits beside a wider column — 1fr/2fr, not an even split —
// holding "Goals With Clarity" and "Progress you can see", each laid out
// icon/title/desc beside its mock instead of above it. All three stack the
// same way (vertically, full width) on mobile. The mock content in each
// card is the actual exported Figma asset (public/images/*-img.svg,
// background baked in); the badge icon is the same wallet glyph on all
// three cards, per Figma.
export default function FeatureCards() {
	return (
		<div className="custom-container grid gap-6 pb-16 md:grid-cols-[1fr_2fr] md:pb-24">
			<CardShell
				title="Stay in control"
				description="All you do is connect your Stellar Testnet wallet. UseKollo will never take custody of your assets."
			>
				{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
				<img
					src="/images/stay-in-control-img.svg"
					alt="Add Savings and Withdraw actions with recent goal activity"
					width={369}
					height={323}
					className="h-auto w-full"
				/>
			</CardShell>

			<div className="flex flex-col gap-6">
				<WideCardShell
					title="Goals With Clarity"
					description="Choose an asset, amount and target date, then allocate at your own pace, and watch it grow."
				>
					{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
					<img
						src="/images/goals-with-clarity-img.svg"
						alt="Ongoing savings goals with progress and status"
						width={403}
						height={229}
						className="h-auto w-full"
					/>
				</WideCardShell>

				<WideCardShell
					title="Progress you can see"
					description="Track every contribution and withdrawal with a transparent activity timeline you understand."
				>
					<div>
						{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
						<img
							src="/images/progress-you-can-see-img.svg"
							alt="New Laptop goal progress: 250 of 500 USDC, 50% done"
							width={403}
							height={229}
							className="h-auto w-full"
						/>
						<div className="mt-4 space-y-2">
							<Button size="lg" className="w-full">
								<Plus className="size-4" />
								Add Savings
							</Button>
							<Button size="lg" variant="outline" className="w-full border-grey-light-active">
								Withdraw
							</Button>
						</div>
					</div>
				</WideCardShell>
			</div>
		</div>
	);
}
