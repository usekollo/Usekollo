"use client";

import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import InputField from "@/components/ui/custom/InputField";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { pageRoutes } from "@/lib/config/routes";
import { SignInSchema, SignInValues } from "@/lib/validations/authValidations";
import { useLogin } from "../hooks";

// Figma "Sign In" (node 207-12268): Google button -> "OR EMAIL" divider ->
// email/password fields -> remember-me -> submit -> sign-up footer link.
// Reference implementation for the form pattern used across this app: zod
// schema (lib/validations) -> react-hook-form (zodResolver) -> shadcn <Form>
// wiring -> a react-query mutation from the matching features/*/hooks
// module. Copy this shape for new forms.
export default function LoginForm() {
	const { mutate: login, isPending } = useLogin();

	const form = useForm<SignInValues>({
		resolver: zodResolver(SignInSchema),
		mode: "onChange",
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const {
		formState: { isValid },
	} = form;

	const onSubmit = (values: SignInValues) => {
		login(values);
	};

	return (
		<div className="space-y-6">
			<Button variant="outline" size="xl" className="w-full">
				<Image src="/images/icons/google.svg" alt="" width={17} height={17} aria-hidden />
				Continue with Google
			</Button>

			<div className="relative flex items-center justify-center">
				<span className="h-px flex-1 bg-grey-light" />
				<span className="px-4 text-xs font-medium text-grey-normal">OR EMAIL</span>
				<span className="h-px flex-1 bg-grey-light" />
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

					<FormField
						control={form.control}
						name="password"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="Password"
										labelAction={
											<Button
												href={pageRoutes.authRoutes.FORGOT_PASSWORD}
												variant="link"
												size="sm"
												className="h-auto p-0 text-xs text-blue-dark-hover"
											>
												Forgot Password?
											</Button>
										}
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

					<label className="flex items-center gap-2">
						<Checkbox />
						<span className="text-xs font-medium text-grey-normal">Remember for 30 days</span>
					</label>

					<Button
						type="submit"
						size="xl"
						isLoading={isPending}
						disabled={!isValid}
						className="w-full"
					>
						Login Now
					</Button>
				</form>
			</Form>

			<p className="text-center text-xs font-medium text-grey-normal">
				Don&apos;t Have An Account?{" "}
				<Button
					href={pageRoutes.authRoutes.SIGN_UP}
					variant="link"
					size="sm"
					className="h-auto p-0 text-xs font-medium text-grey-normal hover:text-grey-dark"
				>
					Sign Up
				</Button>
			</p>
		</div>
	);
}
