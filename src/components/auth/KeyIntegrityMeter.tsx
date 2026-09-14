import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// The two checks shown here are a readable subset of the real password
// rules (SignUpSchema/ResetPasswordSchema also require upper/lower case and
// a symbol) — this meter is UX guidance, not the validation gate; the
// zod schema is what actually enables each form's submit button.
function passwordChecks(password: string) {
	return {
		length: password.length >= 8,
		number: /\d/.test(password),
	};
}

function PasswordCheck({ met, label }: { met: boolean; label: string }) {
	return (
		<span className="flex items-center gap-1.5">
			<span
				className={cn(
					"inline-flex size-4 items-center justify-center rounded-full border",
					met ? "border-primary bg-primary text-primary-foreground" : "border-grey-light-active",
				)}
			>
				{met && <Check className="size-2.5" strokeWidth={3} />}
			</span>
			{label}
		</span>
	);
}

// Shared by Sign Up and Reset Password — both collect a new password and
// show the same "KEY INTEGRITY" strength meter beneath the field(s).
export default function KeyIntegrityMeter({ password }: { password: string }) {
	const checks = passwordChecks(password);
	const strength = (Number(checks.length) + Number(checks.number)) / 2;

	return (
		<div className="rounded-2xl bg-grey-lighter p-4">
			<p className="text-xs font-medium tracking-wide text-grey-normal">KEY INTEGRITY</p>
			<div className="mt-3 h-1.5 rounded-full bg-grey-light">
				<div
					className="h-1.5 rounded-full bg-primary transition-all"
					style={{ width: `${strength * 100}%` }}
				/>
			</div>
			<div className="mt-3 flex items-center gap-6 text-xs text-grey-normal">
				<PasswordCheck met={checks.length} label="8+ characters" />
				<PasswordCheck met={checks.number} label="1+ number" />
			</div>
		</div>
	);
}
