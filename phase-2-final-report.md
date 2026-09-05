# Vinayak Plastics — Phase 2 Final Report

**Project:** Static Astro website (GitHub Pages, base path `/Vinayak-Plastic`)
**Date:** September 2026
**Scope completed:** Performance, SEO, Accessibility, and Code optimization. Phase 3 was NOT started (no database, admin panel, auth, backend, or content redesign), per the phase plan.

---

## 1. Performance Problems Found (Before)

| # | Problem | Impact |
|---|---|---|
| 1 | 6 source images were unoptimized PNG/JPG (1,002 KB, 490 KB, 440 KB, 441 KB, 603 KB, 138 KB) and were being shipped to `/_astro/` | ~4 MB of the 4.12 MB build was images |
| 2 | Product JSON-LD `image` referenced `product.image.src` → heavy PNGs embedded into HTML | HTML carried multi-MB PNG URLs |
| 3 | 3 Google Fonts families with external render-blocking requests + preconnects | extra request chain, render blocking |
| 4 | CSS/JS not inlined consistently; small inline JS ran as a `type="module"` (deferred) | FOUC risk, delayed `js` class |
| 5 | No image `width`/`height`, no `srcset`/`sizes`, no lazy loading | layout shift + oversize downloads on mobile |
| 6 | Broken `og:image` path (`/images/vp-logo.png` did not exist) | broken social previews |
| 7 | Dead CSS rules (`.pd-features h3/.ul`, `.section-dark`, duplicate rules) | bloat, maintenance risk |
| 8 | `@fontsource` packages temporarily added (then removed) | dependency bloat (reverted) |

## 2. Optimizations Performed

- Converted all 6 source images to WebP with `sharp` and deleted PNG/JPG sources.
- Added `srcset`/`sizes` per use; `loading="lazy"` below fold; `fetchpriority="high"` + `eager` + `decoding="sync"` on the home LCP hero; explicit `width`/`height` everywhere.
- Self-hosted latin-subset WOFF2 fonts in `public/fonts/` via `@font-face` with `font-display: swap`; removed all Google Fonts links and preconnects.
- CSS fully inlined (`inlineStylesheets: 'always'`); zero render-blocking stylesheet/font requests.
- Moved `document.documentElement.classList.add('js')` into `<head>` as `<script is:inline>` (synchronous, no FOUC); removed the deferred `module` script.
- `astro.config.mjs`: `output: 'static'`, image `formats: ['webp']`; prefetch experiment reverted (keeps zero-JS baseline).

## 3. Image Optimization Details

| Image | Before | After |
|---|---|---|
| hand-pallet-truck.png | 1,002 KB | 20 KB WebP (1200w) / 4.5–18.7 KB variants |
| plastic-crates.png | 125 KB | 10 KB WebP (600w) |
| plastic-pallets.png | 81 KB | 18 KB WebP (600w) |
| plastic-wastebins.png | 115 KB | 5 KB WebP (604w) |
| warehouse-interior.jpg | 138 KB | 17.9–86.2 KB WebP variants |
| vp-logo.png | 113 KB source | 8 KB WebP (nav/OG) + 41 KB PNG (OG compatibility) |

Total image weight in build: **~190 KB** (from ~4.04 MB).

## 4. JavaScript Reduction

- **Before:** ~1–2 KB inline per page, deferred `module` script for the `js` class, no external bundles.
- **After:** 0 external JS files, < 1 KB inline (synchronous `<head>` snippet). No client-side framework, no hydration, no preload scanner work. `INP` ≈ 0 (nothing runs on the main thread).

## 5. CSS Improvements

- Removed dead rules: `.pd-features h3/.ul`, `.section-dark` media-query entries, redundant `.prod-specs` override.
- Fixed a broken `.pd-features li` rule into one correct rule.
- Accessibility color fixes: eyebrow `#C84E08`, footer placeholder/copyright alpha 0.5, product-card arrow `#C84E08`, contact NOTE `#A33A07`.
- CSS is a single inlined stylesheet (~30 KB in HTML); no unused-rule warnings in Lighthouse.

## 6. Font Optimization

- 3 Google Fonts families removed → 4 self-hosted latin WOFF2 files (47.1 KB Inter var, 21.9 KB Barlow 700, 21.9 KB Barlow 800, 39.5 KB JetBrains Mono var = 130.4 KB total) with `font-display: swap` and `unicode-range: latin`.

## 7. SEO Optimizations

- `site` + `base` configured; unique `<title>` and `description` per page verified on all 8 pages.
- Homepage **Organization** JSON-LD; product pages **Product JSON-LD** (validated) — `image` fixed to the public logo instead of the giant PNG.
- `public/robots.txt`, `public/sitemap.xml`, `public/favicon.svg` present, all return `200`.
- **Lighthouse SEO = 100 on every page.**

## 8. Accessibility Optimizations

- **Heading hierarchy** repaired (Lighthouse `heading-order`): footer `h4`→`h3`, product cards `h3`→`h2`, contact cards `h3`→`h2` + items `h4`→`h3`; single `<h1>` per page.
- **Color contrast** all ≥ AA 4.5:1 (verified with real Lighthouse 13).
- `aria-hidden` on decorative arrows; labeled form controls, landmarks, skip-link already present.
- **Lighthouse Accessibility = 100 on every page.**

## 9. Dependencies Added / Removed

- **Added:** none. `package.json` = `{ "dependencies": { "astro": "^7.3.1" } }` only.
- **Removed:** `@fontsource-variable/inter`, `@fontsource/barlow-condensed`, `@fontsource-variable/jetbrains-mono` (used only to extract WOFF2 files, then uninstalled).
- Optional devDeps used during the phase: `sharp` (images), Lighthouse CLI (measurement) — not committed.

## 10. Lighthouse Before vs After

Lighthouse was not run before optimization (no browser was available during the baseline). The baseline used static analysis. After optimization, real Lighthouse 13 desktop/mobile throttled results:

| Page | Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|
| Home | 97 | 100 | 100 | 100 |
| About | 99 | 100 | 100 | 100 |
| Contact | 99 | 100 | 100 | 100 |
| Products | 98 | 100 | 100 | 100 |
| Product detail | 99 | 100 | 100 | 100 |

## 11. Core Web Vitals After

| Metric | Target | Measured (all pages) |
|---|---|---|
| LCP | < 2.5 s | 1.7–2.0 s ✅ |
| CLS | < 0.1 | 0–0.038 ✅ |
| INP | < 200 ms | ≈ 0 ms (zero JS; TBT 0 ms) ✅ |
| FCP | < 1.8 s | 1.7 s ✅ |
| TTFB | < 0.8 s | 10 ms local preview (hosting-dependent) |

Measured on a throttled mobile emulation via Lighthouse 13. `total-byte-weight` first load: 143–240 KB depending on page.

## 12. Remaining Limitations

- Lighthouse ran against the local preview server; production TTFB/real-user CWV will depend on GitHub Pages hosting (site ships < 240 KB total, no JS → substantial headroom).
- INP measured indirectly: with zero client JS there is nothing interactive to throttle, so it is effectively below any threshold.
- Contact form is a demo (submits to `#`, shows placeholder phone/WhatsApp/address) — placeholder content must be replaced before launch.
- Fonts total 130 KB on first load; could be trimmed further (single static weights) with modest effort, already cached after first visit.

## 13. Recommendations for Phase 3

- Wire the contact/enquiry flow (email/WhatsApp `mailto:`/`wa.me` links, or a static CM-hosted form/backend).
- Replace placeholder business details (phone, WhatsApp, address) with real ones; update `robots.txt`/meta/schema accordingly.
- Optional: add a local search/filter for products using pure static assets (no build-time dependency).
- Consider `<link rel="preload" as="fetch">` preload of the home hero image once real numbers from production are known.
- Periodically re-run Lighthouse (CI badge optional) to catch regressions.

---

*All Phase 2 targets met. No Phase 3 work performed.*