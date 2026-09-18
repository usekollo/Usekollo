import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
	title: "Reset Password",
};

export default function ResetPasswordPage() {
	return (
		<AuthShell>
			{/* useSearchParams (for ?email=) requires a Suspense boundary */}
			<Suspense>
				<ResetPasswordForm />
			</Suspense>
		</AuthShell>
	);
}
