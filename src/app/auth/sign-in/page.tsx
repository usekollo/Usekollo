import type { Metadata } from "next";
import LoginForm from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
	title: "Sign In",
};

// Figma "Sign In" (node 207-12268) — mobile layout only for now; the desktop
// variant (node 207-12244) adds a split hero image alongside the form,
// pull that in separately if/when this needs a distinct desktop treatment.
export default function SignInPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
			<div className="w-full max-w-sm space-y-10">
				<h1 className="text-center text-3xl font-medium text-foreground">Welcome Back!</h1>

				<LoginForm />
			</div>
		</div>
	);
}
