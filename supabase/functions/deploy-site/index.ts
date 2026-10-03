const ADMIN_EMAIL_DOMAIN = '@vinayakplastics.com';
const ALLOWED_HEADERS =
  'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage';
const ALLOWED_METHODS = 'POST, OPTIONS';

function allowedOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function corsHeaders(req: Request): Record<string, string> {
  const allow = allowedOrigins();
  const origin = (req.headers.get('origin') ?? '').replace(/\/$/, '');
  const value = allow.length === 0 ? '*' : allow.includes(origin) ? origin : allow[0];
  return {
    'Access-Control-Allow-Origin': value,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

function json(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function apiKey(): string {
  return Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
}

async function authenticate(req: Request): Promise<Response | null> {
  const projectUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  const key = apiKey();
  if (!projectUrl || !key) {
    return json(req, 500, { error: 'Function is missing SUPABASE_URL or an API key secret.' });
  }
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(req, 401, { error: 'Missing Authorization header.' });

  const res = await fetch(`${projectUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!res.ok) return json(req, 401, { error: 'Invalid or expired session.' });

  const user = (await res.json()) as { email?: string } | null;
  if (!(user?.email ?? '').toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN)) {
    return json(req, 403, { error: 'Not an admin.' });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') return json(req, 405, { error: 'Use POST.' });

  const authError = await authenticate(req);
  if (authError) return authError;

  const hook = Deno.env.get('VERCEL_DEPLOY_HOOK');
  if (!hook) return json(req, 500, { error: 'VERCEL_DEPLOY_HOOK secret is not set.' });

  try {
    const hookRes = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggered_by: 'supabase:deploy-site' }),
    });
    const detail = (await hookRes.json().catch(() => null)) as Record<string, unknown> | null;
    if (!hookRes.ok) {
      console.error('[deploy-site] hook rejected', hookRes.status, detail);
      return json(req, 502, { error: `Deploy hook returned HTTP ${hookRes.status}.` });
    }
    return json(req, 200, { ok: true, job: detail });
  } catch (e) {
    console.error('[deploy-site] hook request failed', e);
    return json(req, 502, { error: 'Could not reach the Vercel deploy hook.' });
  }
});
