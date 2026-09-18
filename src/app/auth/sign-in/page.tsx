import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
	title: "Sign In",
};

// Figma "Sign In" (node 207-12268 mobile / 207-12244 desktop). Mobile is
// plain white, just the heading + form. Desktop adds a full-bleed photo
// background with its own header/footer overlaid in white (see AuthShell),
// and the form floats in a white card instead.
export default function SignInPage() {
	return (
		<AuthShell>
			<h1 className="mb-8 text-center text-3xl font-medium text-foreground md:hidden">
				Welcome Back!
			</h1>

			<LoginForm />
		</AuthShell>
	);
}
