import { useContext } from "react";

import {
  AuthContext,
  type AuthContextValue,
} from "@/components/auth/auth-context";

/**
 * Read the current auth state. Must be used inside an `<AuthProvider>`.
 */
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
};
