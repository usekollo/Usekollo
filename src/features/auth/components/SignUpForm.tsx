"use client";

import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import KeyIntegrityMeter from "@/components/auth/KeyIntegrityMeter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import InputField from "@/components/ui/custom/InputField";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { pageRoutes } from "@/lib/config/routes";
import { SignUpSchema, SignUpValues } from "@/lib/validations/authValidations";
import { useRegister } from "../hooks";

// Figma-referenced "Connect Wallet"-adjacent screen: no Figma node for Sign
// Up was fetched (built from the pasted screenshot), so this mirrors
// LoginForm's structure/pattern with the fields that screen actually shows.
export default function SignUpForm() {
	const { mutate: register, isPending } = useRegister();
	const [acceptedTerms, setAcceptedTerms] = useState(false);

	const form = useForm<SignUpValues>({
		resolver: zodResolver(SignUpSchema),
		mode: "onChange",
		defaultValues: {
			fullName: "",
			email: "",
			password: "",
		},
	});

	const {
		formState: { isValid },
	} = form;

	const password = form.watch("password");

	const onSubmit = (values: SignUpValues) => {
		if (!acceptedTerms) {
			toast.error("Please accept the Terms of Service and Privacy Policy to continue");
			return;
		}
		register(values);
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
						name="fullName"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormControl>
									<InputField
										{...field}
										label="Full Name"
										placeholder="e.g. Satoshi Nakamoto"
										type="text"
										error={fieldState.error?.message ?? null}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

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

					<label className="flex items-start gap-2">
						<Checkbox checked={acceptedTerms} onCheckedChange={setAcceptedTerms} className="mt-0.5" />
						<span className="text-xs font-medium text-grey-normal">
							I Accept the{" "}
							<a href="#" className="text-primary underline hover:no-underline">
								Terms Of Service
							</a>{" "}
							And{" "}
							<a href="#" className="text-primary underline hover:no-underline">
								Privacy Policy
							</a>{" "}
							On Chain
						</span>
					</label>

					<Button
						type="submit"
						size="xl"
						isLoading={isPending}
						disabled={!isValid}
						className="w-full"
					>
						Create Account
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
