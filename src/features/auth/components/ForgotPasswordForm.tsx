"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/ui/custom/InputField";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { pageRoutes } from "@/lib/config/routes";
import { ForgotPasswordSchema, ForgotPasswordValues } from "@/lib/validations/authValidations";
import { useForgotPassword } from "../hooks";

// No Figma/screenshot reference for this screen — same visual language as
// the rest of the auth flow. Kicks off Forgot Password -> Reset Password
// OTP -> Reset Password (see useForgotPassword).
export default function ForgotPasswordForm() {
	const { mutate: forgotPassword, isPending } = useForgotPassword();

	const form = useForm<ForgotPasswordValues>({
		resolver: zodResolver(ForgotPasswordSchema),
		mode: "onChange",
		defaultValues: { email: "" },
	});

	const {
		formState: { isValid },
	} = form;

	const onSubmit = (values: ForgotPasswordValues) => {
		forgotPassword(values);
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h1 className="text-2xl font-medium text-foreground">Forgot Password?</h1>
				<p className="mt-2 text-sm text-grey-normal">
					Enter your email and we&apos;ll send you a code to reset your password.
				</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
					<FormField
						control={form.control}
						name="email"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="Email Address"
										placeholder="satoshi@gmail.com"
										type="email"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
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
						Send Code
					</Button>
				</form>
			</Form>

			<p className="text-center text-xs font-medium text-grey-normal">
				Remember your password?{" "}
				<Button
					href={pageRoutes.authRoutes.SIGN_IN}
					variant="link"
					size="sm"
					className="h-auto p-0 text-xs font-medium text-grey-normal hover:text-grey-dark"
				>
					Log In
				</Button>
			</p>
		</div>
	);
}
