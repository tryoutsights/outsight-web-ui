import { SUPABASE_CONFIGURED, supabase } from "@/lib/supabase";

/** Base URL for the FastAPI backend; falls back to localhost for dev. */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8000";

export type ApiFetchOptions = RequestInit & {
  /**
   * If true (default), attach the current Supabase access token as
   * `Authorization: Bearer …` when one is available. Set to false for
   * endpoints that must remain anonymous.
   */
  auth?: boolean;
};

/**
 * Thin wrapper around `fetch` that:
 *  1. Resolves relative paths against `API_BASE_URL`.
 *  2. Reads the latest Supabase session (auto-refreshed) and adds a Bearer
 *     header if the user is signed in.
 *
 * Returns the raw `Response` so callers retain full control over status
 * handling, streaming, etc.
 */
export async function apiFetch(
  path: string,
  { auth = true, headers, ...rest }: ApiFetchOptions = {},
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const finalHeaders = new Headers(headers);
  if (auth && SUPABASE_CONFIGURED) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token && !finalHeaders.has("Authorization")) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(url, { ...rest, headers: finalHeaders });
}

/** Convenience: GET → JSON, throwing on non-2xx. */
export async function apiGetJson<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const res = await apiFetch(path, { method: "GET", ...options });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
