import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase";

const AUTH_NEXT_STORAGE_KEY = "outsights.auth.next";

/**
 * Landing page for the OAuth redirect. `supabase-js` parses the URL
 * fragment in the background (via `detectSessionInUrl: true`); we just need
 * to wait for the session to be persisted, then push the user onward.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      // Calling getSession ensures the URL fragment has been processed before
      // we redirect — otherwise we may land on /platform without a session.
      await supabase.auth.getSession();
      if (cancelled) return;
      const params = new URLSearchParams(window.location.search);
      const nextFromQuery = params.get("next");
      const nextFromStorage = (() => {
        try {
          return sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      const rawNext = nextFromQuery ?? nextFromStorage ?? "/platform";
      const safeNext =
        rawNext.startsWith("/") && !rawNext.startsWith("/auth/callback")
          ? rawNext
          : "/platform";

      try {
        sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
      } catch {
        // Ignore storage failures.
      }

      navigate(safeNext, { replace: true });
    };
    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-200">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-slate-200" />
        <p className="text-sm text-slate-400">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
