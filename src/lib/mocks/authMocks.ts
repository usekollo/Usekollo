import { ApiSuccessResponse, AuthTokensData } from "@/types/api";
import { LoginPayload, RegisterPayload } from "@/features/auth/types";

// Stand-ins for the real endpoints in lib/config/apiRoutes.ts — there's no
// backend yet, so every auth mutation resolves against these instead of
// axios. Each one mirrors the { statusCode, message, timestamp, data }
// envelope the real API will eventually return, so swapping a mock back
// for the matching axiosPublic.post(...) call in features/auth/hooks is a
// one-line change per hook once a backend exists — nothing else (the
// forms, the toasts, the redirects) needs to change.
const MOCK_DELAY_MS = 600;

const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

const envelope = <T>(message: string, data: T): ApiSuccessResponse<T> => ({
	statusCode: 200,
	message,
	timestamp: new Date().toISOString(),
	data,
});

export async function mockRegister(
	values: RegisterPayload,
): Promise<ApiSuccessResponse<unknown>> {
	await delay();
	return envelope(`Account created — we've sent a verification code to ${values.email}.`, null);
}

export async function mockLogin(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for signature parity with the real endpoint this stands in for
	values: LoginPayload,
): Promise<ApiSuccessResponse<AuthTokensData>> {
	await delay();
	return envelope("Welcome back!", {
		accessToken: "mock-access-token",
		refreshToken: "mock-refresh-token",
		expiresIn: 3600,
	});
}

export async function mockForgotPassword(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for signature parity with the real endpoint this stands in for
	values: { email: string },
): Promise<ApiSuccessResponse<unknown>> {
	await delay();
	return envelope("If that email has an account, we've sent a reset link.", null);
}

export async function mockVerifyEmail(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for signature parity with the real endpoint this stands in for
	values: { email: string; otp: string },
): Promise<ApiSuccessResponse<unknown>> {
	await delay();
	return envelope("Email verified — you can sign in now.", null);
}

export async function mockResendOtp(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for signature parity with the real endpoint this stands in for
	values: { email: string },
): Promise<ApiSuccessResponse<unknown>> {
	await delay();
	return envelope("We've sent a new code to your email.", null);
}

export async function mockVerifyResetOtp(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for signature parity with the real endpoint this stands in for
	values: { email: string; otp: string },
): Promise<ApiSuccessResponse<unknown>> {
	await delay();
	return envelope("Code confirmed — choose your new password.", null);
}

export async function mockResetPassword(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for signature parity with the real endpoint this stands in for
	values: { email: string; password: string },
): Promise<ApiSuccessResponse<unknown>> {
	await delay();
	return envelope("Password updated — you can sign in with it now.", null);
}

export async function mockLogoutRequest(): Promise<ApiSuccessResponse<unknown>> {
	await delay();
	return envelope("Signed out.", null);
}
