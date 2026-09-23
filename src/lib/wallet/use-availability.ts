"use client";

import { useSyncExternalStore } from "react";
import { walletAvailability, type WalletAvailability } from "./kit";

// Desktop is the safe assumption for markup rendered before any user agent is
// known: it is the common case, and it never disables the connect button.
const SERVER_AVAILABILITY: WalletAvailability = {
  isMobile: false,
  walletConnectReady: true,
  strandedOnMobile: false,
};

// Neither input can change for the life of the page, so there is nothing to
// subscribe to — but useSyncExternalStore is still the right tool: it is what
// keeps the server render and the hydrated one from disagreeing about a value
// only the browser can know.
const subscribe = () => () => {};
const getServerSnapshot = () => SERVER_AVAILABILITY;

/** Which wallets this device can realistically use. See kit.walletAvailability. */
export function useWalletAvailability(): WalletAvailability {
  return useSyncExternalStore(subscribe, walletAvailability, getServerSnapshot);
}
