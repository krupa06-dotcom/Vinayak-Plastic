import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Check if Supabase is properly configured (not placeholder values)
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
    'Supabase is not configured. Falling back to static data. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env file to enable database integration.'
  );
}

type Supabase = ReturnType<typeof createClient<Database>>;

export const supabase = hasSupabase()
  ? (createClient<Database>(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        persistSession: false
      }
    }) as Supabase)
  : (null as unknown as Supabase);

