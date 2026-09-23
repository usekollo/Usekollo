import type { Metadata } from "next";
import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";

export const metadata: Metadata = {
	title: "Page Not Found",
};

// Root app/not-found.tsx — Next renders this for both a thrown notFound()
// and any URL that doesn't match a route at all (see node_modules/next/dist/docs
// file-conventions/not-found.md — this app has a single root layout, so the
// newer experimental global-not-found.js isn't needed).
export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-grey-lighter px-4 text-center">
			<Link href={pageRoutes.HOME} className="flex items-center gap-2">
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
			</Link>

			<span className="flex size-20 items-center justify-center rounded-full bg-white text-grey-dark shadow-xs">
				<Compass className="size-8" strokeWidth={1.5} />
			</span>

			<div>
				<h1 className="text-3xl font-medium text-foreground sm:text-4xl">404 — Page Not Found</h1>
				<p className="mt-2 max-w-sm text-sm text-grey-normal">
					The page you&apos;re looking for doesn&apos;t exist or may have moved.
				</p>
			</div>

			<Button href={pageRoutes.HOME} size="xl" className="sm:w-60">
				Back to Home
			</Button>
		</div>
	);
}
