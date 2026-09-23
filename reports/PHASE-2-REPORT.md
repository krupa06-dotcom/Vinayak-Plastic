# Vinayak Plastics — Phase 2 Report (Catalog Hierarchy)

## 1. Objective
Introduce the canonical product hierarchy approved in Phase 1 — **categories → series → size_variants → product_variants → product_images** — alongside the existing legacy tables, backfill it from the live data, and add an admin UI to manage it. The public frontend is intentionally untouched.

## 2. DB changes
New migration (run once from the Supabase SQL Editor, no server-side credentials required):

    supabase/migrations/20260923000000_series_hierarchy.sql

**New tables**
- `series` — one row per base footprint (Length × Width) under a category, e.g. "600 × 400 Series". Columns: name, unique slug, base_length, base_width, description, product_code, short_description, features, applications, image_url, is_featured, is_active, display_order. Unique partial index on `(category_id, base_length, base_width)` where both non-null so a footprint can't be created twice under one category.
- `size_variants` — height steps of a series, label auto-derived ("220 mm"), unique `(series_id, height)`.
- `product_variants` — the final product (version tied to one size). Columns: version_name, version_code, model_code, description, material, weight, load_capacity, outer/inner L×W×H, colours (comma-separated text), shape, price, is_active, display_order. Unique `(size_variant_id, model_code)`.
- `product_images` — photos belonging to the exact final variant (is_main + display_order). First image per variant is flagged main.

**Modified table**
- `enquiries.product_variant_id` (nullable FK → product_variants, ON DELETE SET NULL) + index; keeps `sub_category_id` so it stays backward compatible.

**RLS / triggers**
- All four new tables: PUBLIC `SELECT` (USING true), admin-only INSERT/UPDATE/DELETE via the existing `is_admin()` guard — matching how the newer legacy tables are secured.
- `update_updated_at_column()` triggers on series / size_variants / product_variants (product_images uses created_at only, mirroring category_images).
- Policies and triggers are dropped + recreated so the file re-runs cleanly.

**New SQL helpers (public)**
- `split_product_size(text) → numeric[]` — parses "400 x 300 x 130", "400 × 300 × 130 mm", etc. into {length, width, height}; NULL when unparseable.
- `clean_num(numeric) → text` — "600.00" → "600"; "600.50" → "600.5" for tidy names.

## 3. Migration result 
- Footprint = series (as decided). Every unique L×W found in live variants becomes a series; every distinct height becomes a size; every legacy variant row becomes a product_variant (model_code = old name; version_name/version_code left NULL because the old data never specifies them — never invented).
- Category-level variants that duplicate a sub-category variant with the same model name in the same category (crates/trucks live in both tables) are skipped — only genuinely separate models (pallets/bins) become series. No duplicate products.
- Legacy variant-attached images (from `sub_category_images` and `category_images`) are copied into `product_images`; the first image per variant gets `is_main = true`.
- Series inherit description/features/applications/product code/cover image from their source sub-category (only for `sub`-kinds).
- Guarded backfill: temp marker `_series_done` only populates when `series` is empty, so re-running the file is a no-op. Temp tables are dropped at the end.
- **Not yet executed.** Apply via Supabase Dashboard → SQL Editor. Nothing on the live site changes until Phase 3 points the frontend at the new tables.

## 4. Admin changes
- **Nav**: added "Series" under Catalogue in `src/components/admin/AdminShell.tsx`.
- **List** — `/admin/series/`: (`src/app/admin/series/page.tsx` + `Series.tsx`)
  Collapsible category → series tree with footprint, size count, version count, status badge, edit + delete (confirm dialog, publishSite, cascade delete via FK).
- **Editor** — `/admin/series/edit/` (`src/app/admin/series/edit/page.tsx` + `EditSeries.tsx`)
  Two tabbed sections:
  - *Basics*: category, base L×W (auto-derives name "600 × 400 Series" + slug), series name/slug/SKU, cover image picker, description, short description, features, applications, order, active, featured.
  - *Sizes & Versions*: nested builder. Add height → label auto-updates ("370 mm"). Inside each size, add versions. Each version gets full fields (version name/code, model code, material, weight, load capacity, outer/inner dims, colours, shape, price, order, description, active) and its own photo list (upload / replace / remove / set-main / alt).
  - Everything (series + sizes + versions + photos) saves in one flow; orderable with move-up; deactivate-over-delete preferred; destructive ops behind confirm dialogs (list too).
- **Media library**: `getAllInUseImagesMap()` in `src/scripts/admin/core.ts` now also resolves `series` covers and `product_images`, so the Media Library keeps flagging in-use files as they get referenced from the new hierarchy.
- **Types**: `src/lib/database.types.ts` gained `series`, `size_variants`, `product_variants`, `product_images` (Row/Insert/Update + relationships) and `enquiries.product_variant_id`.
- Legacy admin (categories/products) is untouched and still writes the legacy tables.

## 5. Files changed
| File | Change |
|---|---|
| `supabase/migrations/20260923000000_series_hierarchy.sql` | new — schema, RLS, helpers, backfill |
| `src/lib/database.types.ts` | added new tables + enquiries.product_variant_id |
| `src/components/admin/AdminShell.tsx` | added `series` nav item + key |
| `src/app/admin/series/page.tsx`, `Series.tsx` | new — series list tree |
| `src/app/admin/series/edit/page.tsx`, `EditSeries.tsx` | new — series/size/version/image editor |
| `src/scripts/admin/core.ts` | extended in-use image map |

## 6. New components / API functions
- Components: `Series` (list), `EditSeries` (editor) — both follow the existing DOM-based 'use client' admin pattern.
- SQL functions: `public.split_product_size(text)`, `public.clean_num(numeric)`.
- No new edge function; saves trigger the existing `publishSite()` → Vercel rebuild for the site to go live.
- `src/lib/db.ts` deliberately left unchanged — it is the public-site catalogue layer; Phase 3 (frontend switchover) will add the new-hierarchy read helpers there.

## 7. Testing performed
- `npm run typecheck` — passes.
- `npm run build` (static export) — all 45 routes generated, including the new `/admin/series` and `/admin/series/edit`.
- Migration logic reviewed carefully; **not run** against the live DB (publishable key only, no service role / DB password / local Supabase link).
- Admin CRUD not exercised live — requires an authenticated admin session (`@vinayakplastics.com`). Expected but untested.

## 8. Actions required
1. In Supabase Dashboard → SQL Editor: run `supabase/migrations/20260923000000_series_hierarchy.sql` once.
2. (Optional) Login to `/admin/series/` to review the backfilled series/sizes/versions; edit to fill version names/codes where desired (they start NULL by design).
3. Reach out when Phase 3 (frontend switchover) should start. It will rewire the public catalogue pages + `src/lib/db.ts` onto `series/size_variants/product_variants` and retire the legacy tables.

## 9. Remaining frontend work (Phase 3)
- Public `[category]`, `[category]/[sub]`, `[category]/variant/[variant]` pages → query the new hierarchy.
- New URL layout for series/size/version pages & sitemap / `getCatalogueData()`.
- Enquiry forms → send `product_variant_id`.
- Retire legacy tables (sub_categories, category_variants, sub_category_images, category_images) once switched.