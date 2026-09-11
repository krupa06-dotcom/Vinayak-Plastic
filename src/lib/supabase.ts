import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabasePublishableKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

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
    'Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your .env file to enable database integration.'
  );
}

export const supabase = hasSupabase()
  ? createClient<Database>(supabaseUrl, supabasePublishableKey)
  : (null as unknown as ReturnType<typeof createClient<Database>>);
