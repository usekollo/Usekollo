"use client";

// The browser half of the non-custodial flow.
//
// The server builds and simulates transactions but holds no key; signing
// happens in the user's own wallet. Nothing here ever handles a secret.
//
// This wraps Stellar Wallets Kit rather than talking to one wallet directly,
// so Freighter, xBull, Albedo, Lobstr, Hana, Ledger/Trezor and anything
// reachable over WalletConnect all go through one code path. The kit's API is
// static — there is one kit per page, initialised on first use.

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import {
  WalletConnectModule,
  WalletConnectTargetChain,
} from "@creit.tech/stellar-wallets-kit/modules/wallet-connect";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import { publicEnv } from "@/lib/public-env";

export class WalletRejectedError extends Error {
  constructor() {
    super("Request cancelled in your wallet.");
    this.name = "WalletRejectedError";
  }
}

/**
 * Thrown when the page is not a secure context, which WalletConnect needs.
 *
 * WalletConnect encrypts every message to the relay, and its crypto goes
 * through WebCrypto (`crypto.subtle`, via @noble/ciphers). Browsers only expose
 * `crypto.subtle` in a secure context: HTTPS, or localhost. On a phone pointed
 * at a dev server over the LAN — http://192.168.x.x:3000 — it is `undefined`,
 * so the pairing cannot be built and the picker fails with nothing that says
 * why.
 *
 * This is a development problem, not a production one: a deployed site is
 * served over HTTPS and satisfies this automatically. It is checked anyway
 * because the failure is otherwise indistinguishable from "mobile wallets do
 * not work", which is the wrong conclusion to draw.
 */
export class InsecureContextError extends Error {
  constructor() {
    super(
      "Mobile wallets need a secure connection. Open this site over HTTPS — " +
        "a plain http:// address on your network cannot connect a wallet.",
    );
    this.name = "InsecureContextError";
  }
}

export class WalletUnavailableError extends Error {
  constructor() {
    super("No Stellar wallet is available. Install one, then try again.");
    this.name = "WalletUnavailableError";
  }
}

/**
 * The kit reports a cancelled prompt as a thrown object with a code rather
 * than an Error, so this normalises both into something the UI can show.
 */
function rethrow(error: unknown, fallback: string): never {
  const message =
    typeof error === "string"
      ? error
      : ((error as { message?: string })?.message ?? fallback);

  if (/declined|rejected|denied|cancel|closed/i.test(message)) {
    throw new WalletRejectedError();
  }

  throw new Error(message);
}

/**
 * Whether this is a phone or tablet.
 *
 * Coarse on purpose — it only decides which wallets we *claim* to support, so
 * a misread costs a slightly wrong sentence, never a blocked connection. The
 * picker itself still lists whatever is genuinely available.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

/**
 * What a user on this device can realistically connect with.
 *
 * Freighter, Rabet, Hana, Lobstr and xBull are browser extensions: they do not
 * exist on mobile browsers, so on a phone the only routes to a wallet are
 * WalletConnect and Albedo's hosted popup. WalletConnect in turn needs a
 * project id — without one that module is never registered (see ensureInit),
 * which on mobile leaves the picker effectively empty.
 */
export interface WalletAvailability {
  isMobile: boolean;
  walletConnectReady: boolean;
  /** True when this device has no practical way to connect at all. */
  strandedOnMobile: boolean;
}

// Both flags below have to outlive this *module*, not just this page.
//
// Fast Refresh re-runs a file and everything importing it on every edit
// (node_modules/next/dist/docs/03-architecture/fast-refresh.md), so plain
// module-level state resets mid-session. For the availability snapshot that
// only costs a wasted object; for `initialised` it means StellarWalletsKit.init
// runs again and stands up a *second* WalletConnect Core on the same project
// id. Two relay sockets is not harmless: the pairing the wallet approves can
// belong to the client that is no longer being awaited, so the phone shows
// "connected" while the page waits forever. Hanging both off globalThis makes
// re-evaluation a no-op.
interface WalletKitState {
  /**
   * Computed once and handed back by reference — useSyncExternalStore compares
   * snapshots by identity and would re-render forever on a fresh object.
   */
  availability: WalletAvailability | null;
  initialised: boolean;
}

declare global {
  var __kolloWalletKit: WalletKitState | undefined;
}

const state: WalletKitState = (globalThis.__kolloWalletKit ??= {
  availability: null,
  initialised: false,
});

export function walletAvailability(): WalletAvailability {
  if (state.availability) return state.availability;

  const isMobile = isMobileDevice();
  const walletConnectReady = Boolean(publicEnv.walletConnectProjectId);

  state.availability = {
    isMobile,
    walletConnectReady,
    strandedOnMobile: isMobile && !walletConnectReady,
  };

  return state.availability;
}

/** Testnet vs public, derived from the passphrase the app is built against. */
function network(): Networks {
  return publicEnv.networkPassphrase === Networks.PUBLIC ? Networks.PUBLIC : Networks.TESTNET;
}

function ensureInit(): void {
  if (state.initialised) return;

  const modules = [
    new FreighterModule(),
    new xBullModule(),
    new AlbedoModule(),
    new RabetModule(),
    new LobstrModule(),
    new HanaModule(),
  ];

  // WalletConnect is the only module that needs a credential, so it is added
  // only when one is configured. Without it the extension wallets above still
  // work — the modal simply does not offer the QR option.
  if (publicEnv.walletConnectProjectId) {
    modules.push(
      new WalletConnectModule({
        projectId: publicEnv.walletConnectProjectId,
        metadata: {
          name: "UseKollo",
          description: "Save towards goals on Stellar.",
          url: typeof window === "undefined" ? "" : window.location.origin,
          icons: [`${typeof window === "undefined" ? "" : window.location.origin}/icon.png`],
        },
        allowedChains: [
          network() === Networks.PUBLIC
            ? WalletConnectTargetChain.PUBLIC
            : WalletConnectTargetChain.TESTNET,
        ],
      }),
    );
  } else if (isMobileDevice()) {
    // On desktop a missing project id just costs the QR option. On mobile it
    // removes the *only* practical wallet, and the picker then opens listing
    // nothing but extensions that cannot exist there — which reads as a broken
    // app rather than a missing deploy-time variable.
    console.error(
      "[wallet] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect " +
        "is the only wallet most phones can use, so mobile users cannot connect. " +
        "Set it in the deployment environment, not just .env.",
    );
  }

  StellarWalletsKit.init({ modules, network: network() });
  state.initialised = true;
}

/**
 * Opens the wallet picker and returns the chosen address.
 *
 * Replaces the old "connect to Freighter" path: which wallet is used is now
 * the user's choice, made in the kit's modal.
 */
export async function connectWallet(): Promise<string> {
  // Checked before the picker opens rather than after: on a phone over plain
  // HTTP the modal would open, list WalletConnect, and then fail on pairing
  // with an error that names neither the cause nor the fix.
  if (typeof window !== "undefined" && !window.isSecureContext && isMobileDevice()) {
    throw new InsecureContextError();
  }

  ensureInit();

  try {
    const { address } = await StellarWalletsKit.authModal();
    if (!address) throw new WalletRejectedError();
    return address;
  } catch (error) {
    if (error instanceof WalletRejectedError) throw error;
    if (error instanceof InsecureContextError) throw error;
    rethrow(error, "Could not connect to a wallet.");
  }
}

/** The address already connected in this session, or "" if there is none. */
export async function getConnectedAddress(): Promise<string> {
  ensureInit();

  try {
    const { address } = await StellarWalletsKit.getAddress();
    return address ?? "";
  } catch {
    return "";
  }
}

/**
 * Guards against signing for the wrong chain.
 *
 * A wallet set to Mainnet while the app is built against Testnet produces a
 * valid signature that the network then rejects — and the error surfaces far
 * from its cause.
 */
export async function assertCorrectNetwork(): Promise<void> {
  ensureInit();

  try {
    const { network: name, networkPassphrase } = await StellarWalletsKit.getNetwork();
    const expected = publicEnv.networkPassphrase;

    if (expected && networkPassphrase && networkPassphrase !== expected) {
      throw new Error(`Your wallet is set to ${name}. Switch it to Test Net and try again.`);
    }
  } catch (error) {
    // Not every module can report its network (hardware wallets in
    // particular). A wallet that cannot answer is not a reason to block the
    // user — the signature will still be checked against the right network
    // server-side.
    if (error instanceof Error && error.message.startsWith("Your wallet is set to")) throw error;
  }
}

/** Signs prepared XDR. Returns the signed envelope, ready to submit. */
export async function signXdr(xdr: string, address: string): Promise<string> {
  ensureInit();

  try {
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: publicEnv.networkPassphrase,
      address,
    });
    if (!signedTxXdr) throw new WalletRejectedError();
    return signedTxXdr;
  } catch (error) {
    if (error instanceof WalletRejectedError) throw error;
    rethrow(error, "Could not sign that transaction.");
  }
}

/**
 * Signs the wallet-ownership challenge.
 *
 * The challenge is a transaction, so this is the same `signTransaction` call
 * every wallet supports — not `signMessage`, which Ledger, Trezor, Albedo and
 * others reject outright.
 */
export function signChallenge(challengeXdr: string, address: string): Promise<string> {
  return signXdr(challengeXdr, address);
}

/** Forgets the connected wallet. */
export async function disconnectWallet(): Promise<void> {
  ensureInit();
  try {
    await StellarWalletsKit.disconnect();
  } catch {
    // Already gone; nothing to do.
  }
}
