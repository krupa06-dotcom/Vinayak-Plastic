-- Vinayak Plastics — Series → Size → Version product hierarchy
--
-- Phase 2: introduce the canonical catalogue hierarchy agreed in Phase 1:
--
--   categories
--     └── series            (one series per base footprint, e.g. "600 × 400 Series")
--           └── size_variants       (height steps of that footprint, e.g. "220 mm")
--                 └── product_variants  (version/type, e.g. "Ribbed Bottom" + model code)
--                       └── product_images
--
-- Existing tables (sub_categories, sub_category_variants, sub_category_images,
-- sub_category_specifications, category_variants, category_images) are NOT
-- touched: the live public site and the existing admin still read/write them.
-- This migration only ADDS the new structure and backfills it from the real
-- data so Phase 3 can switch the frontend over without losing anything.
--
-- Mapping used (footprint = series, per the phase-2 decision):
--   * Every unique (length × width) found in existing variants becomes a series
--     carrying the owning sub-category's description/features/applications/product code.
--   * Every distinct height becomes a size_variant of that series ("H mm").
--   * Every legacy variant row becomes a product_variant (model_code = old name;
--     version_name/version_code stay NULL — the old data does not specify them).
--   * Legacy images linked to a variant are copied to product_images (is_main set
--     on the first image per variant).
--   * Category-level variants that duplicate a sub-category variant in the same
--     category (e.g. crates/trucks appear in both tables) are skipped to avoid
--     duplicates; only genuinely separate models (pallets/bins) become series.
--
-- Run from the Supabase SQL Editor (no server-side secret required).
-- Safe to re-run: the schema section is idempotent and the backfill is a no-op
-- once the series table already contains data.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 0. Small helpers used for size-string parsing / name building
-- ============================================================

-- Split "400 × 300 × 130", "400 x 300 x 130" or "1150 x 550 x 1200 mm"
-- into numeric {length, width, height}. Returns NULL when unparseable.
CREATE OR REPLACE FUNCTION public.split_product_size(p_size TEXT)
RETURNS NUMERIC[] AS $$
DECLARE
  m TEXT[];
BEGIN
  IF p_size IS NULL OR trim(p_size) = '' THEN RETURN NULL; END IF;
  m := regexp_match(p_size, '(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)');
  IF m IS NULL THEN RETURN NULL; END IF;
  RETURN ARRAY[m[1]::NUMERIC, m[2]::NUMERIC, m[3]::NUMERIC];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- "600.00" -> "600", "600.50" -> "600.5", "1150" -> "1150"
CREATE OR REPLACE FUNCTION public.clean_num(n NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF n IS NULL THEN RETURN NULL; END IF;
  RETURN CASE WHEN n = floor(n) THEN floor(n)::TEXT ELSE n::TEXT END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 1. Table: series
-- ============================================================
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,           -- e.g. "600 × 400 Series"
  slug VARCHAR(255) NOT NULL UNIQUE,    -- e.g. "standard-crates-600x400"
  base_length NUMERIC(10,2),            -- footprint length (mm)
  base_width NUMERIC(10,2),             -- footprint width (mm)
  description TEXT,
  product_code VARCHAR(100),            -- e.g. "VPC-SERIES"
  short_description VARCHAR(500),
  features TEXT[],
  applications JSONB,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_series_category_id ON series(category_id);
CREATE INDEX IF NOT EXISTS idx_series_is_active ON series(is_active);
CREATE INDEX IF NOT EXISTS idx_series_display_order ON series(display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_series_category_footprint
  ON series(category_id, base_length, base_width)
  WHERE base_length IS NOT NULL AND base_width IS NOT NULL;

DROP TRIGGER IF EXISTS set_series_updated_at ON series;
CREATE TRIGGER set_series_updated_at
  BEFORE UPDATE ON series
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view series" ON series;
CREATE POLICY "Public can view series"
  ON series FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert series" ON series;
CREATE POLICY "Admins can insert series"
  ON series FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update series" ON series;
CREATE POLICY "Admins can update series"
  ON series FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete series" ON series;
CREATE POLICY "Admins can delete series"
  ON series FOR DELETE USING (is_admin());

-- ============================================================
-- 2. Table: size_variants
-- One row per height step of a series (label auto-derived, e.g. "220 mm").
-- ============================================================
CREATE TABLE IF NOT EXISTS size_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,          -- e.g. "220 mm"
  height NUMERIC(10,2) NOT NULL,        -- the height (mm)
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_size_variants_series_id ON size_variants(series_id);
CREATE INDEX IF NOT EXISTS idx_size_variants_is_active ON size_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_size_variants_display_order ON size_variants(display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_size_variants_series_height ON size_variants(series_id, height);

DROP TRIGGER IF EXISTS set_size_variants_updated_at ON size_variants;
CREATE TRIGGER set_size_variants_updated_at
  BEFORE UPDATE ON size_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE size_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view size variants" ON size_variants;
CREATE POLICY "Public can view size variants"
  ON size_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert size variants" ON size_variants;
CREATE POLICY "Admins can insert size variants"
  ON size_variants FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update size variants" ON size_variants;
CREATE POLICY "Admins can update size variants"
  ON size_variants FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete size variants" ON size_variants;
CREATE POLICY "Admins can delete size variants"
  ON size_variants FOR DELETE USING (is_admin());

-- ============================================================
-- 3. Table: product_variants
-- The "version/type" of a product, tied to a specific size. This is the
-- final product customers buy (model code + material + capacity + dims).
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  size_variant_id UUID NOT NULL REFERENCES size_variants(id) ON DELETE CASCADE,
  version_name VARCHAR(255),            -- e.g. "Ribbed Bottom" (NULL when unknown)
  version_code VARCHAR(100),            -- e.g. "RB" (NULL when unknown)
  model_code VARCHAR(255) NOT NULL,     -- e.g. "VPC-600", "VPT-2500-PU"
  description TEXT,
  material VARCHAR(255),
  weight VARCHAR(100),
  load_capacity VARCHAR(255),           -- e.g. "15 kg", "2500 kg"
  outer_length NUMERIC(10,2),
  outer_width NUMERIC(10,2),
  outer_height NUMERIC(10,2),
  inner_length NUMERIC(10,2),
  inner_width NUMERIC(10,2),
  inner_height NUMERIC(10,2),
  colours TEXT,                          -- comma-separated, e.g. "Blue, Grey"
  shape VARCHAR(255),                   -- e.g. "Rectangular", "Nestable"
  price VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_size_variant_id ON product_variants(size_variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_display_order ON product_variants(display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_size_model_code
  ON product_variants(size_variant_id, model_code);

DROP TRIGGER IF EXISTS set_product_variants_updated_at ON product_variants;
CREATE TRIGGER set_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view product variants" ON product_variants;
CREATE POLICY "Public can view product variants"
  ON product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert product variants" ON product_variants;
CREATE POLICY "Admins can insert product variants"
  ON product_variants FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update product variants" ON product_variants;
CREATE POLICY "Admins can update product variants"
  ON product_variants FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete product variants" ON product_variants;
CREATE POLICY "Admins can delete product variants"
  ON product_variants FOR DELETE USING (is_admin());

-- ============================================================
-- 4. Table: product_images
-- Images belong to the final product variant (not a bare "size"), so e.g.
-- the main image of a Ribbed Bottom 600×400×220 crate can never leak onto
-- a Plain Bottom 600×400×160 crate.
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(500),
  is_main BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_variant_id ON product_images(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(display_order);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view product images" ON product_images;
CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert product images" ON product_images;
CREATE POLICY "Admins can insert product images"
  ON product_images FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update product images" ON product_images;
CREATE POLICY "Admins can update product images"
  ON product_images FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete product images" ON product_images;
CREATE POLICY "Admins can delete product images"
  ON product_images FOR DELETE USING (is_admin());

-- ============================================================
-- 5. enquiries: allow linking a request to a final product variant
-- (backward compatible — sub_category_id stays, both nullable)
-- ============================================================
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_enquiries_product_variant_id ON enquiries(product_variant_id);

-- ============================================================
-- 6. Backfill the new structure from the existing catalogue
-- Guarded: rebuild-before-existing checks, so a re-run is a no-op.
--
-- IMPORTANT: the whole backfill lives inside ONE `DO $$...$$` statement so
-- every step (temp tables, inserts, updates) runs in a single session and
-- transaction. The Supabase SQL editor may execute separate statements on
-- different pooled connections, which makes session-scoped state (TEMP
-- tables, and even a staging schema) disappear mid-script. A single DO
-- block cannot be split and is safe to run from the SQL editor.
-- ============================================================
DO $$
BEGIN
  -- Guard: if series already has rows, this block is a no-op.
  IF EXISTS (SELECT 1 FROM public.series) THEN
    RAISE NOTICE 'series already populated — skipping backfill';
    RETURN;
  END IF;

  -- 6a. Stage every candidate variant (sub-category variants + category variants)
  CREATE TEMP TABLE _staged ON COMMIT DROP AS
  SELECT
    'sub'::TEXT AS source,
    sc.category_id,
    sc.id         AS family_id,
    sc.slug       AS family_slug,
    sc.name       AS family_name,
    sv.id         AS variant_id,
    sv.name       AS variant_name,
    (public.split_product_size(sv.size))[1] AS l,
    (public.split_product_size(sv.size))[2] AS w,
    (public.split_product_size(sv.size))[3] AS h,
    sv.shape, sv.color, sv.capacity, sv.material, sv.price,
    sv.is_active, sv.display_order
  FROM sub_category_variants sv
  JOIN sub_categories sc ON sc.id = sv.sub_category_id
  WHERE sv.size IS NOT NULL AND sv.size <> '';

  -- Category variants: keep only ones NOT already covered by a sub-category
  -- variant with the same model name in the same category (dedupe).
  INSERT INTO _staged (source, category_id, family_id, family_slug, family_name,
                       variant_id, variant_name, l, w, h,
                       shape, color, capacity, material, price, is_active, display_order)
  SELECT
    'cat'::TEXT,
    c.id, c.id, c.slug, c.name,
    cv.id, cv.name,
    (public.split_product_size(cv.size))[1],
    (public.split_product_size(cv.size))[2],
    (public.split_product_size(cv.size))[3],
    cv.shape, cv.color, cv.capacity, cv.material, cv.price,
    cv.is_active, cv.display_order
  FROM category_variants cv
  JOIN categories c ON c.id = cv.category_id
  WHERE cv.size IS NOT NULL AND cv.size <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM sub_category_variants sv2
      JOIN sub_categories sc2 ON sc2.id = sv2.sub_category_id
      WHERE sc2.category_id = c.id AND sv2.name = cv.name
    );

  -- 6b. Build the series set (one per footprint), keeping legacy ids for images.
  CREATE TEMP TABLE _series_map ON COMMIT DROP AS
  SELECT
    uuid_generate_v4() AS series_id,
    f.category_id, f.l, f.w,
    f.family_id, f.family_kind, f.family_slug
  FROM (
    SELECT category_id, l, w,
           (array_agg(family_id ORDER BY source DESC, display_order, variant_name))[1] AS family_id,
           (array_agg(source     ORDER BY source DESC, display_order, variant_name))[1] AS family_kind,
           (array_agg(family_slug ORDER BY source DESC, display_order, variant_name))[1] AS family_slug
    FROM _staged
    WHERE l IS NOT NULL AND w IS NOT NULL
    GROUP BY category_id, l, w
  ) f;

  INSERT INTO series (id, category_id, name, slug, base_length, base_width,
                      description, product_code, short_description, features, applications,
                      image_url, is_featured, is_active, display_order, created_at, updated_at)
  SELECT
    sm.series_id,
    sm.category_id,
    public.clean_num(sm.l) || ' × ' || public.clean_num(sm.w) || ' Series',
    lower(sm.family_slug) || '-' || public.clean_num(sm.l) || 'x' || public.clean_num(sm.w),
    sm.l, sm.w,
    sc.description,
    sc.product_code,
    sc.short_description,
    sc.features,
    sc.applications,
    CASE WHEN sm.family_kind = 'sub' THEN sc.image_url ELSE NULL END,
    COALESCE(sc.is_featured, false),
    true,
    row_number() OVER (PARTITION BY sm.category_id ORDER BY sm.l, sm.w)::INTEGER - 1,
    NOW(), NOW()
  FROM _series_map sm
  LEFT JOIN sub_categories sc ON sc.id = sm.family_id AND sm.family_kind = 'sub';

  -- 6c. size_variants: distinct heights per series
  INSERT INTO size_variants (id, series_id, label, height, is_active, display_order, created_at, updated_at)
  SELECT
    uuid_generate_v4(),
    sm.series_id,
    public.clean_num(ds.h) || ' mm',
    ds.h,
    true,
    row_number() OVER (PARTITION BY sm.series_id ORDER BY ds.h)::INTEGER - 1,
    NOW(), NOW()
  FROM (SELECT DISTINCT s.series_id, st.h
        FROM _staged st
        JOIN _series_map s ON s.category_id = st.category_id AND s.l = st.l AND s.w = st.w
        WHERE st.h IS NOT NULL) ds
  JOIN _series_map sm ON sm.series_id = ds.series_id;

  -- 6d. product_variants (model_code = old variant name; no invented version info)
  INSERT INTO product_variants (id, size_variant_id, version_name, version_code, model_code,
                                description, material, weight, load_capacity,
                                outer_length, outer_width, outer_height,
                                inner_length, inner_width, inner_height,
                                colours, shape, price, is_active, display_order, created_at, updated_at)
  SELECT
    uuid_generate_v4(),
    sv.id,
    NULL, NULL,
    st.variant_name,
    NULL,
    st.material, NULL, st.capacity,
    st.l, st.w, st.h,
    NULL, NULL, NULL,
    st.color, st.shape, st.price,
    st.is_active,
    st.display_order,
    NOW(), NOW()
  FROM _staged st
  JOIN _series_map sm ON sm.category_id = st.category_id AND sm.l = st.l AND sm.w = st.w
  JOIN size_variants sv ON sv.series_id = sm.series_id AND sv.height = st.h;

  -- 6e. product_images from legacy variant-attached images
  CREATE TEMP TABLE _variant_link ON COMMIT DROP AS
  SELECT st.variant_id AS legacy_variant_id, st.source, pv.id AS product_variant_id
  FROM _staged st
  JOIN _series_map sm ON sm.category_id = st.category_id AND sm.l = st.l AND sm.w = st.w
  JOIN size_variants sv ON sv.series_id = sm.series_id AND sv.height = st.h
  JOIN product_variants pv ON pv.size_variant_id = sv.id AND pv.model_code = st.variant_name;

  INSERT INTO product_images (id, product_variant_id, image_url, alt_text, is_main, display_order, created_at)
  SELECT uuid_generate_v4(), vl.product_variant_id, img.image_url, img.alt_text, false, img.display_order, NOW()
  FROM sub_category_images img
  JOIN _variant_link vl ON vl.legacy_variant_id = img.sub_category_variant_id AND vl.source = 'sub';

  INSERT INTO product_images (id, product_variant_id, image_url, alt_text, is_main, display_order, created_at)
  SELECT uuid_generate_v4(), vl.product_variant_id, img.image_url, img.alt_text, false, img.display_order, NOW()
  FROM category_images img
  JOIN _variant_link vl ON vl.legacy_variant_id = img.category_variant_id AND vl.source = 'cat';

  -- 6f. Flag the first image of each variant as its main photo.
  UPDATE product_images pi
  SET is_main = true
  FROM (
    SELECT id, row_number() OVER (PARTITION BY product_variant_id ORDER BY display_order, id) AS rn
    FROM product_images
  ) ranked
  WHERE pi.id = ranked.id AND ranked.rn = 1;
END $$;

-- ============================================================
-- 6g. Repair names/slugs that were built with the old buggy clean_num
-- (e.g. "6 x 4 Series" / "standard-crates-6x4" instead of
-- "600 × 400 Series" / "standard-crates-600x400"). Idempotent: only
-- rows still matching the compact corrupted pattern are rewritten.
-- ============================================================
UPDATE series s
SET name = public.clean_num(s.base_length) || ' × ' || public.clean_num(s.base_width) || ' Series',
    slug = regexp_replace(s.slug, '\-[0-9]+x[0-9]+$', '')
           || '-' || public.clean_num(s.base_length) || 'x' || public.clean_num(s.base_width)
WHERE s.name ~ '^[0-9]+ [x×] [0-9]+ Series$';

-- 6h. Repair size_variant labels that were built with the old buggy
-- clean_num (e.g. "1200 mm" -> "12 mm", "160 mm" -> "16 mm"). The label is
-- a pure function of height, so rewrites converge to the correct value and
-- are idempotent.
UPDATE size_variants sv
SET label = public.clean_num(sv.height) || ' mm'
WHERE sv.label ~ '^[0-9]+ mm$'
  AND sv.label <> (public.clean_num(sv.height) || ' mm');

-- ============================================================
-- 7. Documentation comments
-- ============================================================
COMMENT ON TABLE series IS 'A product series = one base footprint (base_length × base_width) under a category';
COMMENT ON COLUMN series.slug IS 'Unique URL slug, e.g. standard-crates-600x400';
COMMENT ON TABLE size_variants IS 'Height steps available within a series (label derived, e.g. "220 mm")';
COMMENT ON TABLE product_variants IS 'The final product = a version/type tied to one size; carries model code, material, capacity, dims';
COMMENT ON TABLE product_images IS 'Photos belonging to a final product variant (first image = main)';
COMMENT ON COLUMN product_variants.version_name IS 'e.g. Ribbed Bottom / Plain Bottom / Fully Closed / Fully Perforated (NULL = unspecified)';
COMMENT ON COLUMN product_variants.version_code IS 'Short code for the version, e.g. RB (NULL = unspecified)';
COMMENT ON COLUMN product_variants.model_code IS 'Customer-facing model/SKU, e.g. VPC-600';
COMMENT ON COLUMN enquiries.product_variant_id IS 'Optional link from an enquiry to the exact final product variant queried';