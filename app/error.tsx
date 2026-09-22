"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";

// Root app/error.tsx — catches unhandled errors anywhere below the root
// layout. `retry` (stable as of Next 16.3, see node_modules/next/dist/docs
// file-conventions/error.md) re-fetches and re-renders the segment that
// threw, which is what "Try Again" should do here rather than the older
// `reset`.
export default function Error({
	error,
	retry,
}: {
	error: Error & { digest?: string };
	retry: () => void;
}) {
	useEffect(() => {
		// TODO: send to an error-reporting service once one is wired up
		console.error(error);
	}, [error]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-grey-lighter px-4 text-center">
			<div className="flex items-center gap-2">
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
			</div>

			<span className="flex size-20 items-center justify-center rounded-full bg-red-100 text-destructive">
				<TriangleAlert className="size-8" strokeWidth={1.5} />
			</span>

			<div>
				<h1 className="text-3xl font-medium text-foreground sm:text-4xl">Something Went Wrong</h1>
				<p className="mt-2 max-w-sm text-sm text-grey-normal">
					An unexpected error occurred. Try again, or head back home if it keeps happening.
				</p>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row">
				<Button size="xl" className="sm:w-60" onClick={() => retry()}>
					Try Again
				</Button>
				<Button href={pageRoutes.HOME} size="xl" variant="outline" className="sm:w-60">
					Back to Home
				</Button>
			</div>
		</div>
	);
}
