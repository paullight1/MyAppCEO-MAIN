import { createClient } from '@supabase/supabase-js';
import { createAuthStorage } from './authStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables! Check your .env file.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Session persistence is centralised in authStorage.ts (see the note there
    // on the server-side work required for true httpOnly cookies). The default
    // storageKey is kept so existing sessions survive this change.
    storage: createAuthStorage(),
  },
  global: {
    headers: { 'x-application-name': 'mvplab-marketplace' },
    fetch: async (input, init) => {
      try {
        const response = await fetch(input, init);
        return response;
      } catch (error) {
        // A thrown fetch here is almost always DNS/connection failure — most
        // commonly a paused or deleted Supabase project (free-tier projects
        // pause after ~1 week idle). Surface that explicitly; the generic
        // "Failed to fetch" is otherwise very hard to diagnose.
        console.warn(
          `[supabase] Could not reach ${SUPABASE_URL}. The project may be paused/deleted, ` +
            'or you may be offline. Check the Supabase dashboard and VITE_SUPABASE_URL.',
        );
        throw error;
      }
    },
  },
});
