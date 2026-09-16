"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { fadeLeft, fadeRight, viewport } from "@/lib/utils/animations";

export default function FeatureIntro() {
	return (
		// <div id="features" className="custom-container grid gap-20 py-16 md:grid-cols-2 md:py-24">
		<div
			id="features"
			className="custom-container flex flex-col justify-between gap-8 overflow-x-hidden py-16 md:flex-row md:gap-28 md:py-24"
		>
			<motion.h2
				variants={fadeLeft}
				initial="hidden"
				whileInView="show"
				viewport={viewport}
				className="text-4xl leading-[1.1] font-medium text-[#212121] sm:text-5xl md:w-3/5"
			>
				Simple tools for intentional on-chain saving.
			</motion.h2>

			<motion.div
				variants={fadeRight}
				initial="hidden"
				whileInView="show"
				viewport={viewport}
				className="md:w-1/3 md:pt-1"
			>
				<p className="max-w-md text-base text-grey-normal">
					Everything you need to plan, allocate and follow through wrapped in a
					calm, focused interface.
				</p>
				<Button size="lg" className="mt-6 sm:w-60">
					Get Started
				</Button>
			</motion.div>
		</div>
	);
}
