import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordOtpForm from "@/features/auth/components/ResetPasswordOtpForm";

export const metadata: Metadata = {
	title: "Reset Password",
};

export default function ResetPasswordOtpPage() {
	return (
		<AuthShell>
			{/* useSearchParams (for ?email=) requires a Suspense boundary */}
			<Suspense>
				<ResetPasswordOtpForm />
			</Suspense>
		</AuthShell>
	);
}
