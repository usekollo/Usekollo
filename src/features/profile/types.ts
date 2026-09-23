export interface ProfileDetails {
	fullName: string;
	email: string;
	avatarUrl: string | null;
	/**
	 * False for a Google-only account, which has no password to change. The
	 * security tab offers setting one instead of changing one.
	 */
	hasPassword: boolean;
}

export interface WalletConnection {
	connected: boolean;
	address: string;
	lastSyncedAt: string;
}
