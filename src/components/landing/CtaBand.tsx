"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";
import { useIsAuthenticated } from "@/lib/stores/userAuthStore";
import { staggerContainer, viewport, zoomIn } from "@/lib/utils/animations";
import WalletIcon from "@/components/icons/WalletIcon";

export default function CtaBand() {
	const isAuthenticated = useIsAuthenticated();

	return (
		// The blue block is inset from the viewport edges (not full-bleed) and
		// rounded — `custom-container` gives it that side padding/max-width,
		// same as every other section, while the section itself just adds the
		// vertical breathing room around it.
		<section className="py-16 sm:py-24">
			<div className="custom-container">
				<motion.div
					variants={staggerContainer}
					initial="hidden"
					whileInView="show"
					viewport={viewport}
					className="overflow-hidden rounded-[30px] bg-primary px-6 py-20 text-center text-primary-foreground sm:py-28"
				>
					<motion.h2 variants={zoomIn} className="text-3xl leading-tight font-medium sm:text-5xl">
						Make progress without giving up control.
					</motion.h2>
					<motion.p
						variants={zoomIn}
						className="mx-auto mt-4 max-w-md text-sm opacity-85 sm:text-lg"
					>
						{isAuthenticated
							? "Jump back into your dashboard and keep your next milestone moving."
							: "Create your free account and turn your next milestone into a plan you can see."}
					</motion.p>
					<motion.div
						variants={zoomIn}
						className="mt-8 flex flex-wrap items-center justify-center gap-3"
					>
						{isAuthenticated ? (
							<Button
								href={pageRoutes.dashboardRoutes.DASHBOARD}
								size="lg"
								variant="light"
								className="sm:w-60"
							>
								<WalletIcon className="size-4" />
								Go to Dashboard
							</Button>
						) : (
							<>
								<Button href={pageRoutes.authRoutes.SIGN_UP} size="lg" variant="light" className="sm:w-60">
									Get Started
								</Button>
								<Button
									href={pageRoutes.authRoutes.SIGN_IN}
									size="lg"
									variant="outline"
									className="border-white/40 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-60"
								>
									Sign In
								</Button>
							</>
						)}
					</motion.div>
				</motion.div>
			</div>
		</section>
	);
}
