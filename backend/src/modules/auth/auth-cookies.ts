import type { Request, Response } from 'express';

/**
 * httpOnly cookie helpers for the auth broker.
 *
 * The backend performs the Supabase sign-in and stores the resulting tokens in
 * httpOnly cookies, so the browser JavaScript never sees them (mitigating XSS
 * token theft). Reading is done by parsing the raw Cookie header, so no
 * cookie-parser middleware dependency is required.
 */

export const ACCESS_TOKEN_COOKIE = 'mvplab_access_token';
export const REFRESH_TOKEN_COOKIE = 'mvplab_refresh_token';

const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_ACCESS_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour fallback

type SameSite = 'lax' | 'strict' | 'none';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

const sameSite = (): SameSite =>
  (process.env.AUTH_COOKIE_SAMESITE as SameSite) || 'lax';

const cookieDomain = (): string | undefined =>
  process.env.AUTH_COOKIE_DOMAIN || undefined;

const baseOptions = () => {
  const secure = isProduction() || sameSite() === 'none';
  return {
    httpOnly: true,
    secure, // SameSite=None requires Secure; always secure in prod
    sameSite: sameSite(),
    domain: cookieDomain(),
    path: '/',
  } as const;
};

export interface BrokerSession {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
}

export const setAuthCookies = (res: Response, session: BrokerSession): void => {
  const accessMaxAge = (session.expires_in ?? 0) * 1000 || DEFAULT_ACCESS_MAX_AGE_MS;

  res.cookie(ACCESS_TOKEN_COOKIE, session.access_token, {
    ...baseOptions(),
    maxAge: accessMaxAge,
  });

  if (session.refresh_token) {
    res.cookie(REFRESH_TOKEN_COOKIE, session.refresh_token, {
      ...baseOptions(),
      maxAge: REFRESH_MAX_AGE_MS,
    });
  }
};

export const clearAuthCookies = (res: Response): void => {
  // clearCookie must receive the same path/domain/attributes the cookie was set
  // with for the browser to actually remove it.
  const opts = baseOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
};

/** Reads a single cookie value from the raw Cookie header. */
export const readCookie = (req: Request, name: string): string | null => {
  const header = req.headers?.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
};
