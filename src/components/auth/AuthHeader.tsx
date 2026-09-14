import Link from "next/link";
import { Button } from "@/components/ui/button";
import ConnectWalletModal from "@/components/landing/ConnectWalletModal";
import WalletIcon from "@/components/landing/WalletIcon";

// Sits over the full-bleed background photo on auth pages (desktop only —
// mobile auth screens are plain white, no chrome). White text/divider for
// contrast against the photo; the wallet button flips to a light pill
// instead of the landing header's solid blue one, for the same reason.
export default function AuthHeader() {
	return (
		<header className="hidden border-b border-white/20 md:block">
			<div className="custom-container flex h-20 items-center justify-between text-white">
				<div className="flex items-center gap-4">
					<Link href="/" className="text-2xl font-medium lowercase tracking-tight">
						usekollo
					</Link>
					<span className="h-6 w-px bg-white/40" />
					<nav className="flex items-center gap-6 text-base font-medium">
						<Link href="/" className="hover:opacity-80">
							Home
						</Link>
						<a href="#" className="hover:opacity-80">
							Docs
						</a>
					</nav>
				</div>

				<ConnectWalletModal
					trigger={
						<Button variant="light">
							<WalletIcon className="size-4" />
							Connect Stellar Wallet
						</Button>
					}
				/>
			</div>
		</header>
	);
}
