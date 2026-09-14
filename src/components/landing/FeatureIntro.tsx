import { Button } from "@/components/ui/button";

export default function FeatureIntro() {
	return (
		// <div id="features" className="custom-container grid gap-20 py-16 md:grid-cols-2 md:py-24">
		<div
			id="features"
			className="justify-between custom-container flex flex-col md:gap-28 py-16 md:py-24"
		>
			<h2 className="text-4xl leading-[1.1] font-medium text-[#212121] sm:text-5xl md:w-3/5 ">
				Simple tools for intentional on-chain saving.
			</h2>

			<div className="md:pt-1 md:w-1/3 max-md:mt-4">
				<p className="max-w-md text-base text-grey-normal">
					Everything you need to plan, allocate and follow through wrapped in a
					calm, focused interface.
				</p>
				<Button size="lg" className="mt-6">
					Get Started
				</Button>
			</div>
		</div>
	);
}
