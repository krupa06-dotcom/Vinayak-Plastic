import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export type Supabase = ReturnType<typeof createClient<Database>>;

export function hasSupabase(): boolean {
  return Boolean(
    supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabasePublishableKey.includes('sb_publishable_xxxxx')
  );
}

if (!hasSupabase()) {
  console.warn(
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  );
}

export const supabase = (
  hasSupabase()
    ? createClient<Database>(supabaseUrl, supabasePublishableKey, {
        auth: { persistSession: false }
      })
    : null
) as Supabase;

/**
 * Supabase client bound to a signed-in admin's access token. Used by Server
 * Actions so writes run with that admin's RLS permissions instead of the
 * anonymous role.
 */
export function createAdminSupabase(accessToken: string): Supabase {
  if (!hasSupabase()) {
    throw new Error('Supabase is not configured.');
  }

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}