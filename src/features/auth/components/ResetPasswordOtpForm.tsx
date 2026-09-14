"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import OtpInputGrid, { OTP_LENGTH } from "@/components/auth/OtpInputGrid";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
	ResetPasswordOtpSchema,
	ResetPasswordOtpValues,
} from "@/lib/validations/authValidations";
import { useResendOtp, useVerifyResetOtp } from "../hooks";

// Same OTP grid as VerifyEmailForm, different purpose (confirming identity
// to reset a password, not verifying an email). `email` arrives via the
// `?email=` query param forwarded from Forgot Password (see
// useForgotPassword) and forwards on to Reset Password (see
// useVerifyResetOtp).
export default function ResetPasswordOtpForm() {
	const email = useSearchParams().get("email") ?? "";
	const { mutate: verifyResetOtp, isPending } = useVerifyResetOtp();
	const { mutate: resendOtp, isPending: isResending } = useResendOtp();

	const form = useForm<ResetPasswordOtpValues>({
		resolver: zodResolver(ResetPasswordOtpSchema),
		mode: "onChange",
		defaultValues: { otp: "" },
	});

	const {
		formState: { isValid },
	} = form;

	const onSubmit = (values: ResetPasswordOtpValues) => {
		verifyResetOtp({ email, otp: values.otp });
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h1 className="text-2xl font-medium text-foreground">Reset Your Password</h1>
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
						Continue
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
