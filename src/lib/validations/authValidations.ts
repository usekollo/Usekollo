import { z } from "zod";

export const isStrongPassword = (password: string) => {
	return /^(?=.*[A-Za-z])(?=.*[\d!@#$%^&*(),.?":{}|<>;'[\]~\-_=+])[A-Za-z\d!@#$%^&*(),.?":{}|<>;'[\]~\-_=+]{8,}$/.test(
		password,
	);
};

export const SignUpSchema = z.object({
	fullName: z
		.string()
		.nonempty("Full name is required")
		.trim()
		.min(2, "Full name is too short")
		.max(50, "Full name is too long"),

	email: z.string().nonempty("Email is required").email("Invalid email address"),

	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.refine((v) => /[A-Z]/.test(v), "Must contain at least 1 uppercase letter")
		.refine((v) => /[a-z]/.test(v), "Must contain at least 1 lowercase letter")
		.refine((v) => /\d/.test(v), "Must contain at least 1 number")
		.refine((v) => /[@$!%*?&.,_\-+=#]/.test(v), "Must contain at least 1 symbol"),
});

export type SignUpValues = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
	email: z.string().nonempty("Email is required").email("Invalid email address"),
	password: z.string().nonempty("Password is required"),
});

export type SignInValues = z.infer<typeof SignInSchema>;

export const ForgotPasswordSchema = z.object({
	email: z.string().nonempty("Email is required").email("Invalid email address"),
});

export type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

export const VerifyEmailSchema = z.object({
	otp: z
		.string()
		.nonempty("Enter the code we sent you")
		.length(6, "Enter all 6 digits"),
});

export type VerifyEmailValues = z.infer<typeof VerifyEmailSchema>;

// Same shape as VerifyEmailSchema, kept separate since it verifies a
// different code for a different purpose (resetting a password, not
// confirming an email address) even though the rule is identical today.
export const ResetPasswordOtpSchema = z.object({
	otp: z
		.string()
		.nonempty("Enter the code we sent you")
		.length(6, "Enter all 6 digits"),
});

export type ResetPasswordOtpValues = z.infer<typeof ResetPasswordOtpSchema>;

// Identity for this step comes from having passed the OTP step just before
// it (see ResetPasswordOtpSchema) — this form only collects the new
// password itself.
export const ResetPasswordSchema = z
	.object({
		password: z
			.string()
			.nonempty("Password is required")
			.min(8, "At least 8 characters")
			.refine((value) => isStrongPassword(value), "Password is too weak"),
		confirmPassword: z.string().nonempty("Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;
