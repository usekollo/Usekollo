import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-side Supabase client using the publishable (anon) key. Subject to
// Row Level Security — safe to expose to the client.
//
// Used for exactly one thing: the Google OAuth round trip. Email/password
// sign-in goes through /api/v1/auth/login so the password never touches the
// browser's Supabase client, and every authenticated request afterwards uses
// the bearer token in lib/stores/userAuthStore.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE stores a one-time code verifier in this browser and exchanges it
    // for the session at /auth/callback. Without it the tokens would come
    // back in the URL fragment, where they end up in history and referrers.
    flowType: "pkce",
    // Required, and only for the hop through Google: the verifier has to
    // survive the redirect. The session supabase-js persists alongside it is
    // dropped immediately after the exchange (see /auth/callback) so the
    // zustand store stays the single source of truth for who is signed in.
    persistSession: true,
    detectSessionInUrl: false,
    autoRefreshToken: false,
  },
});
