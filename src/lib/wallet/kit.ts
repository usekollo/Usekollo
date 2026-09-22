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

/** Testnet vs public, derived from the passphrase the app is built against. */
function network(): Networks {
  return publicEnv.networkPassphrase === Networks.PUBLIC ? Networks.PUBLIC : Networks.TESTNET;
}

let initialised = false;

function ensureInit(): void {
  if (initialised) return;

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
  }

  StellarWalletsKit.init({ modules, network: network() });
  initialised = true;
}

/**
 * Opens the wallet picker and returns the chosen address.
 *
 * Replaces the old "connect to Freighter" path: which wallet is used is now
 * the user's choice, made in the kit's modal.
 */
export async function connectWallet(): Promise<string> {
  ensureInit();

  try {
    const { address } = await StellarWalletsKit.authModal();
    if (!address) throw new WalletRejectedError();
    return address;
  } catch (error) {
    if (error instanceof WalletRejectedError) throw error;
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
