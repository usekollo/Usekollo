import { Button } from "@/components/ui/button";

// Figma "Landing Page" steps section (104-3807 / 104-5087) — second phone
// mockup is the actual exported Figma asset (public/images/create-savings-img.svg).
export default function StepsSection() {
	return (
		<section id="how-it-works" className="bg-grey-lighter">
			<div className="custom-container grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
				<div>
					<h2 className="text-3xl leading-tight font-semibold text-foreground sm:text-4xl">
						Create Your Savings goal, in three clear steps.
					</h2>
					<p className="mt-4 max-w-md text-base text-grey-normal">
						A non-custodial wallet interface that organizes your digital assets around the goals
						that matter.
					</p>
					<Button size="lg" variant="outline" className="mt-6">
						See Docs
					</Button>
				</div>

				{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
				<img
					src="/images/create-savings-img.svg"
					alt="Kollo goal completed and transfer confirmation screens"
					width={599}
					height={433}
					className="h-auto w-full max-w-lg justify-self-center"
				/>
			</div>
		</section>
	);
}
