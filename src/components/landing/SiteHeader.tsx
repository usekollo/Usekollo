"use client";

import { useState } from "react";
import { Menu, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
	{ label: "Product", href: "#features" },
	{ label: "How it Works", href: "#how-it-works" },
	{ label: "Documentation", href: "#" },
];

// Figma "Landing Page" desktop (104-3807) / mobile (104-5087) — desktop
// shows the three nav links inline, mobile collapses them behind a
// hamburger. The Figma mockups themselves show a "usekollo" placeholder
// wordmark, but the project's actual exported logo (public/images/logos)
// reads "kollo" — matching the app's real name everywhere else (package.json,
// <title>) — so that's what renders here instead.
export default function SiteHeader() {
	const [open, setOpen] = useState(false);

	return (
		<header className="custom-container relative flex items-center justify-between py-6">
			{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
			<img src="/images/logos/blue-logo.svg" alt="Kollo" width={612} height={179} className="h-7 w-auto" />

			<nav className="hidden items-center gap-8 text-sm font-medium text-grey-normal md:flex">
				{navLinks.map((link) => (
					<a key={link.label} href={link.href} className="hover:text-foreground">
						{link.label}
					</a>
				))}
			</nav>

			<Button className="hidden md:inline-flex">
				<Wallet className="size-4" />
				Connect Stellar Wallet
			</Button>

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
					"absolute inset-x-0 top-full z-10 flex flex-col gap-4 border-b border-border bg-background px-4 py-6 md:hidden",
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
				<Button className="w-full">
					<Wallet className="size-4" />
					Connect Stellar Wallet
				</Button>
			</div>
		</header>
	);
}
