/**
 * Pure auth operations — thin, React-free wrappers around supabase.auth.
 *
 * Splitting these out of the hook keeps the provider small (state + wiring) and
 * makes each operation independently testable. Nothing here touches React state.
 */
import { supabase } from './supabaseClient';
import type { AuthError, Session, User } from '@supabase/supabase-js';

export type AppAuthUser = User & {
  defaultAppId?: string;
  fullName?: string;
  avatarUrl?: string;
};

export const ERROR_MESSAGES = {
  SIGN_IN_FAILED: 'Failed to sign in. Please check your credentials.',
  SIGN_UP_FAILED: 'Failed to sign up. Please try again.',
  SIGN_OUT_FAILED: 'Failed to sign out. Please try again.',
  SESSION_FETCH_FAILED: 'Failed to fetch session data.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  NETWORK_ERROR: 'Unable to connect to authentication service. Check your network.',
} as const;

export const isNetworkError = (err: unknown): boolean => {
  if (err instanceof TypeError && err.message === 'Failed to fetch') return true;
  if (err instanceof Error && err.message.includes('Failed to fetch')) return true;
  return false;
};

export const isExpired = (session: Session | null): boolean => {
  if (!session?.expires_at) return false;
  return session.expires_at * 1000 <= Date.now();
};

export const asAppAuthUser = (user: User | null | undefined): AppAuthUser | null =>
  user ? (user as AppAuthUser) : null;

/**
 * Resolves the initial session, refreshing it first if it is already expired.
 * Throws on unrecoverable errors so the caller can map them to UI state.
 */
export const getInitialSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;

  if (isExpired(session)) {
    const { data, error: refreshError } = await supabase.auth.refreshSession(session);
    if (refreshError) throw refreshError;
    if (!data.session) throw new Error(ERROR_MESSAGES.TOKEN_EXPIRED);
    return data.session;
  }

  return session;
};

export const refreshSession = () => supabase.auth.refreshSession();

export const signInWithPassword = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithPassword = (
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
) => supabase.auth.signUp({ email, password, options: { data: metadata } });

export const signOut = () => supabase.auth.signOut();

export type { AuthError, Session };
