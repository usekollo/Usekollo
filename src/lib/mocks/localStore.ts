// Thin localStorage-backed persistence for the mock data layer — no
// backend yet, so anything a user "creates" or changes (a goal, a deposit,
// their profile, their wallet connection) needs to survive a refresh some
// other way. Each value is seeded from the mock data on first read, then
// reads/writes go through localStorage from then on. Safe to import from
// server code too: every accessor no-ops (returns the seed, or does
// nothing) when `window` isn't available.

function readValue<T>(key: string, seed: T): T {
	if (typeof window === "undefined") return seed;

	try {
		const raw = window.localStorage.getItem(key);
		if (raw) return JSON.parse(raw) as T;
	} catch {
		// Corrupt JSON or storage access blocked (private mode, etc.) — fall
		// through and reseed below.
	}

	writeValue(key, seed);
	return seed;
}

function writeValue<T>(key: string, value: T) {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage full or unavailable — the current session still works in
		// memory, it just won't persist across reloads.
	}
}

const GOALS_KEY = "kollo:goals";
const ACTIVITY_KEY = "kollo:activity";
const PROFILE_KEY = "kollo:profile";
const WALLET_CONNECTION_KEY = "kollo:wallet-connection";

export const getStoredGoals = <T>(seed: T[]) => readValue(GOALS_KEY, seed);
export const setStoredGoals = <T>(list: T[]) => writeValue(GOALS_KEY, list);

export const getStoredActivity = <T>(seed: T[]) => readValue(ACTIVITY_KEY, seed);
export const setStoredActivity = <T>(list: T[]) => writeValue(ACTIVITY_KEY, list);

export const getStoredProfile = <T>(seed: T) => readValue(PROFILE_KEY, seed);
export const setStoredProfile = <T>(value: T) => writeValue(PROFILE_KEY, value);

export const getStoredWalletConnection = <T>(seed: T) => readValue(WALLET_CONNECTION_KEY, seed);
export const setStoredWalletConnection = <T>(value: T) => writeValue(WALLET_CONNECTION_KEY, value);
