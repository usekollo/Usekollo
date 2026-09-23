"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";
import { useIsAuthenticated } from "@/lib/stores/userAuthStore";
import WalletIcon from "@/components/icons/WalletIcon";

// No docs site yet, so no "Documentation" link — just the two sections
// this same page actually has.
const navLinks = [
	{ label: "Product", href: "#features" },
	{ label: "How it Works", href: "#how-it-works" },
];

// Figma "Landing Page" desktop (104-3807) / mobile (104-5087). Fixed to the
// top of the viewport, so it renders alongside an `<div className="h-20" />`
// spacer of matching height to keep page content from sliding under it.
//
// The header's own wordmark reads "usekollo" (the marketing name), unlike
// the in-app "kollo" logo file used in the footer — this pairs the black
// icon mark (public/images/logos/black-logo-icon.svg) with typed text
// rather than the full wordmark SVG, since no exported asset combines them
// this way.
//
// The right-side action swaps on auth state: signed-in visitors get a link
// into the dashboard; signed-out visitors get Sign In / Get Started instead,
// since there's no account yet to attach a wallet to.
//
// Connecting a wallet deliberately does not happen from here. Linking is an
// overwrite — it replaces whatever address the account already has, which
// hides that wallet's goals and history until it is reconnected — so it
// belongs behind Profile > Connection, where the current address is visible
// and disconnecting is an explicit step.
export default function SiteHeader() {
	const [open, setOpen] = useState(false);
	const isAuthenticated = useIsAuthenticated();

	return (
		<>
			<motion.header
				initial={{ y: -24, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.5, ease: "easeOut" }}
				className="fixed inset-x-0 top-0 z-50 bg-background"
			>
				<div className="custom-container relative flex h-20 items-center justify-between">
					<a href="#" className="flex items-center gap-2">
						{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
						<img
							src="/images/logos/black-logo-icon.svg"
							alt=""
							width={271}
							height={267}
							className="h-8 w-auto"
						/>
						<span className="text-2xl font-medium lowercase tracking-tight text-foreground">
							usekollo
						</span>
					</a>

					<nav className="hidden items-center gap-10 text-base font-medium text-foreground md:flex">
						{navLinks.map((link) => (
							<a key={link.label} href={link.href} className="hover:opacity-70">
								{link.label}
							</a>
						))}
					</nav>

					<div className="hidden md:inline-flex">
						{isAuthenticated ? (
							<Button href={pageRoutes.dashboardRoutes.DASHBOARD}>
								<WalletIcon className="size-4 text-primary-foreground" />
								Go to Dashboard
							</Button>
						) : (
							<div className="flex items-center gap-3">
								<Button href={pageRoutes.authRoutes.SIGN_IN} variant="ghost">
									Sign In
								</Button>
								<Button href={pageRoutes.authRoutes.SIGN_UP}>Get Started</Button>
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={() => setOpen((prev) => !prev)}
						className="relative z-10 text-foreground md:hidden"
						aria-label="Toggle menu"
						aria-expanded={open}
					>
						<AnimatePresence mode="wait" initial={false}>
							{open ? (
								<motion.span
									key="close"
									initial={{ rotate: -90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: 90, opacity: 0 }}
									transition={{ duration: 0.2 }}
									className="block"
								>
									<X className="size-6" />
								</motion.span>
							) : (
								<motion.span
									key="menu"
									initial={{ rotate: 90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: -90, opacity: 0 }}
									transition={{ duration: 0.2 }}
									className="block"
								>
									<Menu className="size-6" />
								</motion.span>
							)}
						</AnimatePresence>
					</button>

					<AnimatePresence>
						{open && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
								className="absolute inset-x-0 top-full overflow-hidden border-b border-border bg-background md:hidden"
							>
								<motion.div
									initial={{ y: -16 }}
									animate={{ y: 0 }}
									exit={{ y: -16 }}
									transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
									className="flex flex-col gap-4 px-4 py-6"
								>
									{navLinks.map((link) => (
										<a
											key={link.label}
											href={link.href}
											onClick={() => setOpen(false)}
											className="text-sm font-medium text-grey-normal hover:text-foreground"
										>
											{link.label}
										</a>
									))}
									{isAuthenticated ? (
										<Button
											href={pageRoutes.dashboardRoutes.DASHBOARD}
											className="w-full"
											onClick={() => setOpen(false)}
										>
											<WalletIcon className="size-4 text-primary-foreground" />
											Go to Dashboard
										</Button>
									) : (
										<div className="flex flex-col gap-3">
											<Button
												href={pageRoutes.authRoutes.SIGN_IN}
												variant="outline"
												className="w-full"
											>
												Sign In
											</Button>
											<Button href={pageRoutes.authRoutes.SIGN_UP} className="w-full">
												Get Started
											</Button>
										</div>
									)}
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</motion.header>

			{/* Spacer so fixed-header height doesn't cover the page's first section */}
			<div className="h-20" />
		</>
	);
}
