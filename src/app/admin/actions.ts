'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { CACHE_TAGS } from '@/lib/cache';

const ADMIN_EMAIL_DOMAIN = '@vinayakplastics.com';

/**
 * Called by the admin panel after a successful write so the public site picks
 * the change up on the next request. Drops both tagged data caches and the
 * full route cache, so every page re-renders from fresh database rows.
 */
export async function revalidateSite(accessToken: string): Promise<{ ok: boolean; error?: string }> {
  if (!accessToken) {
    return { ok: false, error: 'Not signed in' };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    { auth: { persistSession: false } }
  );

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(accessToken);

  if (error || !user?.email || !user.email.toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN)) {
    return { ok: false, error: 'Not authorised' };
  }

  updateTag(CACHE_TAGS.hierarchy);
  updateTag(CACHE_TAGS.settings);
  revalidatePath('/', 'layout');

  return { ok: true };
}