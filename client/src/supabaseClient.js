import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY. ' +
      'Supabase features will not work until the environment variables are configured.'
  );
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const normalizeSupabaseUser = (user) => {
  if (!user) return null;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.displayName ||
    user.email?.split('@')[0] ||
    'Player';

  return {
    ...user,
    uid: user.id,
    displayName,
    photoURL: user.user_metadata?.avatar_url || user.user_metadata?.photoURL || null,
  };
};