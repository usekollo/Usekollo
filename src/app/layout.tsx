import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import AuthProvider from "@/components/providers/AuthProvider";

// Swap for the brand typeface once the Figma designs land — everything
// else references the font only via the `--font-sans` CSS variable
// (globals.css), so changing it here is the only edit needed.
const sans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Kollo",
		template: "%s | Kollo",
	},
	description: "Non-custodial savings infrastructure on Stellar Testnet. Your keys, your assets, your goals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			data-scroll-behavior="smooth"
			className={cn("h-full", "antialiased", sans.variable, "font-sans")}
		>
			{/* suppressHydrationWarning here specifically, not deeper — browser
			    extensions (Grammarly, password managers, etc.) inject their own
			    attributes onto <body> before React hydrates, which React then
			    reports as a mismatch even though nothing in our own render is
			    wrong. This only silences attribute mismatches on this one
			    element, not any real hydration bug elsewhere in the tree. */}
			<body className="min-h-full" suppressHydrationWarning>
				<ReactQueryProvider>
					<AuthProvider>{children}</AuthProvider>
				</ReactQueryProvider>

				<Toaster richColors position="top-right" />
			</body>
		</html>
	);
}
