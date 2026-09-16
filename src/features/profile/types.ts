export interface ProfileDetails {
	fullName: string;
	email: string;
	avatarUrl: string | null;
}

export interface WalletConnection {
	connected: boolean;
	address: string;
	lastSyncedAt: string;
}
