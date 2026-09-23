import type { Metadata } from "next";
import { Suspense } from "react";
import OAuthCallback from "@/features/auth/components/OAuthCallback";

export const metadata: Metadata = {
	title: "Signing you in",
	// This page only ever appears mid-redirect.
	robots: { index: false, follow: false },
};

export default function OAuthCallbackPage() {
	return (
		<Suspense fallback={null}>
			<OAuthCallback />
		</Suspense>
	);
}
