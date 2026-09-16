import { z } from "zod";
import { isStrongPassword } from "./authValidations";

// Email isn't in here — it's the account identifier set at sign-up and
// can't be changed afterward (see ProfileView's PersonalDetailsTab, which
// shows it read-only rather than as an editable field).
export const PersonalDetailsSchema = z.object({
	fullName: z
		.string()
		.nonempty("Full name is required")
		.trim()
		.min(2, "Full name is too short")
		.max(50, "Full name is too long"),
});

export type PersonalDetailsValues = z.infer<typeof PersonalDetailsSchema>;

export const ChangePasswordSchema = z
	.object({
		currentPassword: z.string().nonempty("Enter your current password"),
		newPassword: z
			.string()
			.nonempty("Password is required")
			.min(8, "At least 8 characters")
			.refine((value) => isStrongPassword(value), "Password is too weak"),
		confirmPassword: z.string().nonempty("Please confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message: "New password must be different from your current password",
		path: ["newPassword"],
	});

export type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;
