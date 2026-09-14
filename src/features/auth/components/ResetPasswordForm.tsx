"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import KeyIntegrityMeter from "@/components/auth/KeyIntegrityMeter";
import { Button } from "@/components/ui/button";
import InputField from "@/components/ui/custom/InputField";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { pageRoutes } from "@/lib/config/routes";
import { ResetPasswordSchema, ResetPasswordValues } from "@/lib/validations/authValidations";
import { useResetPassword } from "../hooks";

// Built from the pasted "Create New password" screenshot. `email` arrives
// via the `?email=` query param forwarded from the Reset Password OTP step
// (see useVerifyResetOtp) — identity for this step comes from having passed
// that OTP, not from anything typed here.
export default function ResetPasswordForm() {
	const email = useSearchParams().get("email") ?? "";
	const { mutate: resetPassword, isPending } = useResetPassword();

	const form = useForm<ResetPasswordValues>({
		resolver: zodResolver(ResetPasswordSchema),
		mode: "onChange",
		defaultValues: { password: "", confirmPassword: "" },
	});

	const {
		formState: { isValid },
	} = form;

	const password = form.watch("password");

	const onSubmit = (values: ResetPasswordValues) => {
		resetPassword({ email, password: values.password });
	};

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-medium text-foreground">Create New password</h1>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
					<FormField
						control={form.control}
						name="password"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="New Password"
										icon={<Lock className="size-4" />}
										placeholder="Password"
										type="password"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="confirmPassword"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="Confirm New Password"
										icon={<Lock className="size-4" />}
										placeholder="Password"
										type="password"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<KeyIntegrityMeter password={password} />

					<Button
						type="submit"
						size="xl"
						isLoading={isPending}
						disabled={!isValid}
						className="w-full"
					>
						Update Password
					</Button>
				</form>
			</Form>

			<p className="text-center text-xs font-medium text-grey-normal">
				Already Registered?{" "}
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
