import { Loader2 } from "lucide-react";

// Root app/loading.tsx — Next wraps every route segment below it in a
// Suspense boundary and shows this while that segment's RSC payload is
// still streaming in (e.g. a slow client-side navigation).
export default function Loading() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-grey-lighter">
			{/* eslint-disable-next-line @next/next/no-img-element -- local vector asset, no benefit from the raster optimizer */}
			<img
				src="/images/logos/black-logo-icon.svg"
				alt=""
				width={271}
				height={267}
				className="h-10 w-auto animate-pulse"
			/>
			<Loader2 className="size-6 animate-spin text-primary" />
		</div>
	);
}
