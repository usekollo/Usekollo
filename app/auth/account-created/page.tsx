import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { pageRoutes } from "@/lib/config/routes";

export const metadata: Metadata = {
	title: "Account Created",
};

// Built from the pasted "Account Created" screenshot — the checkmark is a
// lucide stand-in (CircleCheck); the Figma frame's own icon has a looser,
// hand-drawn stroke that isn't available as a fetchable asset. Reached only
// after Verify Email succeeds (Sign Up -> Verify Email -> here -> Dashboard,
// see useVerifyEmail), so there's no separate "verify" action here anymore.
export default function AccountCreatedPage() {
	return (
		<AuthShell>
			<div className="text-center">
				<h1 className="text-2xl font-medium text-foreground">Account Created</h1>

				<CircleCheck className="mx-auto my-10 size-24 text-primary" strokeWidth={1.25} />

				<Button href={pageRoutes.dashboardRoutes.DASHBOARD} size="xl" className="w-full">
					Go to Dashboard
				</Button>
			</div>
		</AuthShell>
	);
}
