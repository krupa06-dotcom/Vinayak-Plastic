# `deploy-site` — Vercel rebuild hook

The live site is a Next.js **static export** (`next.config.mjs` → `output: 'export'`)
on Vercel. All Supabase content is baked in at build time, so an admin save only
reaches visitors after a rebuild. This function POSTs a Vercel Deploy Hook to start
that rebuild.

There is no GitHub Pages deployment anywhere in this project — the hook is Vercel's.

## Source

Create `supabase/functions/deploy-site/index.ts` with:

```ts
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
```

## Why `--no-verify-jwt`

The platform's built-in JWT check runs **before** your code, on every request —
including the browser's `OPTIONS` preflight, which never carries an
`Authorization` header. It answers 401, and the browser reports:

```
preflight … doesn't pass access control check: It does not have HTTP ok status
```

So the function authenticates the caller itself (GoTrue `/auth/v1/user`), restricted
to `@vinayakplastics.com`, matching the `public.is_admin()` rule in the migrations.

## Setup (once per project)

1. Vercel → project → **Settings → Deploy Hooks → Create** (production branch). Copy
   the URL.
2. Create `supabase/functions/deploy-site/index.ts` (above), then:

```sh
npx supabase login
npx supabase functions deploy deploy-site --no-verify-jwt --project-ref <ref>
npx supabase secrets set VERCEL_DEPLOY_HOOK=<deploy hook url> --project-ref <ref>
```

Optional secrets:

- `SUPABASE_PUBLISHABLE_KEY` — only needed if the project has no default
  `SUPABASE_ANON_KEY`; used to validate the caller's token.
- `ALLOWED_ORIGINS` — comma-separated admin origins. Unset means `*`, which is safe
  here: the caller must still present a valid admin session token.

## Verify

```sh
curl -i -X OPTIONS 'https://<ref>.supabase.co/functions/v1/deploy-site' \
  -H 'Origin: https://vinayakplastic.vercel.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization'
```

Expect `200` with `Access-Control-Allow-Origin` present. A `404` means the function
was never deployed; a `401` means it was deployed without `--no-verify-jwt`.
