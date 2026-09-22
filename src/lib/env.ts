// Centralized, validated environment access. Import this instead of reading
// `process.env` directly anywhere else, so a missing/malformed env var fails
// fast with a clear message instead of surfacing as a confusing runtime error
// three layers deep.
//
// SERVER ONLY. This module reads secrets (service_role key, JWT/cron secrets).
// Never import it from a Client Component or anything under a "use client"
// boundary — use `publicEnv` from lib/public-env.ts for the values the browser
// legitimately needs.
import { z } from "zod";

const serverSchema = z.object({
  // Supabase is both the identity provider (Auth) and the database. The
  // service_role key bypasses RLS and is what the API routes and the cron
  // indexer use; the anon key is what the browser-facing auth calls use.
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Stellar. The passphrase and the RPC host must describe the same network —
  // a Testnet passphrase pointed at a mainnet RPC signs every transaction for
  // the wrong network and every submission is rejected.
  STELLAR_NETWORK_PASSPHRASE: z.string().min(1),
  SOROBAN_RPC_URL: z.url(),
  HORIZON_URL: z.url(),
  CONTRACT_ID: z.string().min(1),

  // Stellar Asset Contract addresses, one per asset the goal contract's own
  // allowlist accepts. Keep these in sync with `initialize`/`add_allowed_asset`
  // or goal creation fails on-chain with InvalidAsset.
  ASSET_XLM_CONTRACT_ID: z.string().min(1),
  ASSET_USDC_CONTRACT_ID: z.string().min(1),
  ASSET_USDC_ISSUER: z.string().min(1),

  // Signs the short-lived ticket handed out between "verify reset OTP" and
  // "set new password" (see features/auth). 32 bytes minimum.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  // Shared secret the scheduled indexer presents to /api/cron/index. The
  // scheduler is Supabase Cron (pg_cron), not Vercel Cron — see
  // supabase/cron.sql. This value must match the `kollo_cron_secret` Vault
  // secret in the Supabase project exactly.
  CRON_SECRET: z.string().min(16),

  // Resend, for the transactional emails this app sends itself (sign-up and
  // password-reset codes). Required: without them registration silently
  // cannot complete, which is worse than refusing to boot.
  //
  // EMAIL_FROM must be an address at a domain verified in Resend. Until one
  // is, Resend delivers only to your own account address and every other
  // recipient gets nothing, with no error in the app.
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required to send auth emails"),
  EMAIL_FROM: z
    .string()
    .min(1, "EMAIL_FROM is required")
    .refine((v) => /<[^@]+@[^>]+>$|^[^@\s]+@[^@\s]+$/.test(v),
      'EMAIL_FROM must be an email address, optionally as "Name <a@b.com>"'),

  // Profile photos live in Supabase Storage (lib/storage/objects), which
  // rides on NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY above —
  // so there is nothing extra to configure. This replaced Cloudflare R2,
  // which needed five more variables and a card on file.

  // Prisma's two connection strings.
  //
  // DATABASE_URL is the transaction pooler (6543) and is what the Prisma
  // client connects with at runtime (lib/db/client.ts). DIRECT_URL is the
  // session pooler (5432) and is only read by prisma.config.ts when running
  // migrations — transaction-mode pooling drops the session state DDL needs.
  //
  // Both stay optional: most routes still read through supabase-js, so a
  // deployment that never touches the Prisma client should not fail to boot
  // over a missing connection string. lib/db/client.ts throws its own clear
  // error if DATABASE_URL is absent when something does use it.
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

// Parsed once, lazily. Doing it at module scope would blow up `next build`
// for routes that never touch these, and makes the failure look like a build
// bug rather than a configuration one.
let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${missing}\n\n` +
        `Copy .env.example to .env and fill these in. See /docs/08-environment-setup.md.`,
    );
  }

  cached = parsed.data;
  return cached;
}
