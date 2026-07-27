/**
 * Client SDK for the backend auth broker (httpOnly cookie sessions).
 *
 * These endpoints let the SERVER hold the Supabase tokens in httpOnly cookies —
 * the browser never sees them. Every call uses `credentials: 'include'` so the
 * cookies are sent/received automatically; no token is ever passed in JS.
 *
 * NOTE ON ADOPTION: the app currently also uses supabase-js directly for
 * RLS-protected data reads, which requires the access token to be readable in
 * JS. Fully switching to httpOnly cookies means those direct Supabase reads must
 * move behind the backend API too. Until that migration is done, this SDK is the
 * cookie-based path; `useAuth`/supabase-js remains the data path.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface BrokerUser {
  id: string;
  email: string | null;
  fullName?: string | null;
  role?: string | null;
}

const request = async <T>(
  path: string,
  init: RequestInit & { allow401?: boolean } = {},
): Promise<T> => {
  const { allow401, ...rest } = init;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers || {}),
    },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (res.status === 401 && allow401) return null as T;
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  // Unwrap the backend's { success, data } envelope.
  return (json?.data ?? json) as T;
};

/** Sign in; the server sets httpOnly cookies. Returns the user. */
export const brokerLogin = (email: string, password: string) =>
  request<{ user: BrokerUser }>('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

/** Register; sets cookies unless email confirmation is required. */
export const brokerSignup = (email: string, password: string, fullName: string, role?: string) =>
  request<{ user: BrokerUser | null; needsEmailConfirmation: boolean }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName, ...(role ? { role } : {}) }),
  });

/** Rotate the session using the refresh cookie. */
export const brokerRefresh = () =>
  request<{ user: BrokerUser }>('/auth/refresh', { method: 'POST' });

/** Returns the current user, or null when not authenticated. */
export const brokerGetSession = () =>
  request<{ user: BrokerUser } | null>('/auth/session', {
    method: 'GET',
    allow401: true,
  });

/** Clears cookies and revokes the session server-side. */
export const brokerLogout = () =>
  request<{ success: boolean }>('/auth/logout', { method: 'POST' });
