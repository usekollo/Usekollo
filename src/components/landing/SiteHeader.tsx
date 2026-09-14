"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";
import { useIsAuthenticated } from "@/lib/stores/userAuthStore";
import { cn } from "@/lib/utils";
import ConnectWalletModal from "./ConnectWalletModal";
import WalletIcon from "./WalletIcon";

const navLinks = [
	{ label: "Product", href: "#features" },
	{ label: "How it Works", href: "#how-it-works" },
	{ label: "Documentation", href: "#" },
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
// The right-side action swaps on auth state: signed-in visitors get
// "Connect Stellar Wallet" (opens ConnectWalletModal); signed-out visitors
// get Sign In / Get Started instead, since there's no account yet to attach
// a wallet to.
export default function SiteHeader() {
	const [open, setOpen] = useState(false);
	const isAuthenticated = useIsAuthenticated();

	return (
		<>
			<header className="fixed inset-x-0 top-0 z-50 bg-background">
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
							<ConnectWalletModal
								trigger={
									<Button>
										<WalletIcon className="size-4 text-primary-foreground" />
										Connect Stellar Wallet
									</Button>
								}
							/>
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
						className="text-foreground md:hidden"
						aria-label="Toggle menu"
						aria-expanded={open}
					>
						{open ? <X className="size-6" /> : <Menu className="size-6" />}
					</button>

					<div
						className={cn(
							"absolute inset-x-0 top-full flex flex-col gap-4 border-b border-border bg-background px-4 py-6 md:hidden",
							open ? "flex" : "hidden",
						)}
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
							<ConnectWalletModal
								trigger={
									<Button className="w-full">
										<WalletIcon className="size-4 text-primary-foreground" />
										Connect Stellar Wallet
									</Button>
								}
							/>
						) : (
							<div className="flex flex-col gap-3">
								<Button href={pageRoutes.authRoutes.SIGN_IN} variant="outline" className="w-full">
									Sign In
								</Button>
								<Button href={pageRoutes.authRoutes.SIGN_UP} className="w-full">
									Get Started
								</Button>
							</div>
						)}
					</div>
				</div>
			</header>

			{/* Spacer so fixed-header height doesn't cover the page's first section */}
			<div className="h-20" />
		</>
	);
}
