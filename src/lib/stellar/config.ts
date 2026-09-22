// Network wiring and the asset registry. SERVER ONLY.
import { Horizon, rpc } from "@stellar/stellar-sdk";
import { getEnv } from "@/lib/env";

/** Soroban RPC — contract simulation, submission and event reads. */
export function sorobanServer(): rpc.Server {
  const env = getEnv();
  // allowHttp only matters for a local quickstart container; against the
  // https testnet endpoint it is inert.
  return new rpc.Server(env.SOROBAN_RPC_URL, {
    allowHttp: env.SOROBAN_RPC_URL.startsWith("http://"),
  });
}

/** Horizon — classic account data, which is where wallet balances live. */
export function horizonServer(): Horizon.Server {
  const env = getEnv();
  return new Horizon.Server(env.HORIZON_URL, {
    allowHttp: env.HORIZON_URL.startsWith("http://"),
  });
}

export function networkPassphrase(): string {
  return getEnv().STELLAR_NETWORK_PASSPHRASE;
}

export function contractId(): string {
  return getEnv().CONTRACT_ID;
}

/**
 * The assets the UI offers (see CreateGoalForm's ASSETS) mapped to what the
 * chain needs.
 *
 * `contractId` is the Stellar Asset Contract wrapper the goal contract
 * transfers through — NOT the classic asset code — and must match what the
 * contract's own allowlist holds, or create_goal fails with InvalidAsset.
 *
 * Both Stellar classic assets and their SAC wrappers use 7 decimal places, so
 * `decimals` is 7 across the board; it is spelled out per asset rather than
 * assumed so a future 6-decimal token cannot silently be off by 10x.
 */
export interface AssetConfig {
  code: string;
  contractId: string;
  decimals: number;
  /** Null for native XLM, which has no issuer and needs no trustline. */
  issuer: string | null;
}

export function assetRegistry(): Record<string, AssetConfig> {
  const env = getEnv();

  return {
    XLM: {
      code: "XLM",
      contractId: env.ASSET_XLM_CONTRACT_ID,
      decimals: 7,
      issuer: null,
    },
    USDC: {
      code: "USDC",
      contractId: env.ASSET_USDC_CONTRACT_ID,
      decimals: 7,
      issuer: env.ASSET_USDC_ISSUER,
    },
  };
}

export function assetByCode(code: string): AssetConfig | null {
  return assetRegistry()[code.toUpperCase()] ?? null;
}

/** Reverse lookup, for turning an on-chain event's asset address into a code. */
export function assetByContractId(id: string): AssetConfig | null {
  return Object.values(assetRegistry()).find((asset) => asset.contractId === id) ?? null;
}

/**
 * The asset the dashboard's headline balance is denominated in.
 *
 * On testnet this is XLM: Friendbot funds every new account with it, so it is
 * the only asset a new user reliably holds. USDC works too, but only for
 * someone who has established a trustline and acquired some.
 */
export const PRIMARY_ASSET_CODE = "XLM";
