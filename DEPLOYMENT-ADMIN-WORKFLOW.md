# Deployment & Admin Workflow

## Architecture

A standard Next.js App Router application deployed to Vercel. There is no static
export and no separate rebuild step.

```
Admin panel (client components)
  └─ writes directly to Supabase
  └─ then calls the revalidateSite() Server Action
        └─ updateTag('hierarchy'), updateTag('settings')
        └─ revalidatePath('/', 'layout')

Public pages (server components)
  └─ read through unstable_cache with those tags
  └─ export const revalidate = 3600 as a background-refresh fallback
```

## Why admin changes appear immediately

Public page data is wrapped in `unstable_cache` (see `src/lib/cache.ts`). Tag
entries are dropped by `revalidateSite()` in `src/app/admin/actions.ts`, and
`revalidatePath('/', 'layout')` clears the rendered route cache. The next request
to any public page re-renders from fresh database rows.

The `revalidate = 3600` value on each route is only a fallback for the case where
no admin write has happened — it is not what makes updates appear.

## Environment variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

No deploy hook, no revalidation secret, and no `VERCEL_*` variables are needed.
Any previously configured `VERCEL_DEPLOY_HOOK_URL` or `REVALIDATE_SECRET` in the
Vercel project can be deleted.

## Adding a new admin write

Call `publishSite()` from `@/scripts/admin/core` after a successful write. If the
page navigates immediately afterwards, use `await publishSiteNow()` instead so
the request is not aborted by the unload.

## Troubleshooting

**Change saved but not visible**
Confirm the admin toast says "Saved - website updated". If it reports
"Website not refreshed", the Server Action was rejected — check that the signed-in
account uses an `@vinayakplastics.com` email.

**New product returns 404**
Product routes no longer set `dynamicParams = false`, so newly created
categories, series and versions resolve as soon as the data cache is dropped.
Confirm the write actually succeeded in the admin panel.

**Build fails to fetch Supabase data**
`next build` reads live from Supabase. Ensure the build environment has
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set in the
Vercel project. Requests are never served from a stale build cache, but a failed
query falls back to the bundled sample catalogue.