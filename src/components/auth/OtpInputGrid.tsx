"use client";

import { OTPField } from "@base-ui/react/otp-field";
import { OTP_LENGTH } from "@/lib/auth-otp";
import { cn } from "@/lib/utils";

// The 6-box code entry shared by every OTP screen (email verification,
// password reset) — just the input grid; each screen owns its own
// heading/copy/submit button around it.
export default function OtpInputGrid({
	value,
	onChange,
	onComplete,
	error,
}: {
	value: string;
	onChange: (value: string) => void;
	onComplete: () => void;
	error?: boolean;
}) {
	return (
		<OTPField.Root
			length={OTP_LENGTH}
			value={value}
			onValueChange={onChange}
			onValueComplete={onComplete}
			className="flex justify-between gap-2 sm:gap-3"
		>
			{Array.from({ length: OTP_LENGTH }).map((_, index) => (
				<OTPField.Input
					key={index}
					className={cn(
						"h-14 w-12 rounded-2xl border border-grey-light-active text-center text-xl font-semibold text-grey-normal outline-none transition-colors sm:h-16 sm:w-14",
						"focus:border-grey-normal",
						error && "border-destructive text-destructive",
					)}
				/>
			))}
		</OTPField.Root>
	);
}

export { OTP_LENGTH };
