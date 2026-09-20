import { createClient } from 'npm:@supabase/supabase-js@2';

// ============================================================
// deploy-site — triggers a rebuild after admin content changes.
//
// The public Vinayak site is a static Astro build hosted on Vercel, so admin
// edits only go live once the site is rebuilt. This function is called by the
// admin panel (scripts/admin/core.ts -> publishSite()) after every save and:
//   * POSTs to the configured Vercel Deploy Hook when VERCEL_DEPLOY_HOOK is
//     set (preferred — this rebuilds the site on Vercel without touching git);
//   * otherwise falls back to dispatching a `deploy_site` repository event
//     that .github/workflows/deploy.yml picks up for GitHub Pages.
//
// Auth: the caller's Supabase session is verified and must belong to an
// @vinayakplastics.com account before anything is dispatched.
//
// Secrets required (set with the Supabase CLI against project eysponcqvylopmfskevu):
//   supabase secrets set VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/prj_xxx/token
// Create the deploy hook in Vercel: Project Settings -> Deploy Hooks -> "Publish site"
// (Production Branch). Vercel builds will also need SUPABASE_URL and
// SUPABASE_PUBLISHABLE_KEY set in the project's Environment Variables.
//
// Legacy GitHub Pages support (optional):
//   supabase secrets set GITHUB_PAT=ghp_xxxxxxxx GITHUB_REPO=krupa06-dotcom/Vinayak-Plastic
// ============================================================

const VERCEL_DEPLOY_HOOK = Deno.env.get('VERCEL_DEPLOY_HOOK') ?? '';
const REPO = Deno.env.get('GITHUB_REPO') ?? '';
const TOKEN = Deno.env.get('GITHUB_PAT') ?? '';
const ADMIN_EMAIL = /^[^@\s]+@vinayakplastics\.com$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

/** Trigger a Vercel production deploy through the project's deploy hook. */
async function triggerVercel(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(VERCEL_DEPLOY_HOOK, { method: 'POST' });
  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, error: `Vercel deploy hook failed (${res.status}): ${detail}` };
  }
  return { ok: true };
}

/** Legacy fallback: dispatch a `deploy_site` event the GitHub Pages workflow listens for. */
async function triggerGitHub(): Promise<{ ok: boolean; error?: string }> {
  if (!REPO || !TOKEN) {
    return { ok: false, error: 'VERCEL_DEPLOY_HOOK is not configured. Run: supabase secrets set VERCEL_DEPLOY_HOOK=... (and optionally GITHUB_PAT / GITHUB_REPO for GitHub Pages fallback)' };
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
    return { ok: false, error: `GitHub dispatch failed (${res.status}): ${detail}` };
  }
  return { ok: true };
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

  const vercel = VERCEL_DEPLOY_HOOK ? await triggerVercel() : null;
  if (vercel) {
    if (vercel.ok) return json({ ok: true, platform: 'vercel' });
    return json({ error: vercel.error }, 502);
  }

  // No deploy hook configured — fall back to the GitHub Pages dispatch.
  const gh = await triggerGitHub();
  if (!gh.ok) return json({ error: gh.error }, 500);
  return json({ ok: true, platform: 'github' });
});