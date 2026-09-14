import { Button } from "@/components/ui/button";

// Figma "Landing Page" hero (104-3807 desktop / 104-5087 mobile). The phone
// mockup is the actual exported Figma asset (public/images/hero-img.svg,
// background baked in), not redrawn — swapped in once it turned out the
// project already had it sitting in public/images/.
export default function HeroSection() {
	return (
		<section className="bg-grey-lighter">
			<div className="custom-container grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
				<div>
					<h1 className="text-4xl leading-tight font-semibold text-foreground sm:text-5xl">
						Save with purpose. &amp; Stay in control.
					</h1>
					<p className="mt-4 max-w-md text-base text-grey-normal">
						A non-custodial wallet interface that organizes your digital assets around the goals
						that matter.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Button size="lg">Connect Wallet</Button>
						<Button size="lg" variant="outline">
							See Docs
						</Button>
					</div>
				</div>

				{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
				<img
					src="/images/hero-img.svg"
					alt="Kollo app preview: total balance and ongoing savings goals"
					width={599}
					height={433}
					className="h-auto w-full max-w-lg justify-self-center"
				/>
			</div>
		</section>
	);
}
