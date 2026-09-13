# VINAYAK PLASTICS — SYSTEM AUDIT

Audit date: 13 Sep 2026
Audited revision: `main` @ `6b4f536` — "fix the admin ui" (pushed 2026-09-12)
Scope: Public website (Astro 7.3.1 static), Admin panel (client-side Supabase), Supabase PostgreSQL / Auth / Storage, GitHub Pages deployment, RLS & security.

---

## Overall Status

🔴 **NOT READY FOR PRODUCTION.** (Build + typecheck pass, auth + RLS verified, admin covers the core feature set — but the system is **not deployed anywhere**, the storage bucket is missing, a dummy admin account with a publicly-known password is active on the linked project, and `product_images` is empty.)

| Signal | Result |
|---|---|
| `astro build` | ✅ Clean — 20 pages, no errors |
| `astro check` | ✅ 0 errors, 0 warnings (1 real hint: `Layout.astro:93` JSON-LD script) |
| Live DB connectivity | ✅ Reachable, sample data present |
| Admin → Auth + RLS | ✅ Verified live (admin sign-in OK, RLS hides private rows from anon) |
| Admin → Storage | ❌ **Failing** — bucket `product-images` does not exist ("Bucket not found") |
| Live public site = this system? | ❌ **No** — the live GitHub Pages site is the OLD pre-Astro placeholder site |
| CI/CD pipeline | ❌ None (no `.github/workflows`) |
| Deployment readiness | 🔴 Not deployable as-is until P0 items are fixed |

---

## Architecture Found

```
                            ┌────────────────────────────────────────────┐
                            │   GITHUB PAGES  (krupa06-dotcom.github.io) │
                            │   /Vinayak-Plastic/                        │
                            │   ⚠ LIVE = legacy placeholder site (HTML)  │
                            └────────────────────────────────────────────┘
                                     ▲ (manual npm run build + ??? — NOT working)

┌───────────────────────────────────┐        build-time (node)          ┌──────────────────────────┐
│  ASTRO STATIC BUILD  (dist/)      ├──────────────────────────────────►│  SUPABASE (Postgres)      │
│  output: 'static', base '/Vinayak- │  getStaticPaths() queries:        │  categories/products/etc. │
│  Plastic'                          │  products, variants, specs,       │  RLS enabled              │
│                                    │  site_settings                    │  Auth + is_admin()        │
│  Public pages: home, about,        │◄──────────────────────────────────│  Storage "product-images" │
│  products, product/[slug], contact │   only at BUILD TIME              │  ⚠ bucket MISSING         │
└───────────────────────────────────┘        (no runtime queries)        └──────────────────────────┘
        │                                                                    ▲
        │  static HTML                                                    │  client calls
        ▼                                                                    │
┌───────────────────────────────────┐        client-side (browser)       ┌──────────────────────────┐
│  ADMIN PAGES  (/admin/**)         ├──────────────────────────────────►│  window.__VP_SUPABASE__   │
│  Static HTML + JS gate            │   supabase-js (publishable key)   │  url + PUBLISHABLE key    │
│  auth: isAdminEmail(@vinayak      │   + user JWT session              │  (no secret key ever)     │
│  plastics.com) + RLS              │   CRUD/products/stock/enquiries   └──────────────────────────┘
└───────────────────────────────────┘
```

**Key architectural facts & consequences:**

1. **The public website is 100% build-time static.** Product pages, products listing, homepage, about, footer, and contact content are rendered from Supabase **only during `npm run build`**. There is **no runtime data query** on the public site. ✔ verified — built `dist/products/plastic-crates/index.html` contains DB variant data (header "Size (L × W × H)", rows VPC-400…VPC-700), not the fallback.
2. **Admin edits never reach visitors without a rebuild + redeploy.** Create/edit/deactivate from the admin panel updates the database only. Because the site is static and there is no CI, an admin "published" product does not exist publicly until someone rebuilds and redeploys. This is the single biggest product-level disconnect.
3. **Admin protection = client-side gate + RLS.** Admin routes are plain static HTML served publicly (an unauthenticated visitor sees the login/HTML; every page JS-`replace()`s to `/admin/login/` when not signed in). DB protection relies entirely on Supabase RLS (verified working), NOT on the shell page.
4. **No secrets server-side.** The only credentials embedded in shipped HTML are the Supabase URL and the **publishable (anon) key** — intended for client-side use. No service-role/secret key exists in `.env`, `.env.example` (commented), or `src/` (grepped). ✔
5. **README is stale** — it predates Astro/Supabase (references a `ProductCard.astro` component which does not exist), and no deployment / admin / env / storage setup is documented for the current stack.

---

## Connectivity

| # | Flow | Result | Evidence |
|---|---|---|---|
| 1 | Admin → Auth (sign-in) | ✅ **VERIFIED** | `signInWithPassword('admin@vinayakplastics.com' / 'Admin@123')` returned a session against the live project |
| 2 | Admin → Database (read) | ✅ **VERIFIED** | Admin session reads `enquiries` = **2 rows**; dashboard counts readable |
| 3 | Admin → Storage (upload) | ❌ **FAILING** | Upload to `product-images/...` → error **"Bucket not found"**; `storage.list` returns 0 files (bucket does not exist) |
| 4 | Public → Universidades (enquiry INSERT) | 🟡 **CODE PATH OK — not executed** | `EnquiryForm.astro` posts anon INSERT (status hard-coded `new`); public INSERT RLS policy exists in migration `20260910000000`. A live insert was **deliberately not performed** (would create data). Note: two existing test enquiries in DB prove the path has worked |
| 5 | Admin → Enquiries (update/delete) | 🟡 **TRACED — not executed** | RLS UPDATE/DELETE policies exist (`Admins can ...`); modal + status selectors traced in `admin/enquiries/index.astro`. Actual update not executed (data-modifying). |
| 6 | Admin CRUD → Public site | ❌ **NOT CONNECTED** | Static output; getStaticPaths at build time only. No runtime query layer, no SSR, no hybrid. Admin change requires rebuild+redeploy. |
| 7 | Current build → Live web | ❌ **NOT DEPLOYED** | Live pages = old hand-written HTML site (see Deployment below). No `/admin/**`, no `/products/*/`, no `_astro/` assets live. |
| 8 | Public site → Supabase (product data) | 🟡 **Build-time only** | Works at build (DB variants rendered). Nothing live at runtime. |

---

## Admin Features

| Feature | Status | Notes |
|---|---|---|
| Login / Logout | ✅ Implemented, **works** | `login.astro` + `core.ts` gate; redirect loop handled; non-`@vinayakplastics.com` users auto signed-out |
| Dashboard | ✅ Implemented | Live counts read OK; note: dashboard `Promise.all` parts don’t surface query errors (silent zeros if one query fails) |
| Products — list/create/edit/deactivate | 🟡 Implemented, **traced only** | Mutations not run (data-modifying). Image upload depends on missing storage bucket → will fail in UI. `product_images` empty. |
| Categories — list/create/edit/deactivate | 🟡 Implemented, traced only | RLS policies present |
| Sub-categories — list/create/edit/deactivate | 🟡 Implemented, traced only | RLS policies present |
| Enquiries — list/read/status update | ✅ List **verified** (2 rows), update traced | Test entries readable to admin via RLS |
| Media library (storage) | ❌ **Broken** | Bucket `product-images` doesn’t exist → empty list, upload errors |
| Website content editor | 🟡 Implemented; **partially dead** | Writes `site_settings` keys `homepage`/`about`. `homepage` is read by Hero at build (key is missing in DB → defaults). `about*` keys are never read anywhere (about page is hard-coded). |
| Settings editor (contact/social/seo) | 🟡 Implemented | `contact` IS consumed (footer + contact page at build time, verified — build shows the real phone). `social` is **not rendered anywhere** on the public site. |
| Industries | ❌ **No admin CRUD** | No industries page exists in `admin/`. Only "tagging" inside the product editor; no page to add/edit/deactivate industries. |

---

## Database & Security

**Schema**: `categories` → `sub_categories` → `products` → `product_images` / `product_specifications` / `product_variants`; `industries` / `product_industries`; `enquiries`; `site_settings`; `public.is_admin()` SECURITY DEFINER helper.

**Live data (read-only):**
`categories=4 · sub_categories=5 · products=4 · product_images=0 (EMPTY) · product_specifications=85 · product_variants=17 · industries=6 · product_industries=10 · enquiries=2 (viewable by admin, 0 by anon) · site_settings=4 (keys: company, contact, social, seo — no homepage/about keys)`

**RLS — verified behaviorally:**

- ✅ **Enquiries protected**: anon sees **0** rows while the 2 rows exist; admin sees **2**. (Both policies: public `INSERT` only; admins `SELECT/UPDATE/DELETE`.)
- ✅ Admin/others can read categories, sub_categories, products (active), specs, variants, industries, site_settings.
- ⚠ Anon can `SELECT` `product_images` / `product_specifications` / `product_variants` of **inactive** products too (policies use `USING (true)`); specs of deactivated products remain readable. Low-severity information exposure.
- ⚠ `site_settings` is publicly readable by design (footer/contact need it) — contains only contact/social/seo/content, nothing sensitive.

**Authentication / admin model:**

- Admin = email domain `@vinayakplastics.com` (client regex + `is_admin()` SQL). Simple and consistent.
- 🔴 **CRITICAL — dummy admin account live with public password.** Migration `20260912010000_dummy_admin_user.sql` hard-codes `admin@vinayakplastics.com` / `Admin@123`. We **verified sign-in succeeds** against the linked (presumably live/production) project. The password is in a committed migration. Anyone can log in to the deployed admin (once deployed) and read/modify data.
- 🔴 **Storage**: migration `20260911000000_admin_storage_rls.sql` creates RLS policies for a `product-images` bucket that **does not exist** in the live project (upload → "Bucket not found"). `STORAGE_SETUP.md` documents manual bucket creation, which was never done.
- Enquiries public INSERT uses `WITH CHECK (true)`: **no field validation, no honeypot, no rate limit, and an attacker can set `status` to any value** (e.g. "converted", bypassing admin workflow). Spam risk.

**Secrets / hygiene:**

- ✅ `.env` is gitignored; tracked `.env.example` only has placeholders.
- ✅ No service-role / secret key anywhere in `src/` (grepped `SUPABASE_SECRET`, `service_role`, `sb_secret`, `authorization: Bearer`). Only `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` are imported.
- ✅ Publishable URL+key are inlined in public `contact` page (EnquiryForm) and admin `__VP_SUPABASE__` — expected for client-side Supabase; not a leak.
- ⚠ `robots.txt` comments out `Disallow: /admin/` (intent unclear — admin pages do ship `noindex` meta, which is correct). Sitemap + robots are **static files** (won’t reflect new products).

---

## Hard-Coded / Mock Data (bypassing the database)

Verified in source + built HTML:

| Area | Where | Impact |
|---|---|---|
| Homepage product cards / category grid | `src/pages/index.astro` | Homepage "Our Product Range" is hard-coded (6 cards incl. "Lid Crates", "Ice Boxes" imagery) — DB changes won’t reflect even after rebuild |
| Products listing cards + "Ice Boxes & Racking / Also Available" | `src/pages/products/index.astro` | Category filter cards + extra cards hard-coded; match DB slugs by luck |
| About page — entirely | `src/pages/about.astro` | Stats, values, description all hard-coded; `about*` site_settings never read |
| Footer product links + brand blurb | `src/components/Footer.astro` | Hard-coded product names → slugs |
| Hero copy | `src/components/Hero.astro` | Reads `site_settings.homepage` (key **absent in DB**) → defaults used |
| Product fallback data | `[slug].astro` + `products/index.astro` | `fallbackProducts` used when DB/config missing |
| Product bodies/values fallback | `src/lib/supabase.ts` | Static fallback when env unset (partially duplicates products) |
| Contact fallback | `src/lib/contact.ts` | Hard-coded contact used when DB missing |
| `localBusiness` schema + SITE/BASE | `src/layouts/Layout.astro` | Hard-coded org/contact JSON-LD |
| `site_settings` `seo` key | settings admin | Not read by Layout.astro meta (title/description are hard-coded in frontmatter) |

---

## Bugs Found

1. 🔴 **Storage bucket `product-images` does not exist** → Admin Media Library broken + product image upload always fails ("Bucket not found", executed against live project).
2. 🔴 **Dummy admin uses a publicly-known password and it verifies** against the linked (live) Supabase project. Anyone can sign in as admin (once admin is deployed) or, worse, via Supabase Dashboard if the same project is used elsewhere.
3. 🔴 **The audited system is not deployed.** Live GitHub Pages at `/Vinayak-Plastic/` serves the **legacy pre-Astro placeholder site**: flat `index.html`, `about.html`, `products.html` files, placeholder contact **"+91 XXXXX-XXXXX"**, **"[City, State]"**, and a visible "Placeholder — replace before publishing" footer. The Astro build (with working contact `+919558747862`) exists only in `dist/`. No `dist` is committed, no `.github/workflows`, only branch `main`, Pages API returns 404 — Pages build has been failing since the Astro conversion and is serving the last successful (legacy) deployment.
4. 🟡 **`product_images` is empty** → product detail pages fall back to bundled local placeholder images; DB-driven media path has zero data to show.
5. 🟡 **DB image URLs are broken** — sample data references `/images/products/*.webp` (e.g. `plastic-crates.webp`); all **404** on the built site and do not exist in storage/public.
6. 🟡 **`site_settings` has no `homepage` or `about` keys** → Hero uses fallback copy; the about page ignores DB; the Website Content editor writes keys that mostly nothing reads → admin users will edit content that "saves successfully" but changes nothing visible.
7. 🟡 **Legacy spec-table key mismatch** (masked today): sample spec names like `"Size (mm)"` produce object keys (`size (mm)`) that the old spec-table renderer (`spec.size`) doesn’t read. Currently hidden because all products use the newer **variants** branch; will break if a product has specs but no variants.
8. 🟡 **Enquiry spam/security**: public INSERT with `WITH CHECK (true)` — unvalidated fields, arbitrary `status`, unlimited submissions.
9. 🟡 **No Industries admin CRUD** — feature is read/tag-only.
10. 🟠 Footer "Ice Boxes & Racking" links to `/products` (mislabeled generic link); `robots.txt` Disallow for `/admin/` commented out.
11. 🟠 Legacy analytics: the live legacy site references **Unsplash** and Google Fonts — fine for the old site, but irrelevant to the new build (which self-hosts fonts/images).

**Nits:** Dashboard silently tolerates query errors; `gate()` 10 s timeout can leave admin page stuck on the spinner in rare races; sample enquiry rows ("Verification Test — delete me", 2026-09-11) linger in live `enquiries`.

---

## Performance

- Public pages load **0 external JS files** (verified in `dist`); CSS is **inlined** (`inlineStylesheets: 'always'`): `style.css` ≈ 47.9 KB inlined into HTML (home ≈ 64 KB HTML), fonts self-hosted, images processed by Sharp with multiple sizes. ✔ Good.
- Admin bundle `_astro/core.CDKXnRPC.js` = **220,467 B** (~215 KB) loads only on `/admin/**` (verified: not referenced on public pages). Acceptable for an internal tool.
- Media/storage failure is not a bandwidth issue but a capability one (empty bucket).

---

## Production Readiness Scores (out of 10)

| Area | Score | Notes |
|---|---|---|
| Public Face / DB Integration | 5 | Build-time DB works; but hero/about/homepage/footer hard-coded, sitemap static, no runtime sync |
| Admin Features | 7 | All core CRUD present; media broken; industries CRUD absent; website-content half-dead |
| Security & RLS | 5 | RLS verified & good foundation; dummy known password live; unvalidated public INSERT; client-side-only gate |
| Deployment & Ops | 1 | No CI, no pages build, live site = placeholder, storage bucket missing, no env/storage docs for current stack |
| Performance | 8 | Lean public pages, inlined CSS, 0 external JS, self-hosted fonts |
| Reliability & Error Handling | 6 | Good toasts/empty states; dashboard silent errors; storage-dependent flows break at runtime without guidance |

---

## Priority Fixes

**P0 (must fix before any deployment):**
1. **Fix deployment.** Add a GitHub Actions workflow: `npm ci && npm run build` → publish `dist/` to Pages (with `gh-pages`/`actions/deploy-pages` + `pages` permissions). Confirm Pages builds from the workflow (`source: GitHub Actions`). Until then visitors see the placeholder phone. Also remove the old `.html` site from wherever GH Pages is publishing, and set `robots.txt` `Disallow: /admin/`.
2. **Create the storage bucket(s).** Create `product-images` (public, or private + public read policy per migration) and create the product image objects. Alternatively script `/ide` insert via migration for reproducibility; the existing RLS migration then applies.
3. **Rotate / remove the dummy admin.** Immediately reset `admin@vinayakplastics.com`, or delete that user, and create a real admin with a strong, non-committed password. Do NOT leave `Admin@123` documented in a committed migration connected to the live project. Document admin onboarding.
4. **Backfill product images.** Populate `product_images` (and correct `categories.image_url` / `products.image_url` broken `/images/products/*.webp` paths → either real storage objects or valid local assets). Otherwise the admin media library and product images stay empty and broken links appear in search results.

**P1 (important):**
5. Harden enquiries: validate server-side (move to an edge/serverless function), whitelist `status='new'`, add honeypot + rate limit.
6. Decide and document the **sync model**: with static hosting, admin edits take effect only after CI rebuild. If real-time publishing is required, add SSR/`server` output or hybrid rendering for product pages.
7. Add an **Industries admin page** (list/create/edit/deactivate) or explicitly scope it as read-only/tag-only.
8. Wire Website Content editor to real consumers (Hero + a dynamic About page) or remove the dead `about*` fields; seed `homepage`/`about` keys in `site_settings`.
9. Add a P0-blocking check in the admin (on load) for storage-bucket availability so failures aren’t silent.

**P2 (polish):**
10. Fix the legacy spec-table key mapping (`spec['size (mm)']` etc.) or mark variants as the sole source of truth and delete legacy spec rows.
11. Generate `sitemap.xml` from product slugs at build time; drop the stale static one.
12. Remove leftover audit/report `.md` files and reject `product_images`/specs public-read of inactive products if confidentiality matters.
13. Add CI smoke test (build + optionally a read-only DB connectivity probe) and a post-deploy verification checklist (auth, admin CRUD, storage, enquiry).
14. Clean the two test enquiries out of the live `enquiries` table; add seed-only flag for sample data in production.

---

## FINAL VERDICT

**NO** — not ready for production.

Strong foundations exist: RLS is genuinely protecting data (verified live), auth works, the build is clean and fast, and the admin covers the must-have CRUD. However, the product as shipped **is not what the public sees** (live site = legacy placeholder with a fake phone number), the **storage bucket is missing** (admin media + product images broken), the **dummy admin password is a live credential**, and there is **no CI/CD path** from `npm run build` to GitHub Pages. Deploying without the P0 fixes would expose a broken, confusing, or misconfigured system.

After the P0 items are fixed, re-run this audit (connectivity, storage, enquiries insert on a test project, and a twin bare-bones smoke test) to confirm and flip the verdict to **YES**.

---

## Verification Evidence (commands run, read-only unless noted)

```
npm ls astro @supabase/supabase-js        → astro@7.3.1, @supabase/supabase-js@2.116.0
npm run build                              → 20 pages, no errors
npx astro check                            → 0 errors, 0 warnings, 3 hints
     (hint: Layout.astro:93 application/ld+json script; rest = my temp scripts)
astro preview (port 4399) smoke test       → all 20 routes incl. all /admin/** → 200
     /products/ice-boxes/, /products/random-slug/ → 404 (correct static behaviour)
Live DB reads (anon/admin)                 → counts as per report; enquiries anon 0 / admin 2
signInWithPassword(admin@…/Admin@123)      → session OK            (updates last_sign_in_at)
storage.upload → product-images/a.…       → ERROR "Bucket not found"
storage.list('product-images')             → 0 items, no error
dist products/plastic-crates/index.html    → DB variants branch present
Greps: SUPABASE_SECRET/service_role/bearer → no matches in src/
GH API: default_branch=main, pushed 2026-09-12, Pages API → 404, only branch main
Live web: /Vinayak-Plastic/, /about, /contact, /products, /plastic-crates.html etc. → legacy site 200;
         /admin/, /products/plastic-crates/ … → 404
```