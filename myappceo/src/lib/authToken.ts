/**
 * Single source of truth for the current access token.
 *
 * Both the auth context (React state) and the API client read the token through
 * these functions, so they can never drift. `supabase.auth.getSession()` is the
 * underlying source — it returns the persisted session and transparently
 * refreshes it when close to expiry, so callers always get a valid token
 * without maintaining their own cache.
 */
import { supabase } from './supabaseClient';

export const getAccessToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

export const requireAccessToken = async (): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please log in.');
  return token;
};
