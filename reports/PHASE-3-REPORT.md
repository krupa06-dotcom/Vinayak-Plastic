# Phase 3 — New Catalogue Hierarchy (Products)

Transforms the public catalogue from the legacy fixed sub-category/variant model
(`/categories/...`) into a new, fully data-driven series → size → version hierarchy
served from the `products` Supabase schema (`product_series`, `size_variants`,
`product_variants`, `product_images`, product `categories`).

## Routes

| Route | Content |
|---|---|
| `/products` | Overview: category (range) cards + searchable grid of every product variant across ranges. Nav-search `?q=` still goes here. |
| `/products/{category-slug}` | Series cards for one range (e.g. `plastic-crates`). |
| `/products/{cat}/{series}` | Series page with the live height chooser (`SeriesConfigurator`), sibling series, JSON-LD breadcrumb. |
| `/products/{cat}/{series}/{size}/{version}` | Product detail: gallery, specs, quick facts, related sizes/versions, `#quote` with pre-filled enquiry. |
| `/products/...` (unknown) | Custom site `404` (`(site)/not-found.tsx`). |

Key naming: category segment = DB slug; series segment = `{base_l}x{base_w}`;
size segment = `{base_l}x{base_w}x{height}`; version segment = `slug(version_name || model_code)`.

## New modules

- `src/lib/hierarchy.ts` — Phase 3 data layer.
  - Types: `HierarchyCategory`, `HierarchySeries`, `HierarchySize`, `HierarchyVariant`, `HierarchyImage`, `HierarchyData`.
  - `getHierarchyData()` — 5 parallel Supabase queries (categories, series, size variants,
    product variants, product images) assembled into the hierarchy; falls back to local
    fixtures (`FALLBACK_CATEGORIES`, `FALLBACK_DETAILS`) when Supabase is unavailable.
  - Path generators: `getHierarchyCategoryPaths`, `getHierarchySeriesPaths`, `getHierarchyVersionPaths`
    (used by `generateStaticParams`; generate all rows so empty states render).
  - Lookups: `getCategoryBySlug`, `getSeriesByKey` (+ `SeriesContext`), `getProductDetail`
    (+ `ProductDetailContext` with `siblingSizes`, `siblingVariants`).
  - Key helpers derive ASCII-only keys from numeric dimensions (survive HTML/file-system encoding).
  - `resolveImageUrl`/`resolveFirstImage`/`resolveCategoryImage` — storage paths become
    render (`webp`, `quality=80`) URLs; root-relative `/images/*` are checked locally and
    dropped when missing (pallet/bin/truck legacy images are dead); per-variant image →
    series image → category image fallback chain.
- `src/components/SeriesConfigurator.tsx` — client height chooser: `role=tablist` pills with
  selected state, server-rendered panels toggled via `hidden`, `#size-{key}` deep-linking —
  no runtime filtering needed for a static export.
- `src/components/BreadcrumbSchema.tsx` — BreadcrumbList JSON-LD.
- `src/styles/catalogue.css` — `.pl-cat*` (range cards + Explore CTA), `.hx-height*` chooser,
  `.hx-version*` cards, `.hx-chips`, `.hx-facts`, dark `.hx-quote` section, `.sc-card__img--light`.

## EnquiryForm extension

`EnquiryForm` gained an optional `prefill` prop: hidden `product_variant_id`, an
"Enquiring about" summary (`dl`), and a product-aware default message. Submit now includes
`product_variant_id`. Fully backwards compatible — `/contact` and legacy pages unchanged.
Hidden input value is set from server-rendered prefill (static export: no runtime POST needed).

## SEO & metadata

- Per-range, per-series, per-version `generateMetadata` (title, description, canonical,
  OpenGraph with real product image).
- BreadcrumbList JSON-LD on every new page; Product JSON-LD (`additionalProperty` = spec rows)
  on detail pages.
- Product cards link straight to `/products/.../version` detail pages, fixing the old
  duplicate-page (variant reachable via multiple `/categories` URLs) problem.

## What changed elsewhere

- `src/lib/db.ts` — only exports `FallbackDetail`, `FALLBACK_CATEGORIES`, `FALLBACK_DETAILS`;
  legacy exports untouched.
- `src/app/(site)/products/page.tsx` — redesigned on `getHierarchyData`.
- `src/app/(site)/products/[category]/page.tsx` — new (hero, series grid, empty state, breadcrumb).
- `src/components/ProductListFilter.tsx` — range cards now carry an "Explore Range →" CTA.
- `src/app/(site)/not-found.tsx` — custom site 404.
- Legacy `/categories/...` routes, admin, nav, `EnquiryForm` behaviour untouched.

## Verification

- `npm run typecheck` — clean.
- `npm run build` — 79/79 static pages generated (13 series, 17 variant detail pages; all
  legacy admin/about/contact/categories pages still present).
- Spot-checks on `out/`:
  - `/products/plastic-pallets/1200x1000` renders both height pills (150/160 mm) with the
    active panel open and the other `hidden`, version cards link to `.../vpp-1200` (150) and
    `.../vpp-nest` (160).
  - `.../1200x1000x150/vpp-1200` — variant has no images and legacy `product_images` are dead:
    main image falls back to the category image; specs show composed
    `External Size = 1200 x 1000 x 150 mm` plus Model Code / Material / Load / Colours / Shape.
  - `.../vpc-600` — uses its own storage image; `VPC-600` title, ASCII-safe canonical URL,
    Product + Breadcrumb JSON-LD present.
  - Quote form on detail pages carries `product_variant_id` + pre-fill summary.
- Manual viewport cross-check at 360–430 and 1280–1920 px remains to be done (configurator
  pills, version grid, specs table wrap).

## Notes / future

- Series `features`/`applications` are currently NULL in the DB — those sections render empty
  state / are skipped until populated.
- Supabase render endpoint ignores `width=` for byte-size control, so pages rely on
  `loading="lazy"` + `width/height` attributes rather than URL resizing.
- `size_variants`, `product_variants`, `product_images` tables verify on the DB; `display_order`
  is the sort field everywhere.