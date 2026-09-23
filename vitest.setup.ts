// Placeholder configuration for the unit suite.
//
// Several modules under test validate the whole environment on first read, so
// a test that only touches signature verification still fails without a full
// set of variables. Filling in syntactically valid dummies keeps the suite
// hermetic: it runs in CI, on a fresh clone and without a local .env, and it
// can never accidentally reach a real Supabase project or RPC node.
//
// Anything already set wins, so `--env-file=.env` still works for a test that
// genuinely wants real values.

const PLACEHOLDERS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  // Testnet, because the signature tests build against it and a mismatch here
  // would make them assert the wrong branch.
  STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  SOROBAN_RPC_URL: "https://placeholder.invalid/soroban",
  NEXT_PUBLIC_SOROBAN_RPC_URL: "https://placeholder.invalid/soroban",
  HORIZON_URL: "https://placeholder.invalid/horizon",
  NEXT_PUBLIC_HORIZON_URL: "https://placeholder.invalid/horizon",
  CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  NEXT_PUBLIC_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ASSET_XLM_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ASSET_USDC_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ASSET_USDC_ISSUER: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  JWT_SECRET: "test-jwt-secret-that-is-long-enough-to-pass-validation",
  CRON_SECRET: "test-cron-secret",
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "test@example.invalid",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/test",
};

for (const [name, value] of Object.entries(PLACEHOLDERS)) {
  process.env[name] ??= value;
}
