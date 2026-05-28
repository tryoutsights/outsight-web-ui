import { Loader2, Satellite, ShieldCheck } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

/**
 * Centralised sign-in dialog. Mounted once inside `AuthProvider` and driven
 * entirely through the auth context (`signInDialogOpen`, `requestSignIn`,
 * `dismissSignIn`) so any component can prompt sign-in by calling
 * `useAuth().requestSignIn(reason)`.
 */
export const SignInModal = () => {
  const {
    signInDialogOpen,
    signInReason,
    isConfigured,
    signInWithGoogle,
    dismissSignIn,
  } = useAuth();
  const [isStartingOAuth, setIsStartingOAuth] = useState(false);

  const handleGoogle = async () => {
    if (!isConfigured) return;
    setIsStartingOAuth(true);
    try {
      await signInWithGoogle();
    } finally {
      // The OAuth call performs a top-level redirect, so this only runs in
      // edge cases (e.g. popup blockers, network failure). Reset to allow a
      // retry without the modal getting stuck on the spinner.
      setIsStartingOAuth(false);
    }
  };

  return (
    <Dialog
      open={signInDialogOpen}
      onOpenChange={(open) => {
        if (!open) dismissSignIn();
      }}
    >
      <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Satellite size={22} />
          </div>
          <DialogTitle className="text-center text-xl">
            Sign in to Outsights
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {signInReason ??
              "Sign in to unlock AI-guided insights and chat with the spatial copilot."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={!isConfigured || isStartingOAuth}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStartingOAuth ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <GoogleGlyph />
            )}
            <span>
              {isStartingOAuth ? "Redirecting…" : "Continue with Google"}
            </span>
          </button>

          {!isConfigured && (
            <p className="rounded-lg border border-amber-900/60 bg-amber-950/50 p-3 text-xs leading-relaxed text-amber-200">
              Sign-in is not configured for this environment. Set{" "}
              <code className="font-mono">VITE_SUPABASE_URL</code> and{" "}
              <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code>{" "}
              to enable it.
            </p>
          )}

          <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <ShieldCheck size={12} className="text-primary" />
            <span>
              We only request your name, email, and avatar from Google.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Inline Google "G" mark — avoids dragging in another icon dependency. */
const GoogleGlyph = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.55-1.85.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.95A8.997 8.997 0 0 0 0 9c0 1.45.35 2.82.95 4.04l3.02-2.33z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.46.89 11.42 0 9 0A8.997 8.997 0 0 0 .95 4.96l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
    />
  </svg>
);
