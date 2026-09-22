// Server-side Supabase clients. SERVER ONLY — this module reads the
// service_role key, which must never reach the browser.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/**
 * Bypasses Row Level Security. Reserved for trusted backend code: API routes
 * and the cron indexer, where we need to read/write any row regardless of
 * policy.
 *
 * Memoised because it holds no per-user state — it authenticates as the
 * service role on every call rather than carrying a session.
 */
let adminClient: SupabaseClient | null = null;

export function createSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const env = getEnv();
  adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

/**
 * A fresh anon-key client for one request's auth work (sign in, sign up,
 * verify OTP, refresh).
 *
 * Deliberately NOT memoised. `signInWithPassword` and friends attach the
 * resulting session to the client instance; sharing one instance across
 * concurrent requests would let one user's request observe another's session.
 * A new instance per call costs nothing and removes that whole class of bug.
 */
export function createSupabaseAuthClient(): SupabaseClient {
  const env = getEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
