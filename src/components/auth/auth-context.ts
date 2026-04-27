import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthContextValue = {
  /** The current Supabase user, or null if anonymous. */
  user: User | null;
  /** Full session object — useful for tokens, expiry, etc. */
  session: Session | null;
  /** True until the initial `getSession()` resolves on mount. */
  isLoading: boolean;
  /** True if Supabase env vars are present so sign-in should be offered. */
  isConfigured: boolean;
  /** Whether the global sign-in modal is currently open. */
  signInDialogOpen: boolean;
  /**
   * Optional reason shown in the sign-in modal — e.g. "Sign in to run AI
   * analysis." Set by callers of `requestSignIn`.
   */
  signInReason: string | null;
  /** Begin the Google OAuth redirect flow. */
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  /** Sign out and clear cached session data. */
  signOut: () => Promise<void>;
  /**
   * Open the global sign-in modal with an optional contextual reason. Use this
   * from anywhere (e.g. on a 401 response or before a gated action).
   */
  requestSignIn: (reason?: string) => void;
  /** Programmatically close the sign-in modal. */
  dismissSignIn: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
