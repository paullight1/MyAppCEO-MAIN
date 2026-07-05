import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import {
  AppAuthUser,
  ERROR_MESSAGES,
  asAppAuthUser,
  getInitialSession,
  isNetworkError,
  refreshSession as refreshSessionOp,
  signInWithPassword,
  signOut as signOutOp,
  signUpWithPassword,
} from '../lib/authOperations';

type AuthOperationResult<T> = Promise<{ data: T | null; error: AuthError | Error | null }>;

export interface AuthContextValue {
  user: AppAuthUser | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | Error | null;
  refreshSession: () => AuthOperationResult<Session>;
  signIn: (email: string, pass: string) => Promise<{ data: any; error: AuthError | Error | null }>;
  signUp: (
    email: string,
    pass: string,
    metadata?: Record<string, unknown>,
  ) => Promise<{ data: any; error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of auth state for the whole app. Previously every `useAuth()`
 * call created its own session state and `onAuthStateChange` subscription;
 * hosting it once here means one subscription and one initialization.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const nextSession = await getInitialSession();
        if (mounted) {
          setSession(nextSession);
          setUser(asAppAuthUser(nextSession?.user));
          setError(null);
        }
      } catch (err) {
        if (isNetworkError(err)) {
          console.warn('Supabase auth service unreachable. The project may be paused.');
          if (mounted) {
            setError(new Error(ERROR_MESSAGES.NETWORK_ERROR));
            setSession(null);
            setUser(null);
          }
        } else {
          console.error(ERROR_MESSAGES.SESSION_FETCH_FAILED, err);
          if (mounted) {
            setError(err instanceof Error ? err : new Error(ERROR_MESSAGES.SESSION_FETCH_FAILED));
            setSession(null);
            setUser(null);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(asAppAuthUser(nextSession?.user));
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshSession = useCallback(async (): AuthOperationResult<Session> => {
    try {
      setError(null);
      const { data, error: refreshError } = await refreshSessionOp();
      if (refreshError) throw refreshError;
      setSession(data.session);
      setUser(asAppAuthUser(data.session?.user));
      return { data: data.session, error: null };
    } catch (err) {
      const refreshError = err instanceof Error ? err : new Error(ERROR_MESSAGES.TOKEN_EXPIRED);
      setError(refreshError);
      setSession(null);
      setUser(null);
      await signOutOp();
      return { data: null, error: refreshError };
    }
  }, []);

  const signIn = useCallback(async (email: string, pass: string) => {
    try {
      setError(null);
      const { data, error: signInError } = await signInWithPassword(email, pass);
      if (signInError) throw signInError;
      setSession(data.session);
      setUser(asAppAuthUser(data.user));
      return { data, error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        const netErr = new Error(ERROR_MESSAGES.NETWORK_ERROR);
        setError(netErr);
        return { data: null, error: netErr };
      }
      const authError = err as AuthError;
      setError(authError);
      console.error(ERROR_MESSAGES.SIGN_IN_FAILED, err);
      return { data: null, error: authError };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, pass: string, metadata: Record<string, unknown> = {}) => {
      try {
        setError(null);
        const { data, error: signUpError } = await signUpWithPassword(email, pass, metadata);
        if (signUpError) throw signUpError;
        setSession(data.session);
        setUser(asAppAuthUser(data.user));
        return { data, error: null };
      } catch (err) {
        if (isNetworkError(err)) {
          const netErr = new Error(ERROR_MESSAGES.NETWORK_ERROR);
          setError(netErr);
          return { data: null, error: netErr };
        }
        const authError = err as AuthError;
        setError(authError);
        console.error(ERROR_MESSAGES.SIGN_UP_FAILED, err);
        return { data: null, error: authError };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      setError(null);
      const { error: signOutError } = await signOutOp();
      if (signOutError) throw signOutError;
      setUser(null);
      setSession(null);
    } catch (err) {
      setUser(null);
      setSession(null);
      if (!isNetworkError(err)) {
        const authError = err as AuthError;
        setError(authError);
        console.error(ERROR_MESSAGES.SIGN_OUT_FAILED, err);
      }
    }
  }, []);

  // Only produce a new context value when state changes; the operations are
  // stable via useCallback, so consumers don't re-render on every provider render.
  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, error, refreshSession, signIn, signUp, signOut }),
    [user, session, loading, error, refreshSession, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
