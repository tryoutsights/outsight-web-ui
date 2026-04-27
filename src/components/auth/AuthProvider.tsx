import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { SUPABASE_CONFIGURED, supabase } from "@/lib/supabase";

import { AuthContext, type AuthContextValue } from "./auth-context";
import { SignInModal } from "./SignInModal";

type AuthProviderProps = { children: ReactNode };

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);
  const [signInReason, setSignInReason] = useState<string | null>(null);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      // Auto-dismiss the sign-in modal once the user has a session.
      if (nextSession) {
        setSignInDialogOpen(false);
        setSignInReason(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    if (!SUPABASE_CONFIGURED) {
      console.error("[auth] cannot sign in: Supabase env vars missing");
      return;
    }
    const target = redirectTo ?? `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: target },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return;
    await supabase.auth.signOut();
  }, []);

  const requestSignIn = useCallback((reason?: string) => {
    setSignInReason(reason ?? null);
    setSignInDialogOpen(true);
  }, []);

  const dismissSignIn = useCallback(() => {
    setSignInDialogOpen(false);
    setSignInReason(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isConfigured: SUPABASE_CONFIGURED,
      signInDialogOpen,
      signInReason,
      signInWithGoogle,
      signOut,
      requestSignIn,
      dismissSignIn,
    }),
    [
      session,
      isLoading,
      signInDialogOpen,
      signInReason,
      signInWithGoogle,
      signOut,
      requestSignIn,
      dismissSignIn,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Mounted globally so any component can call requestSignIn(...) */}
      <SignInModal />
    </AuthContext.Provider>
  );
};
