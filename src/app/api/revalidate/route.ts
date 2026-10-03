import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Secret token to protect this endpoint — set REVALIDATE_SECRET in Vercel env vars
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

const ADMIN_EMAIL_DOMAIN = '@vinayakplastics.com';

export async function POST(req: Request) {
  try {
    // 1. Validate secret token
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    // 2. If REVALIDATE_SECRET is set, check it first (fast path for server-to-server calls)
    const isSecretValid = REVALIDATE_SECRET && token === REVALIDATE_SECRET;

    // 3. Otherwise verify it's a valid Supabase admin session
    if (!isSecretValid) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user?.email) {
        return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
      }

      if (!user.email.toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN)) {
        return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
      }
    }

    // 4. Revalidate all product/catalogue pages
    revalidatePath('/', 'layout');          // home page
    revalidatePath('/products', 'layout'); // all product pages
    revalidateTag('hierarchy');            // tagged fetches

    return NextResponse.json({ ok: true, revalidated: true, ts: Date.now() });
  } catch (err) {
    console.error('[revalidate] error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
