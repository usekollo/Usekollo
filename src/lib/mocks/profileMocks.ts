import { ApiSuccessResponse } from "@/types/api";
import { ProfileDetails, WalletConnection } from "@/features/profile/types";
import { MOCK_WALLET_ADDRESS } from "./dashboardMocks";
import { getStoredProfile, getStoredWalletConnection, setStoredProfile, setStoredWalletConnection } from "./localStore";

// Same "no backend yet" pattern as authMocks.ts/dashboardMocks.ts — see
// those files' header comments. Profile details and the wallet connection
// each persist to localStorage independently of the account created via
// the real auth flow (features/auth) — this is app-profile/wallet state,
// not session/token state (see lib/stores/userAuthStore.ts for that).
const MOCK_DELAY_MS = 700;

const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

const envelope = <T>(data: T): ApiSuccessResponse<T> => ({
	statusCode: 200,
	message: "OK",
	timestamp: new Date().toISOString(),
	data,
});

const seedProfile: ProfileDetails = {
	fullName: "Alex Stellar",
	email: "alex@usekollo.com",
	avatarUrl: null,
};

const seedWalletConnection: WalletConnection = {
	connected: true,
	address: MOCK_WALLET_ADDRESS,
	lastSyncedAt: new Date().toISOString(),
};

export async function mockGetProfile(): Promise<ApiSuccessResponse<ProfileDetails>> {
	await delay();
	return envelope(getStoredProfile(seedProfile));
}

export async function mockUpdateProfile(
	values: Pick<ProfileDetails, "fullName" | "email" | "avatarUrl">,
): Promise<ApiSuccessResponse<ProfileDetails>> {
	await delay();
	const updated: ProfileDetails = { ...getStoredProfile(seedProfile), ...values };
	setStoredProfile(updated);
	return envelope(updated);
}

// Doesn't actually check `currentPassword` against anything (there's no
// real account store to check it against) — validates shape/strength
// client-side (see ChangePasswordSchema) and just resolves successfully.
export async function mockChangePassword(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for signature parity with the real endpoint this stands in for
	values: { currentPassword: string; newPassword: string },
): Promise<ApiSuccessResponse<null>> {
	await delay();
	return envelope(null);
}

export async function mockGetWalletConnection(): Promise<ApiSuccessResponse<WalletConnection>> {
	await delay();
	return envelope(getStoredWalletConnection(seedWalletConnection));
}

export async function mockDisconnectWallet(): Promise<ApiSuccessResponse<WalletConnection>> {
	await delay();
	const updated: WalletConnection = { connected: false, address: "", lastSyncedAt: new Date().toISOString() };
	setStoredWalletConnection(updated);
	return envelope(updated);
}

export async function mockConnectWallet(): Promise<ApiSuccessResponse<WalletConnection>> {
	await delay();
	const updated: WalletConnection = {
		connected: true,
		address: MOCK_WALLET_ADDRESS,
		lastSyncedAt: new Date().toISOString(),
	};
	setStoredWalletConnection(updated);
	return envelope(updated);
}
