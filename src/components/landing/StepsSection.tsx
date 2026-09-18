"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";
import { useIsAuthenticated } from "@/lib/stores/userAuthStore";
import { fadeLeft, fadeRight, viewport } from "@/lib/utils/animations";

// Figma "Landing Page" steps section (104-3807 / 104-5087) — second phone
// mockup is the actual exported Figma asset (public/images/create-savings-img.svg).
export default function StepsSection() {
	const isAuthenticated = useIsAuthenticated();

	return (
		<section id="how-it-works" className="overflow-x-hidden bg-grey-lighter">
			<div className="custom-container grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
				<motion.div
					variants={fadeLeft}
					initial="hidden"
					whileInView="show"
					viewport={viewport}
				>
					<h2 className="text-4xl leading-[1.1] font-medium text-[#212121] sm:text-5xl">
						Create Your Savings goal, in three clear steps.
					</h2>
					<p className="mt-4 max-w-md text-base text-grey-normal">
						A non-custodial wallet interface that organizes your digital assets around the goals
						that matter.
					</p>
					<Button
						href={isAuthenticated ? pageRoutes.dashboardRoutes.DASHBOARD : pageRoutes.authRoutes.SIGN_UP}
						size="xl"
						variant="outline"
						className="mt-6 sm:w-60"
					>
						{isAuthenticated ? "Go to Dashboard" : "Get Started"}
					</Button>
				</motion.div>

				<motion.img
					variants={fadeRight}
					initial="hidden"
					whileInView="show"
					viewport={viewport}
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
