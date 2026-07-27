/**
 * MVPLAB API Client — centralised fetch wrapper for NestJS backend.
 *
 * All hooks must go through this module instead of calling fetch() directly.
 * Supabase calls remain inside their own hooks and are NOT routed here.
 */

import { supabase } from './supabaseClient';
import { getAccessToken, requireAccessToken } from './authToken';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const CSRF_TOKEN_KEY = 'mvplab_csrf_token';

const getCsrfToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(CSRF_TOKEN_KEY) || null;
};

const setCsrfToken = (token: string): void => {
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
};

// ─── Constants ───────────────────────────────────────────────────────────────

// ─── Auth helpers ─────────────────────────────────────────────────────────────

// Token access is centralised in authToken.ts so the API client and the auth
// context share one source and cannot drift. Re-exported for existing callers.
export const getAuthToken = getAccessToken;
export const requireAuthToken = requireAccessToken;

// ─── Request options builders ─────────────────────────────────────────────────

const jsonHeaders = (token?: string | null): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const authHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
});

const resolveRequestToken = async (
  requireAuth: boolean,
  multipart: boolean,
): Promise<string | null> => {
  if (multipart && requireAuth) {
    return requireAuthToken();
  }

  try {
    return requireAuth ? await requireAuthToken() : await getAuthToken();
  } catch {
    // Keep the current JSON request semantics: if auth is unavailable, proceed
    // without an Authorization header and let the backend decide.
    return null;
  }
};

// ─── Core request function ────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Set to true to skip Content-Type header (e.g. FormData uploads) */
  multipart?: boolean;
  /** Set to true to require & attach Bearer token */
  requireAuth?: boolean;
}

async function request<T>(
  path: string,
  { method = 'GET', body, multipart = false, requireAuth = false }: RequestOptions = {},
): Promise<T> {
  const token = await resolveRequestToken(requireAuth, multipart);
  const csrfToken = getCsrfToken();

  const headers: HeadersInit = {
    ...(multipart
      ? token
        ? authHeaders(token)
        : {}
      : jsonHeaders(token)),
    ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body !== undefined
          ? JSON.stringify(body)
          : undefined,
      credentials: 'include',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    if (message.includes('fetch') || message.includes('NetworkError') || message.includes('ERR_CONNECTION')) {
      throw new Error('Backend API is not available. Please ensure the server is running.');
    }
    throw err;
  }

  const newCsrfToken = response.headers.get('X-CSRF-Token');
  if (newCsrfToken) {
    setCsrfToken(newCsrfToken);
  }

  const responseText = await response.text();
  let json: any = null;
  if (responseText) {
    try {
      json = JSON.parse(responseText);
    } catch {
      if (!response.ok && response.status >= 500) {
        throw new Error('Backend API is not available. Please ensure the server is running.');
      }
      throw new Error(`Invalid API response: ${response.status} ${response.statusText}`);
    }
  }

  if (!response.ok || json?.success === false) {
    if (response.status === 401) {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    }
    if (response.status === 403) {
      throw new Error('Access denied. Your session may have expired.');
    }
    throw new Error(json?.message || `Request failed: ${response.status} ${response.statusText}`);
  }

  return json as T;
}

// ─── Public API surface ───────────────────────────────────────────────────────

/** GET with no authentication */
export const apiGet = <T>(path: string): Promise<T> =>
  request<T>(path, { method: 'GET' });

/** GET with Bearer token */
export const apiGetAuth = <T>(path: string, options?: { method?: 'GET' | 'DELETE' }): Promise<T> =>
  request<T>(path, { method: options?.method || 'GET', requireAuth: true });

/** POST JSON body with Bearer token */
export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body, requireAuth: true });

/** POST JSON body without authentication (e.g. public endpoints) */
export const apiPostPublic = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body, requireAuth: false });

/** PATCH JSON body with Bearer token */
export const apiPatch = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'PATCH', body, requireAuth: true });

/** DELETE with Bearer token */
export const apiDelete = <T>(path: string): Promise<T> =>
  request<T>(path, { method: 'DELETE', requireAuth: true });

/** POST multipart/form-data with Bearer token */
export const apiUpload = <T>(path: string, formData: FormData): Promise<T> =>
  request<T>(path, { method: 'POST', body: formData, multipart: true, requireAuth: true });

export const getApiData = <T>(response: T | { data?: T } | null | undefined, fallback: T): T => {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return (response as T) ?? fallback;
};
