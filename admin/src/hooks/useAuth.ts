import { useContext } from 'react';
import { AuthContext, AuthContextValue } from '../context/AuthContext';

export const POST_AUTH_REDIRECT_KEY = 'mvplab_post_auth_redirect';

// Re-exported for backward compatibility with existing imports.
export type { AppAuthUser } from '../lib/authOperations';

/**
 * Reads the shared auth state provided by <AuthProvider>. The public API is
 * unchanged from the previous standalone hook, so existing call sites keep
 * working — the difference is that all consumers now share one session and one
 * onAuthStateChange subscription instead of each creating their own.
 */
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
};
