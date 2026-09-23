import { supabase, hasSupabase } from './supabase';
import {
  FALLBACK_CATEGORIES,
  FALLBACK_DETAILS,
  resolveFirstImage,
  resolveImageUrl,
  variantSlug
} from './db';
import type { Category, FallbackDetail } from './db';

// ============================================================
// Phase 3 — New catalogue hierarchy (categories → series → sizes → versions)
// Fully data-driven from Supabase; legacy db.ts helpers are untouched.
// ============================================================

// ---- Row shapes (mirrors database.types.ts) ----

export interface SeriesRow {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  base_length: number | null;
  base_width: number | null;
  description: string | null;
  product_code: string | null;
  short_description: string | null;
  features: string[] | null;
  applications: unknown;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
}

export interface SizeVariantRow {
  id: string;
  series_id: string;
  label: string;
  height: number;
  is_active: boolean;
  display_order: number;
}

export interface ProductVariantRow {
  id: string;
  size_variant_id: string;
  version_name: string | null;
  version_code: string | null;
  model_code: string;
  description: string | null;
  material: string | null;
  weight: string | null;
  load_capacity: string | null;
  outer_length: number | null;
  outer_width: number | null;
  outer_height: number | null;
  inner_length: number | null;
  inner_width: number | null;
  inner_height: number | null;
  colours: string | null;
  shape: string | null;
  price: string | null;
  is_active: boolean;
  display_order: number;
}

export interface ProductImageRow {
  id: string;
  product_variant_id: string;
  image_url: string;
  alt_text: string | null;
  is_main: boolean;
  display_order: number;
}

// ---- Derived / denormalised shapes used by the pages ----

export interface HierarchyImage {
  src: string;
  alt: string;
}

export interface HierarchyVariant extends ProductVariantRow {
  display_name: string;
  version_key: string;
  /** Resolved gallery images (main first). */
  images: HierarchyImage[];
  /** First image, falling back to the series image, then the category image. */
  card_image: string | null;
  // Denormalised navigation context.
  size_id: string;
  size_label: string;
  size_height: number;
  size_key: string;
  series_id: string;
  series_name: string;
  series_slug: string;
  series_key: string;
  category_slug: string;
  category_name: string;
  category_image: string | null;
  href: string;
  search: string;
}

export interface HierarchySize extends SizeVariantRow {
  size_key: string;
  variants: HierarchyVariant[];
  models_count: number;
}

export interface HierarchySeries extends SeriesRow {
  category_slug: string;
  category_name: string;
  category_image: string | null;
  series_key: string;
  /** Series image falling back to the category image. */
  image: string | null;
  sizes: HierarchySize[];
  heights_count: number;
  models_count: number;
  href: string;
}

export interface HierarchyCategory extends Category {
  image: string | null;
  models_count: number;
  series: HierarchySeries[];
  href: string;
}

export interface HierarchyData {
  categories: HierarchyCategory[];
  series: HierarchySeries[];
  variants: HierarchyVariant[];
}

const EMPTY_HIERARCHY: HierarchyData = { categories: [], series: [], variants: [] };

// ============================================================
// Key derivations (URL segments). Numbers keep keys ASCII-safe.
// ============================================================

export function makeSeriesKey(series: {
  base_length: number | null;
  base_width: number | null;
  slug: string;
}): string {
  return series.base_length != null && series.base_width != null
    ? `${series.base_length}x${series.base_width}`
    : series.slug;
}

export function makeSizeKey(
  series: { base_length: number | null; base_width: number | null },
  size: { label: string; height: number }
): string {
  return series.base_length != null && series.base_width != null
    ? `${series.base_length}x${series.base_width}x${size.height}`
    : variantSlug(size.label);
}

export function makeVersionKey(variant: { version_name: string | null; model_code: string }): string {
  return variantSlug(variant.version_name || variant.model_code);
}

/** Human-readable footprint, e.g. "600 × 400", from base dimensions. */
export function formatFootprint(series: { base_length: number | null; base_width: number | null }): string {
  return series.base_length != null && series.base_width != null
    ? `${series.base_length} × ${series.base_width}`
    : '';
}

/** Human-readable full size, e.g. "600 × 400 × 220 mm". */
export function formatSize(
  series: { base_length: number | null; base_width: number | null },
  height: number
): string {
  const fp = formatFootprint(series);
  return fp ? `${fp} × ${height} mm` : `${height} mm`;
}

/** Normalise the series `applications` JSON column into renderable rows. */
export function normalizeApplications(apps: unknown): { name: string; description: string }[] {
  if (!Array.isArray(apps)) return [];
  return apps
    .map((a) => {
      if (a && typeof a === 'object') {
        const o = a as Record<string, unknown>;
        return { name: String(o.name ?? '').trim(), description: String(o.description ?? '').trim() };
      }
      return { name: String(a).trim(), description: '' };
    })
    .filter((a) => a.name);
}

// ============================================================
// Fetch + build
// ============================================================

export async function getHierarchyData(): Promise<HierarchyData> {
  if (!hasSupabase()) return buildFallbackHierarchy();

  const [categoriesRes, seriesRes, sizesRes, variantsRes, imagesRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('series')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('size_variants')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('product_variants')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('product_images')
      .select('*')
      .order('is_main', { ascending: false })
      .order('display_order', { ascending: true })
  ]);

  const allErrors = [
    categoriesRes.error,
    seriesRes.error,
    sizesRes.error,
    variantsRes.error,
    imagesRes.error
  ].filter(Boolean);
  if (allErrors.length) {
    console.error('Error fetching hierarchy data:', allErrors[0]);
    return EMPTY_HIERARCHY;
  }

  return buildHierarchy(
    (categoriesRes.data || []) as Category[],
    (seriesRes.data || []) as SeriesRow[],
    (sizesRes.data || []) as SizeVariantRow[],
    (variantsRes.data || []) as ProductVariantRow[],
    (imagesRes.data || []) as ProductImageRow[]
  );
}

function buildHierarchy(
  categories: Category[],
  seriesRows: SeriesRow[],
  sizeRows: SizeVariantRow[],
  variantRows: ProductVariantRow[],
  imageRows: ProductImageRow[]
): HierarchyData {
  const variantsBySize = new Map<string, ProductVariantRow[]>();
  for (const v of variantRows) {
    const list = variantsBySize.get(v.size_variant_id) ?? [];
    list.push(v);
    variantsBySize.set(v.size_variant_id, list);
  }

  const sizesBySeries = new Map<string, SizeVariantRow[]>();
  for (const s of sizeRows) {
    const list = sizesBySeries.get(s.series_id) ?? [];
    list.push(s);
    sizesBySeries.set(s.series_id, list);
  }

  const seriesByCategory = new Map<string, SeriesRow[]>();
  for (const s of seriesRows) {
    const list = seriesByCategory.get(s.category_id) ?? [];
    list.push(s);
    seriesByCategory.set(s.category_id, list);
  }

  const imagesByVariant = new Map<string, ProductImageRow[]>();
  for (const img of imageRows) {
    const list = imagesByVariant.get(img.product_variant_id) ?? [];
    list.push(img);
    imagesByVariant.set(img.product_variant_id, list);
  }

  const sortedCategories = categories
    .slice()
    .sort((a, b) => a.display_order - b.display_order);

  const flatSeries: HierarchySeries[] = [];
  const flatVariants: HierarchyVariant[] = [];

  const hierarchyCategories: HierarchyCategory[] = sortedCategories.map((cat) => {
    const categoryImage = resolveFirstImage(cat.image_url);
    const rawSeries = (seriesByCategory.get(cat.id) || []).sort(
      (a, b) => a.display_order - b.display_order
    );

    const series: HierarchySeries[] = rawSeries.map((sr) => {
      const seriesKey = makeSeriesKey(sr);
      const seriesImage = resolveFirstImage(sr.image_url) || categoryImage;

      const rawSizes = (sizesBySeries.get(sr.id) || []).sort(
        (a, b) => a.display_order - b.display_order
      );

      const sizes: HierarchySize[] = rawSizes.map((sz) => {
        const sizeKey = makeSizeKey(sr, sz);
        const rawVariants = (variantsBySize.get(sz.id) || []).sort(
          (a, b) => a.display_order - b.display_order
        );

        const variants: HierarchyVariant[] = rawVariants.map((vr) => {
          const displayName = vr.version_name || vr.model_code;
          const versionKey = makeVersionKey(vr);
          const images: HierarchyImage[] = (imagesByVariant.get(vr.id) || [])
            .map((img) => {
              const src = resolveImageUrl(img.image_url);
              return src
                ? { src, alt: img.alt_text || `${displayName} — ${cat.name}` }
                : null;
            })
            .filter((x): x is HierarchyImage => x !== null);

          const href = `/products/${cat.slug}/${seriesKey}/${sizeKey}/${versionKey}`;
          const search = [
            displayName,
            vr.model_code,
            cat.name,
            sr.name,
            sz.label,
            `L ${sr.base_length} W ${sr.base_width}`,
            sr.short_description || '',
            vr.description || ''
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return {
            ...vr,
            display_name: displayName,
            version_key: versionKey,
            images,
            card_image: images[0]?.src || seriesImage || categoryImage,
            size_id: sz.id,
            size_label: sz.label,
            size_height: sz.height,
            size_key: sizeKey,
            series_id: sr.id,
            series_name: sr.name,
            series_slug: sr.slug,
            series_key: seriesKey,
            category_slug: cat.slug,
            category_name: cat.name,
            category_image: categoryImage,
            href,
            search
          };
        });

        return {
          ...sz,
          size_key: sizeKey,
          variants,
          models_count: variants.length
        };
      });

      const seriesHref = `/products/${cat.slug}/${seriesKey}`;
      const built: HierarchySeries = {
        ...sr,
        category_slug: cat.slug,
        category_name: cat.name,
        category_image: categoryImage,
        series_key: seriesKey,
        image: seriesImage,
        sizes,
        heights_count: sizes.length,
        models_count: sizes.reduce((n, s) => n + s.variants.length, 0),
        href: seriesHref
      };
      flatSeries.push(built);
      return built;
    });

    const catObj: HierarchyCategory = {
      ...cat,
      image: categoryImage,
      models_count: series.reduce((n, s) => n + s.models_count, 0),
      series,
      href: `/products/${cat.slug}`
    };
    for (const s of series) {
      for (const z of s.sizes) {
        for (const v of z.variants) flatVariants.push(v);
      }
    }
    return catObj;
  });

  return { categories: hierarchyCategories, series: flatSeries, variants: flatVariants };
}

// ============================================================
// Static path + lookup helpers for the pages
// ============================================================

export async function getHierarchyCategoryPaths(): Promise<{ category: string }[]> {
  const data = await getHierarchyData();
  return data.categories.map((c) => ({ category: c.slug }));
}

export async function getHierarchySeriesPaths(): Promise<{ category: string; series: string }[]> {
  const data = await getHierarchyData();
  return data.categories.flatMap((c) => c.series.map((s) => ({ category: c.slug, series: s.series_key })));
}

export async function getHierarchyVersionPaths(): Promise<
  { category: string; series: string; size: string; version: string }[]
> {
  const data = await getHierarchyData();
  return data.variants.map((v) => ({
    category: v.category_slug,
    series: v.series_key,
    size: v.size_key,
    version: v.version_key
  }));
}

export async function getCategoryBySlug(categorySlug: string): Promise<HierarchyCategory | null> {
  const data = await getHierarchyData();
  return data.categories.find((c) => c.slug === categorySlug) ?? null;
}

export interface SeriesContext {
  category: HierarchyCategory;
  series: HierarchySeries;
}

export async function getSeriesByKey(
  categorySlug: string,
  seriesKey: string
): Promise<SeriesContext | null> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return null;
  const series = category.series.find((s) => s.series_key === seriesKey) ?? null;
  if (!series) return null;
  return { category, series };
}

export interface ProductDetailContext {
  category: HierarchyCategory;
  series: HierarchySeries;
  size: HierarchySize;
  variant: HierarchyVariant;
  /** Other sizes in the same series (for switch-height links). */
  siblingSizes: HierarchySize[];
  /** Other versions in the same size. */
  siblingVariants: HierarchyVariant[];
}

export async function getProductDetail(
  categorySlug: string,
  seriesKey: string,
  sizeKey: string,
  versionKey: string
): Promise<ProductDetailContext | null> {
  const ctx = await getSeriesByKey(categorySlug, seriesKey);
  if (!ctx) return null;
  const { category, series } = ctx;
  const size = series.sizes.find((s) => s.size_key === sizeKey) ?? null;
  if (!size) return null;
  const variant =
    size.variants.find((v) => v.version_key === versionKey) ??
    size.variants.find((v) => v.model_code.toLowerCase() === versionKey.toLowerCase()) ??
    null;
  if (!variant) return null;
  return {
    category,
    series,
    size,
    variant,
    siblingSizes: series.sizes.filter((s) => s.id !== size.id),
    siblingVariants: size.variants.filter((v) => v.id !== variant.id)
  };
}

// ============================================================
// Static fallback (local/dev builds without Supabase). Mirrors the same
// FALLBACK_DETAILS fixtures the legacy catalogue uses.
// ============================================================

interface FallbackFootprint {
  L: number;
  W: number;
  sizes: Map<number, { label: string; models: FallbackDetail['variants'] }>;
}

function parseFootprint(size: string): number[] {
  return (size || '')
    .split(/[^\d.]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
}

function groupFallbackModels(detail: FallbackDetail): Map<string, FallbackFootprint> {
  const groups = new Map<string, FallbackFootprint>();
  for (const v of detail.variants) {
    const nums = parseFootprint(v.size);
    const L = nums[0] || 0;
    const W = nums[1] || 0;
    const H = nums[2] || 0;
    const key = `${L}x${W}`;
    const group = groups.get(key) ?? { L, W, sizes: new Map<number, { label: string; models: FallbackDetail['variants'] }>() };
    const sizeEntry = group.sizes.get(H) ?? { label: `${H} mm`, models: [] };
    sizeEntry.models.push(v);
    group.sizes.set(H, sizeEntry);
    groups.set(key, group);
  }
  return groups;
}

function buildFallbackSeries(cat: Category, detail: FallbackDetail, order: number): HierarchySeries[] {
  const groups = groupFallbackModels(detail);
  const catImage = resolveFirstImage(cat.image_url);
  const out: HierarchySeries[] = [];
  let i = 0;

  for (const [footprint, group] of groups) {
    const [L, W] = footprint.split('x').map(Number);
    const seriesSlug = `${detail.slug}-${L}x${W}`;
    const seriesKey = `${L}x${W}`;
    const sizes: HierarchySize[] = Array.from(group.sizes.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([height, entry]) => {
        const variants: HierarchyVariant[] = entry.models.map((m) => {
          const displayName = m.model;
          const versionKey = variantSlug(m.model);
          return {
            id: `pv-${cat.slug}-${displayName}`,
            size_variant_id: `sz-${seriesSlug}-${height}`,
            version_name: null,
            version_code: null,
            model_code: m.model,
            description: null,
            material: m.material || null,
            weight: null,
            load_capacity: m.capacity || null,
            outer_length: L || null,
            outer_width: W || null,
            outer_height: height || null,
            inner_length: null,
            inner_width: null,
            inner_height: null,
            colours: null,
            shape: null,
            price: null,
            is_active: true,
            display_order: entry.models.indexOf(m),
            display_name: displayName,
            version_key: versionKey,
            images: [],
            card_image: null,
            size_id: `sz-${seriesSlug}-${height}`,
            size_label: entry.label,
            size_height: height,
            size_key: `${L}x${W}x${height}`,
            series_id: `s-${seriesSlug}`,
            series_name: detail.name,
            series_slug: seriesSlug,
            series_key: seriesKey,
            category_slug: cat.slug,
            category_name: cat.name,
            category_image: catImage,
            href: `/products/${cat.slug}/${seriesKey}/${L}x${W}x${height}/${versionKey}`,
            search: [displayName, m.model, cat.name, detail.name, entry.label]
              .join(' ')
              .toLowerCase()
          };
        });
        return {
          id: `sz-${seriesSlug}-${height}`,
          series_id: `s-${seriesSlug}`,
          label: entry.label,
          height,
          is_active: true,
          display_order: Array.from(group.sizes.keys()).sort((a, b) => a - b).indexOf(height),
          size_key: `${L}x${W}x${height}`,
          variants,
          models_count: variants.length
        };
      });

    out.push({
      id: `s-${seriesSlug}`,
      category_id: cat.id,
      name: detail.name,
      slug: seriesSlug,
      base_length: L || null,
      base_width: W || null,
      description: detail.description,
      product_code: detail.product_code,
      short_description: detail.short_description,
      features: detail.features,
      applications: detail.applications,
      image_url: detail.image_url,
      is_featured: i === 0,
      is_active: true,
      display_order: order,
      category_slug: cat.slug,
      category_name: cat.name,
      category_image: catImage,
      series_key: seriesKey,
      image: resolveFirstImage(detail.image_url) || catImage,
      sizes,
      heights_count: sizes.length,
      models_count: sizes.reduce((n, s) => n + s.variants.length, 0),
      href: `/products/${cat.slug}/${seriesKey}`
    });
    i += 1;
  }
  return out;
}

function buildFallbackHierarchy(): HierarchyData {
  const cats: HierarchyCategory[] = FALLBACK_CATEGORIES.slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((cat, ci) => {
      const detailKey =
        cat.slug === 'plastic-crates'
          ? 'standard-crates'
          : cat.slug === 'plastic-pallets'
            ? 'standard-pallets'
            : cat.slug === 'waste-bins'
              ? 'standard-bins'
              : 'standard-trucks';
      const detail = FALLBACK_DETAILS[detailKey];
      const series = buildFallbackSeries(cat, detail, ci);
      return {
        ...cat,
        image: resolveFirstImage(cat.image_url),
        models_count: series.reduce((n, s) => n + s.models_count, 0),
        series,
        href: `/products/${cat.slug}`
      };
    });

  const flatSeries = cats.flatMap((c) => c.series);
  const flatVariants = flatSeries.flatMap((s) => s.sizes.flatMap((z) => z.variants));
  return { categories: cats, series: flatSeries, variants: flatVariants };
}