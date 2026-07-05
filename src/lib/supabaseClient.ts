import { createClient } from '@supabase/supabase-js';

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
  },
  global: {
    headers: { 'x-application-name': 'mvplab-marketplace' },
    fetch: async (input, init) => {
      try {
        const response = await fetch(input, init);
        return response;
      } catch (error) {
        console.warn('Supabase connection failed. Check your network or if the project is paused.');
        throw error;
      }
    },
  },
});
