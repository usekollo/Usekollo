"use client";

import { motion } from "framer-motion";
import { fadeUp, viewport } from "@/lib/utils/animations";

export default function SiteFooter() {
	return (
		<motion.footer
			variants={fadeUp}
			initial="hidden"
			whileInView="show"
			viewport={viewport}
			className="custom-container flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left"
		>
			<div className="flex items-center gap-2">
				{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
				<img
					src="/images/logos/black-logo-icon.svg"
					alt=""
					width={271}
					height={267}
					className="h-6 w-auto"
				/>
				<span className="text-lg font-medium lowercase tracking-tight text-foreground">
					usekollo
				</span>
			</div>

			<p className="max-w-sm text-xs text-grey-normal">
				Non-custodial savings infrastructure on Stellar Testnet. Your keys, your assets, your
				goals.
			</p>

			<p className="text-xs text-grey-normal">© {new Date().getFullYear()} UseKollo</p>
		</motion.footer>
	);
}
