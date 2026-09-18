import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/features/auth/components/SignUpForm";

export const metadata: Metadata = {
	title: "Sign Up",
};

// Same shell as Sign In (see AuthShell) — full-bleed photo background +
// floating card on desktop, plain white on mobile. Built from the pasted
// screenshot; no Figma node fetched for this one yet.
export default function SignUpPage() {
	return (
		<AuthShell>
			<h1 className="mb-8 text-center text-3xl font-medium text-foreground md:hidden">
				Create Account
			</h1>

			<SignUpForm />
		</AuthShell>
	);
}
