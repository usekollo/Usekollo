"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import OtpInputGrid, { OTP_LENGTH } from "@/components/auth/OtpInputGrid";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { VerifyEmailSchema, VerifyEmailValues } from "@/lib/validations/authValidations";
import { useResendOtp, useVerifyEmail } from "../hooks";

// No Figma/screenshot reference for this screen — the user asked for an OTP
// entry page to follow Sign Up without providing a design, so this follows
// the same visual language (pill buttons, grey-light-active borders) as the
// rest of the auth flow rather than a specific mock. `email` arrives via
// the `?email=` query param forwarded from Sign Up (see useRegister).
export default function VerifyEmailForm() {
	const email = useSearchParams().get("email") ?? "";
	const { mutate: verifyEmail, isPending } = useVerifyEmail();
	const { mutate: resendOtp, isPending: isResending } = useResendOtp();

	const form = useForm<VerifyEmailValues>({
		resolver: zodResolver(VerifyEmailSchema),
		mode: "onChange",
		defaultValues: { otp: "" },
	});

	const {
		formState: { isValid },
	} = form;

	const onSubmit = (values: VerifyEmailValues) => {
		verifyEmail({ email, otp: values.otp });
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h1 className="text-2xl font-medium text-foreground">Verify Your Email</h1>
				<p className="mt-2 text-sm text-grey-normal">
					Enter the {OTP_LENGTH}-digit code we sent to{" "}
					{email ? (
						<span className="font-medium text-foreground">{email}</span>
					) : (
						"your email address"
					)}
					.
				</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<FormField
						control={form.control}
						name="otp"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<OtpInputGrid
										value={field.value}
										onChange={field.onChange}
										onComplete={() => form.handleSubmit(onSubmit)()}
										error={!!fieldState.error}
									/>
								</FormControl>
								<FormMessage className="text-center" />
							</FormItem>
						)}
					/>

					<Button
						type="submit"
						size="xl"
						isLoading={isPending}
						disabled={!isValid}
						className="w-full"
					>
						Verify Email
					</Button>
				</form>
			</Form>

			<p className="text-center text-xs font-medium text-grey-normal">
				Didn&apos;t get a code?{" "}
				<Button
					type="button"
					variant="link"
					size="sm"
					disabled={!email || isResending}
					onClick={() => resendOtp({ email })}
					className="h-auto p-0 text-xs"
				>
					Resend Code
				</Button>
			</p>
		</div>
	);
}
