import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

export const SUPABASE_CONFIGURED = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
);

if (!SUPABASE_CONFIGURED) {
  // Surface a clear warning once on boot — the app still renders so we can
  // ship Phase 1 incrementally.
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set. " +
      "Sign-in will be disabled until they are configured.",
  );
}

/**
 * Singleton Supabase client. Persists sessions in localStorage, auto-refreshes
 * tokens, and uses the PKCE flow for OAuth (works without exposing secrets).
 */
export const supabase = createClient(
  SUPABASE_URL ?? "https://placeholder.supabase.co",
  SUPABASE_PUBLISHABLE_KEY ?? "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  },
);
