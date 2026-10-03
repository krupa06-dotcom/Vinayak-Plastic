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

    // 4. Get paths to revalidate from request body
    const body = await req.json().catch(() => ({}));
    const { paths = ['/'], tags = [] } = body;

    // 5. For static export, trigger a rebuild via Vercel's deploy hook if configured
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    
    if (deployHookUrl) {
      try {
        const deployRes = await fetch(deployHookUrl, { method: 'POST' });
        if (deployRes.ok) {
          return NextResponse.json({ 
            ok: true, 
            revalidated: false, 
            rebuild: true, 
            message: 'Site rebuild triggered - changes will be live in ~2 minutes',
            ts: Date.now() 
          });
        }
      } catch (deployError) {
        console.error('[revalidate] deploy hook failed:', deployError);
      }
    }

    // 6. For server-side rendering, revalidate specific paths and tags
    const revalidatedPaths = [];
    const revalidatedTags = [];

    for (const path of paths) {
      try {
        revalidatePath(path, 'page');
        revalidatedPaths.push(path);
      } catch (revalidateError) {
        console.error(`[revalidate] failed to revalidate path ${path}:`, revalidateError);
      }
    }

    for (const tag of tags) {
      try {
        revalidateTag(tag, 'page');
        revalidatedTags.push(tag);
      } catch (revalidateError) {
        console.error(`[revalidate] failed to revalidate tag ${tag}:`, revalidateError);
      }
    }

    if (revalidatedPaths.length > 0 || revalidatedTags.length > 0) {
      return NextResponse.json({ 
        ok: true, 
        revalidated: true, 
        paths: revalidatedPaths,
        tags: revalidatedTags,
        message: `Revalidated ${revalidatedPaths.length} path(s) and ${revalidatedTags.length} tag(s) - changes should be live immediately`,
        ts: Date.now() 
      });
    }

    // 7. Fallback: Just acknowledge the request
    return NextResponse.json({ 
      ok: true, 
      revalidated: false, 
      rebuild: false,
      message: 'Changes saved to database. Revalidation method not configured.',
      ts: Date.now() 
    });
  } catch (err) {
    console.error('[revalidate] error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
