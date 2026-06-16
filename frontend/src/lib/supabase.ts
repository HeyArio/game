import { createClient } from "@supabase/supabase-js";

// These come from the Supabase project dashboard (Project Settings → API).
// They are public, anon-level keys — safe to ship in the client. Row Level
// Security on the database is what actually protects data.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Fail loudly in dev rather than producing confusing auth errors later.
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // completes the OAuth redirect handshake
  },
});

export const isSupabaseConfigured = Boolean(url && anonKey);
