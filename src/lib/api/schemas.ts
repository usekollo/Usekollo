// Request payload schemas for the API routes.
//
// These mirror what the forms already send (see lib/validations/*), but are
// enforced again here because client-side validation is a convenience, not a
// control — anything can POST to these routes.
import { z } from "zod";
import { OTP_LENGTH } from "@/lib/auth-otp";

const email = z.email("Enter a valid email address");

// Matches SignUpSchema in lib/validations/authValidations.ts. Kept in step
// deliberately: a password the sign-up form accepts must not be rejected here.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((v) => /[A-Z]/.test(v), "Must contain at least 1 uppercase letter")
  .refine((v) => /[a-z]/.test(v), "Must contain at least 1 lowercase letter")
  .refine((v) => /\d/.test(v), "Must contain at least 1 number")
  .refine((v) => /[@$!%*?&.,_\-+=#]/.test(v), "Must contain at least 1 symbol");

const otp = z
  .string()
  .length(OTP_LENGTH, `Enter all ${OTP_LENGTH} digits`)
  .regex(/^\d+$/, `Codes are ${OTP_LENGTH} digits`);

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(50, "Full name is too long"),
  email,
  password,
});

export const loginSchema = z.object({ email, password: z.string().min(1, "Password is required") });
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const emailOnlySchema = z.object({ email });
export const verifyOtpSchema = z.object({ email, otp });
export const resetPasswordSchema = z.object({ email, password });

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(50, "Full name is too long"),
  // Photos are uploaded to object storage through POST /users/me/avatar, which
  // is what sets this. Only a real URL is accepted here: the profile form used
  // to send the image itself as a base64 `data:` URL, which put megabytes of
  // text on the user's row, and this is what stops that coming back.
  avatarUrl: z
    .string()
    .url("Upload a photo through the photo picker")
    .nullable()
    .optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

// A Stellar public key: 56 characters, base32, always starting with G.
const stellarPublicKey = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, "That does not look like a Stellar public key");

export const walletChallengeSchema = z.object({ publicKey: stellarPublicKey });

export const walletConnectSchema = z.object({
  publicKey: stellarPublicKey,
  nonce: z.string().min(16),
  /** The challenge transaction from /wallet/challenge, signed by the wallet. */
  signedXdr: z.string().min(1, "A signed challenge is required"),
});

// -- transactions ---------------------------------------------------------

const amount = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d+)?$/.test(value), "Enter a valid amount")
  .refine((value) => Number(value) > 0, "Enter an amount greater than 0");

export const prepareSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(1, "Give your goal a name").max(50, "Name is too long"),
    targetAmount: amount,
    asset: z.string().min(1, "Choose an asset"),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a target date"),
  }),
  z.object({
    action: z.literal("deposit"),
    goalId: z.coerce.number().int().positive(),
    amount,
  }),
  z.object({
    action: z.literal("withdraw"),
    goalId: z.coerce.number().int().positive(),
    amount,
  }),
]);

export const submitSchema = z.object({
  xdr: z.string().min(1, "A signed transaction is required"),
});

// -- trustlines -----------------------------------------------------------

export const prepareTrustlineSchema = z.object({
  asset: z.string().min(1, "Choose an asset"),
});

export const submitTrustlineSchema = z.object({
  asset: z.string().min(1, "Choose an asset"),
  xdr: z.string().min(1, "A signed transaction is required"),
});

// -- telemetry ------------------------------------------------------------

// Bounded hard rather than generously: /telemetry/error is unauthenticated, so
// every field here is something an anonymous caller can put in our logs.
export const clientErrorSchema = z.object({
  message: z.string().max(500),
  digest: z.string().max(100).optional(),
  stack: z.string().max(4_000).optional(),
  context: z.string().max(200).optional(),
  url: z.string().max(500).optional(),
  userAgent: z.string().max(200).optional(),
});
