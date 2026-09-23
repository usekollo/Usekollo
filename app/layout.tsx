import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import AuthProvider from "@/components/providers/AuthProvider";

// Figma "Landing Page" (104-3807) specs this as the brand typeface.
// Everything else references the font only via the `--font-sans` CSS
// variable (globals.css), so changing it here is the only edit needed.
const sans = DM_Sans({
	variable: "--font-sans",
	subsets: ["latin"],
});

// NEXT_PUBLIC_SITE_URL is unset in this project so far (see .env) — falls
// back to localhost so `new URL(...)` never throws in dev, but this MUST
// be set to the real deployed domain before sharing a production link:
// without it, the og:image/twitter:image URLs social platforms fetch
// resolve to localhost and the preview card will come up broken.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const title = {
	default: "Kollo — Non-Custodial Savings on Stellar",
	template: "%s | Kollo",
};
const description =
	"Non-custodial savings infrastructure on Stellar Testnet. Your keys, your assets, your goals.";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title,
	description,
	keywords: [
		"Kollo",
		"Stellar",
		"non-custodial wallet",
		"crypto savings",
		"savings goals",
		"Stellar Testnet",
		"USDC savings",
	],
	authors: [{ name: "Kollo" }],
	openGraph: {
		type: "website",
		url: "/",
		siteName: "Kollo",
		title: title.default,
		description,
	},
	twitter: {
		card: "summary_large_image",
		title: title.default,
		description,
	},
	robots: {
		index: true,
		follow: true,
	},
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
