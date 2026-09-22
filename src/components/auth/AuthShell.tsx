import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import AuthFooter from "./AuthFooter";
import AuthHeader from "./AuthHeader";

// Shared shell for every auth screen (Sign In, Sign Up, Account Created,
// Verify Email, ...): full-bleed photo background + AuthHeader/AuthFooter
// on desktop, with the form floating in a white card; plain white on
// mobile, no chrome.
export default function AuthShell({
	children,
	cardClassName,
}: {
	children: ReactNode;
	cardClassName?: string;
}) {
	return (
		<div className="relative flex min-h-screen flex-col">
			<div className="fixed inset-0 -z-10 hidden md:block">
				{/* eslint-disable-next-line @next/next/no-img-element -- local asset, fixed full-bleed background, no responsive srcset needed */}
				<img src="/images/auth-background.png" alt="" className="h-full w-full object-cover" />
			</div>

			<AuthHeader />

			<main className="flex flex-1 items-center justify-center px-4 py-16 md:py-10">
				<div
					className={cn(
						"w-full max-w-sm md:max-w-md md:rounded-[43px] md:bg-white md:p-10 md:shadow-2xl",
						cardClassName,
					)}
				>
					{children}
				</div>
			</main>

			<AuthFooter />
		</div>
	);
}
