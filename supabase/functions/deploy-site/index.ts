import { createClient } from 'npm:@supabase/supabase-js@2';

// ============================================================
// deploy-site — triggers a GitHub Pages rebuild after admin content changes.
//
// The public Vinayak site is a static Astro build, so admin edits only go live
// once .github/workflows/deploy.yml rebuilds. This function is called by the
// admin panel (scripts/admin/core.ts -> publishSite()) after every save and
// dispatches a `deploy_site` repository event that the workflow picks up.
//
// Auth: the caller's Supabase session is verified and must belong to an
// @vinayakplastics.com account before anything is dispatched.
//
// Secrets required (set with the Supabase CLI against project eysponcqvylopmfskevu):
//   supabase secrets set GITHUB_PAT=ghp_xxxxxxxx GITHUB_REPO=krupa06-dotcom/Vinayak-Plastic
// GITHUB_PAT needs the `repo` scope (classic) or fine-grained "Actions: write".
// ============================================================

const REPO = Deno.env.get('GITHUB_REPO') ?? '';
const TOKEN = Deno.env.get('GITHUB_PAT') ?? '';
const ADMIN_EMAIL = /^[^@\s]+@vinayakplastics\.com$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Missing authorization' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return json({ error: 'Unauthorized' }, 401);
  if (!ADMIN_EMAIL.test(user.email ?? '')) return json({ error: 'Forbidden' }, 403);

  if (!REPO || !TOKEN) {
    return json({
      error: 'GITHUB_REPO / GITHUB_PAT are not configured. Run: supabase secrets set GITHUB_PAT=ghp_... GITHUB_REPO=krupa06-dotcom/Vinayak-Plastic'
    }, 500);
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'vinayak-plastics',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ event_type: 'deploy_site' })
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: `GitHub dispatch failed (${res.status}): ${detail}` }, 502);
  }

  return json({ ok: true });
});