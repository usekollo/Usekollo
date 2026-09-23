import Link from "next/link";

// Sits over the full-bleed background photo on auth pages (desktop only —
// mobile auth screens are plain white, no chrome). White text/divider for
// contrast against the photo.
//
// No wallet button here. A wallet is linked to an account, so there is
// nothing to attach one to on a sign-in or sign-up page — and linking is an
// overwrite that replaces whatever address the account already has, hiding
// that wallet's goals and history until it is reconnected. Connecting lives
// in the dashboard, under Profile > Connection, where the current address is
// on screen and disconnecting is an explicit step.
export default function AuthHeader() {
	return (
		<header className="hidden border-b border-white/20 md:block">
			<div className="custom-container flex h-20 items-center text-white">
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
			</div>
		</header>
	);
}
