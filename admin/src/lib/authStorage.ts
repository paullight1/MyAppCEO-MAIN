/**
 * Centralised storage adapter for the Supabase auth session.
 *
 * All decisions about *where* the session is persisted live here, so migrating
 * the storage strategy later touches exactly one file.
 *
 * ── On httpOnly cookies ──────────────────────────────────────────────────────
 * A pure browser SPA using supabase-js CANNOT store the session in an httpOnly
 * cookie: httpOnly cookies are, by definition, invisible to JavaScript, yet the
 * client needs to read the access token to attach it to requests and to refresh
 * it. Any cookie this file could set would be JS-readable — no better than
 * localStorage against XSS.
 *
 * True httpOnly sessions require the *server* to broker auth: the NestJS backend
 * performs the Supabase sign-in, sets an httpOnly + Secure + SameSite cookie,
 * and the SPA calls the API with `credentials: 'include'` (already the case in
 * apiClient). That is a separate, larger change. When it lands, swap
 * `createAuthStorage()` for a no-op/isomorphic adapter and point supabase-js at
 * the server session — the rest of the app keeps using the same `supabase`
 * client and `useAuth()`.
 *
 * Until then this adapter wraps localStorage with a resilient in-memory fallback
 * so auth still works where storage is blocked (private mode, embedded webviews).
 */

const STORAGE_KEY_PREFIX = 'mvplab.auth';

type SupabaseAuthStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const isBrowserStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const probe = `${STORAGE_KEY_PREFIX}.probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

export const AUTH_STORAGE_KEY = `${STORAGE_KEY_PREFIX}.token`;

export const createAuthStorage = (): SupabaseAuthStorage => {
  if (isBrowserStorageAvailable()) {
    return {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    };
  }

  // Fallback: session lives only for the current tab lifetime.
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };
};
