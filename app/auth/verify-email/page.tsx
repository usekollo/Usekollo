import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import VerifyEmailForm from "@/features/auth/components/VerifyEmailForm";

export const metadata: Metadata = {
	title: "Verify Email",
};

export default function VerifyEmailPage() {
	return (
		<AuthShell>
			{/* useSearchParams (for ?email=) requires a Suspense boundary */}
			<Suspense>
				<VerifyEmailForm />
			</Suspense>
		</AuthShell>
	);
}
