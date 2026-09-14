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

// The reset token comes from the link in the email (a URL query param), not
// something the user types in — this form only collects the new password.
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
