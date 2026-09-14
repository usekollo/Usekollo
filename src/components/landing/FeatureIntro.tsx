import { Button } from "@/components/ui/button";

export default function FeatureIntro() {
	return (
		<div id="features" className="custom-container grid gap-8 py-16 md:grid-cols-2 md:py-24">
			<h2 className="text-3xl leading-tight font-semibold text-foreground sm:text-4xl">
				Simple tools for intentional on-chain saving.
			</h2>

			<div className="md:pt-1">
				<p className="max-w-md text-base text-grey-normal">
					Everything you need to plan, allocate and follow through wrapped in a calm, focused
					interface.
				</p>
				<Button size="lg" className="mt-6">
					Get Started
				</Button>
			</div>
		</div>
	);
}
