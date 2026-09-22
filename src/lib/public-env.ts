// Environment values that are safe in the browser.
//
// Deliberately a separate module from lib/env.ts. That one defines the schema
// for every server secret — service_role key, JWT secret, cron secret — and
// importing it from a Client Component would pull that schema into the client
// bundle. Next.js replaces non-public `process.env` references with undefined
// there so nothing would actually leak, but keeping the two apart means that
// guarantee does not have to be reasoned about.
//
// Read through this rather than `process.env.NEXT_PUBLIC_*` at the call site,
// so the literal names stay greppable for Next's build-time inliner.
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "",
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? "",
  contractId: process.env.NEXT_PUBLIC_CONTRACT_ID ?? "",
  // Freighter signs against whichever network it is set to; this is what the
  // app checks that against before asking for a signature.
  networkPassphrase:
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  // Reown (WalletConnect) project id. Optional: without it the wallet picker
  // still offers every browser-extension wallet, just not the QR option for
  // mobile wallets.
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
};
