"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";
import { useIsAuthenticated } from "@/lib/stores/userAuthStore";
import { fadeUp, staggerContainer, zoomIn } from "@/lib/utils/animations";
import WalletIcon from "@/components/icons/WalletIcon";

// Figma "Landing Page" hero (104-3807 desktop / 104-5087 mobile). The phone
// mockup is the actual exported Figma asset (public/images/hero-img.svg,
// background baked in), not redrawn. Above the fold, so this animates in on
// mount rather than waiting for scroll (see lib/utils/animations for the
// shared variants/timings reused across every landing section).
//
// `overflow-hidden` here isn't decorative — fadeUp/zoomIn animate in from a
// transformed (translated/scaled) "hidden" state, and a transformed
// descendant contributes to its ancestors' scrollable overflow even though
// it doesn't affect layout. Without a clipping boundary that phantom
// overflow bubbles all the way up to the document, showing a taller-than-
// real vertical scrollbar (and a scroll position that "settles" as each
// section's whileInView animation resolves) until every section has
// animated in once. See page.tsx's wrapper for the same fix applied
// site-wide, and FeatureCards.tsx/SiteFooter.tsx for the other two sections
// that needed it individually.
export default function HeroSection() {
	const isAuthenticated = useIsAuthenticated();

	return (
		<section className="overflow-hidden bg-grey-lighter">
			<div className="custom-container grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-28">
				<motion.div variants={staggerContainer} initial="hidden" animate="show">
					<motion.h1
						variants={fadeUp}
						className="text-4xl leading-[1.05] font-medium tracking-tight text-blue-darker sm:text-5xl"
					>
						Save with purpose.
						<br />
						&amp; Stay in control.
					</motion.h1>
					<motion.p
						variants={fadeUp}
						className="mt-5 max-w-md text-base text-[#010E52] sm:text-xl"
					>
						A non-custodial wallet interface that organizes your digital assets
						around the goals that matter.
					</motion.p>
					<motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
						{isAuthenticated ? (
							<Button
								href={pageRoutes.dashboardRoutes.DASHBOARD}
								size="xl"
								className="w-full sm:w-60"
							>
								<WalletIcon className="size-4 text-primary-foreground" />
								Go to Dashboard
							</Button>
						) : (
							<>
								<Button href={pageRoutes.authRoutes.SIGN_UP} size="xl" className="w-full sm:w-60">
									Get Started
								</Button>
								<Button
									href={pageRoutes.authRoutes.SIGN_IN}
									size="xl"
									variant="outline"
									className="w-full sm:w-60"
								>
									Sign In
								</Button>
							</>
						)}
					</motion.div>
				</motion.div>

				<motion.img
					variants={zoomIn}
					initial="hidden"
					animate="show"
					transition={{ delay: 0.2 }}
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
