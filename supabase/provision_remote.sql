-- ============================================================
-- VINAYAK PLASTICS — Bring the remote Supabase DB in sync
-- ============================================================
-- WHY THIS EXISTS
--   The deployed site/admin queries the series hierarchy
--   (series -> size_variants -> product_variants -> product_images)
--   plus the sub-category tables. On the linked project the series
--   hierarchy tables can be missing, so the catalogue fails to load
--   and newly-saved products never appear — the "data is not
--   entering" symptom.
--
--   THIS FILE IS THE SOURCE OF MERCY, NOT THE SOURCE OF TRUTH.
--   supabase/migrations/ is authoritative. This is a hand-runnable
--   SQL-Editor patch for a database that already has the base schema
--   (categories / sub_categories / enquiries / site_settings) and is
--   behind on everything below.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--   It is safe to re-run: every statement is idempotent.
--
-- WHAT CHANGED IN THIS REVISION (2026-10-05)
--   * REMOVED the previous section 4.7:
--         DROP TABLE IF EXISTS product_variants CASCADE;
--         DROP TABLE IF EXISTS product_images   CASCADE;
--         DROP TABLE IF EXISTS products         CASCADE;
--     That was written on 2026-09-14, BEFORE
--     migrations/20260923000000_series_hierarchy.sql re-created
--     `product_variants` and `product_images` as core catalogue
--     tables with different columns. Re-running the old file would
--     therefore have DROPPED THE ENTIRE CATALOGUE. It is gone for
--     good — do not reintroduce it.
--   * REMOVED the legacy backfills that read products /
--     product_variants.size / product_images.product_id. Those
--     columns no longer exist. The backfills are now guarded and
--     skipped unless the legacy schema is actually present.
--   * ADDED the series hierarchy + sub_category_id + the
--     product_variants.weight removal + the series lid columns.
--   * ADDED the Waste Bins catalogue (section 10, copied verbatim
--     from migrations/20261005000000_waste_bins_catalogue.sql).
--
-- NOT INCLUDED (see supabase/migrations/ if you need these)
--   20260910000000_initial_schema        categories/sub_categories/enquiries/...
--   20260910000001_sample_data           the original catalogue rows
--   20260912010000/20260913000002        dummy admin user + lockdown
--   20260918000000/20260918000001        category_variants + category_images
--   20260919000000                       sub_category_images.sub_category_variant_id
--   20260922000000                       remove product size/weight
-- ============================================================

-- ============================================================
-- SECTION 0 (OPTIONAL). Remove the existing catalogue.
--   Uncomment ONLY if you want to wipe categories/sub-categories
--   and everything under them first. It cascades.
-- ============================================================
-- DELETE FROM categories;

-- ============================================================
-- 1. Ensure the shared updated_at trigger helper exists
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Ensure public.is_admin() exists (used by every admin policy)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@vinayakplastics.com'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Storage bucket "product-images" (public) + admin RLS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin full access to product-images" ON storage.objects;
CREATE POLICY "Admin full access to product-images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- ============================================================
-- 4. Sub-category content tables
--    Source: 20260914000000_fold_products_into_sub_categories.sql
--            + 20260919000000_sub_category_variant_images.sql
--    The live public site and the existing admin still read/write
--    these, so they stay in the schema alongside the series tables.
-- ============================================================

-- 4.1 Detail columns on sub_categories
ALTER TABLE sub_categories
  ADD COLUMN IF NOT EXISTS product_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS short_description VARCHAR(500),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS features TEXT[],
  ADD COLUMN IF NOT EXISTS applications JSONB,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS set_sub_categories_updated_at ON sub_categories;
CREATE TRIGGER set_sub_categories_updated_at
  BEFORE UPDATE ON sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4.2 sub_category_images
CREATE TABLE IF NOT EXISTS sub_category_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_category_id UUID NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(500),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Photos are tied to a specific size/model, not just the sub-category.
ALTER TABLE sub_category_images
  ADD COLUMN IF NOT EXISTS sub_category_variant_id UUID REFERENCES sub_category_variants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sub_category_images_sub_category_id ON sub_category_images(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_sub_category_images_sub_category_variant_id ON sub_category_images(sub_category_variant_id);
CREATE INDEX IF NOT EXISTS idx_sub_category_images_display_order ON sub_category_images(display_order);

ALTER TABLE sub_category_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view sub-category images" ON sub_category_images;
CREATE POLICY "Public can view sub-category images"
  ON sub_category_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert sub-category images" ON sub_category_images;
CREATE POLICY "Admins can insert sub-category images"
  ON sub_category_images FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update sub-category images" ON sub_category_images;
CREATE POLICY "Admins can update sub-category images"
  ON sub_category_images FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete sub-category images" ON sub_category_images;
CREATE POLICY "Admins can delete sub-category images"
  ON sub_category_images FOR DELETE USING (is_admin());

-- 4.3 sub_category_specifications
CREATE TABLE IF NOT EXISTS sub_category_specifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_category_id UUID NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
  specification_name VARCHAR(255) NOT NULL,
  specification_value VARCHAR(500) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sub_category_specifications_sub_category_id ON sub_category_specifications(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_sub_category_specifications_display_order ON sub_category_specifications(display_order);

ALTER TABLE sub_category_specifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view sub-category specifications" ON sub_category_specifications;
CREATE POLICY "Public can view sub-category specifications"
  ON sub_category_specifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert sub-category specifications" ON sub_category_specifications;
CREATE POLICY "Admins can insert sub-category specifications"
  ON sub_category_specifications FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update sub-category specifications" ON sub_category_specifications;
CREATE POLICY "Admins can update sub-category specifications"
  ON sub_category_specifications FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete sub-category specifications" ON sub_category_specifications;
CREATE POLICY "Admins can delete sub-category specifications"
  ON sub_category_specifications FOR DELETE USING (is_admin());

-- 4.4 sub_category_variants
CREATE TABLE IF NOT EXISTS sub_category_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_category_id UUID NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  size VARCHAR(255),
  shape VARCHAR(255),
  color VARCHAR(255),
  capacity VARCHAR(255),
  material VARCHAR(255),
  price VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_category_variants_sub_category_id ON sub_category_variants(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_sub_category_variants_is_active ON sub_category_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_category_variants_display_order ON sub_category_variants(display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_category_variants_sub_category_name ON sub_category_variants(sub_category_id, name);

DROP TRIGGER IF EXISTS set_sub_category_variants_updated_at ON sub_category_variants;
CREATE TRIGGER set_sub_category_variants_updated_at
  BEFORE UPDATE ON sub_category_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sub_category_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view sub-category variants" ON sub_category_variants;
CREATE POLICY "Public can view sub-category variants"
  ON sub_category_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert sub-category variants" ON sub_category_variants;
CREATE POLICY "Admins can insert sub-category variants"
  ON sub_category_variants FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update sub-category variants" ON sub_category_variants;
CREATE POLICY "Admins can update sub-category variants"
  ON sub_category_variants FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete sub-category variants" ON sub_category_variants;
CREATE POLICY "Admins can delete sub-category variants"
  ON sub_category_variants FOR DELETE USING (is_admin());

-- 4.5 LEGACY backfill (product_variants -> sub_category_variants)
--     GUARDED. The old version of this file ran these statements
--     unconditionally, which fails on the current schema:
--       * `products` was dropped by 20260914000000
--       * `product_variants` was re-created by 20260923000000 and no
--         longer has product_id / size / shape / color / capacity /
--         material / price
--       * legacy `product_variants` was never created by any
--         migration at all, so on many databases it does not exist
--     The legacy shape is detected by the presence of
--     product_variants.product_id, and the whole block is skipped
--     when it is absent.
DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE NOTICE 'public.products absent — skipping legacy sub-category backfill';
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'product_variants'
      AND column_name = 'product_id'
  ) THEN
    RAISE NOTICE 'product_variants is not the legacy shape — skipping legacy sub-category backfill';
    RETURN;
  END IF;

  UPDATE sub_categories s
  SET
    product_code      = p.product_code,
    short_description = p.short_description,
    description       = COALESCE(NULLIF(p.description, ''), s.description),
    features          = p.features,
    applications      = p.applications,
    is_featured       = p.is_featured
  FROM (
    SELECT DISTINCT ON (sub_category_id)
      sub_category_id, product_code, short_description, description,
      features, applications, is_featured
    FROM products
    ORDER BY sub_category_id, display_order, id
  ) p
  WHERE p.sub_category_id = s.id;

  WITH primary_product AS (
    SELECT DISTINCT ON (sub_category_id)
      products.id AS product_id, products.sub_category_id
    FROM products
    ORDER BY products.sub_category_id, products.display_order, products.id
  ),
  primary_image AS (
    SELECT pp.sub_category_id, pi.image_url
    FROM primary_product pp
    JOIN product_images pi ON pi.product_id = pp.product_id
    ORDER BY pp.sub_category_id, pi.display_order
  )
  UPDATE sub_categories s
  SET image_url = coalesce(
    s.image_url,
    (SELECT pi.image_url FROM primary_image pi WHERE pi.sub_category_id = s.id LIMIT 1)
  );

  INSERT INTO sub_category_images (id, sub_category_id, image_url, alt_text, display_order, created_at)
  SELECT pi.id, p.sub_category_id, pi.image_url, pi.alt_text, pi.display_order, pi.created_at
  FROM product_images pi
  JOIN products p ON p.id = pi.product_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sub_category_specifications (id, sub_category_id, specification_name, specification_value, display_order)
  SELECT ps.id, p.sub_category_id, ps.specification_name, ps.specification_value, ps.display_order
  FROM product_specifications ps
  JOIN products p ON p.id = ps.product_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sub_category_variants (
    id, sub_category_id, name, size, shape, color,
    capacity, material, price, is_active, display_order, created_at, updated_at
  )
  SELECT pv.id, p.sub_category_id, pv.name, pv.size, pv.shape, pv.color,
    pv.capacity, pv.material, pv.price, pv.is_active, pv.display_order,
    pv.created_at, pv.updated_at
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Weight is no longer captured anywhere.
DELETE FROM sub_category_specifications WHERE LOWER(specification_name) = 'weight';

-- 4.6 enquiries: link to sub-category instead of product
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES sub_categories(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE NOTICE 'public.products absent — enquiries.product_id left as-is';
    RETURN;
  END IF;
  UPDATE enquiries e
  SET sub_category_id = p.sub_category_id
  FROM products p
  WHERE e.product_id = p.id
    AND e.sub_category_id IS NULL;
END $$;

ALTER TABLE enquiries DROP COLUMN IF EXISTS product_id;
DROP INDEX IF EXISTS idx_enquiries_product_id;
CREATE INDEX IF NOT EXISTS idx_enquiries_sub_category_id ON enquiries(sub_category_id);

-- NOTE: the previous file dropped products / product_variants /
-- product_images / product_specifications / product_industries here.
-- That is intentionally NOT done: product_variants and product_images
-- are live catalogue tables in the current schema.

-- ============================================================
-- 5. Series hierarchy
--    Source: 20260923000000_series_hierarchy.sql
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 5.0 Parsing helpers used by the backfill
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

CREATE OR REPLACE FUNCTION public.clean_num(n NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF n IS NULL THEN RETURN NULL; END IF;
  RETURN CASE WHEN n = floor(n) THEN floor(n)::TEXT ELSE n::TEXT END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5.1 Table: series  (one row per base footprint under a category)
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  base_length NUMERIC(10,2),
  base_width NUMERIC(10,2),
  description TEXT,
  product_code VARCHAR(100),
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
-- A footprint may appear only once per category.
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
CREATE POLICY "Public can view series" ON series FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert series" ON series;
CREATE POLICY "Admins can insert series" ON series FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update series" ON series;
CREATE POLICY "Admins can update series" ON series FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete series" ON series;
CREATE POLICY "Admins can delete series" ON series FOR DELETE USING (is_admin());

-- 5.2 Table: size_variants  (height steps within a series)
CREATE TABLE IF NOT EXISTS size_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  height NUMERIC(10,2) NOT NULL,
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
CREATE POLICY "Public can view size variants" ON size_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert size variants" ON size_variants;
CREATE POLICY "Admins can insert size variants" ON size_variants FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update size variants" ON size_variants;
CREATE POLICY "Admins can update size variants" ON size_variants FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete size variants" ON size_variants;
CREATE POLICY "Admins can delete size variants" ON size_variants FOR DELETE USING (is_admin());

-- 5.3 Table: product_variants  (the final buyable model)
--     `weight` is intentionally absent: it was removed by
--     20261003000000_remove_product_variant_weight.sql (see 6.2).
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  size_variant_id UUID NOT NULL REFERENCES size_variants(id) ON DELETE CASCADE,
  version_name VARCHAR(255),
  version_code VARCHAR(100),
  model_code VARCHAR(255) NOT NULL,
  description TEXT,
  material VARCHAR(255),
  load_capacity VARCHAR(255),
  outer_length NUMERIC(10,2),
  outer_width NUMERIC(10,2),
  outer_height NUMERIC(10,2),
  inner_length NUMERIC(10,2),
  inner_width NUMERIC(10,2),
  inner_height NUMERIC(10,2),
  colours TEXT,
  shape VARCHAR(255),
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
CREATE POLICY "Public can view product variants" ON product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert product variants" ON product_variants;
CREATE POLICY "Admins can insert product variants" ON product_variants FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update product variants" ON product_variants;
CREATE POLICY "Admins can update product variants" ON product_variants FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete product variants" ON product_variants;
CREATE POLICY "Admins can delete product variants" ON product_variants FOR DELETE USING (is_admin());

-- 5.4 Table: product_images  (attached to the final model, not a bare size)
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
CREATE POLICY "Public can view product images" ON product_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert product images" ON product_images;
CREATE POLICY "Admins can insert product images" ON product_images FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update product images" ON product_images;
CREATE POLICY "Admins can update product images" ON product_images FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete product images" ON product_images;
CREATE POLICY "Admins can delete product images" ON product_images FOR DELETE USING (is_admin());

-- 5.5 enquiries may point at the exact final model
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_enquiries_product_variant_id ON enquiries(product_variant_id);

-- 5.6 Backfill series/size_variants/product_variants from the legacy
--     catalogue, mapping every unique footprint to a series and every
--     distinct height to a size.
--
--     GUARDED twice:
--       1. no-op once `series` already has rows;
--       2. skipped entirely unless the legacy inputs are present.
--          category_variants / category_images are created by
--          20260918000000, which is NOT part of this patch file, so a
--          database behind only on this file cannot be backfilled here.
--          In that case run `supabase db push` (or apply
--          20260918000000 first) instead.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.series) THEN
    RAISE NOTICE 'series already populated — skipping backfill';
    RETURN;
  END IF;

  IF to_regclass('public.sub_category_variants') IS NULL
     OR to_regclass('public.category_variants')  IS NULL
     OR to_regclass('public.category_images')    IS NULL
     OR to_regclass('public.sub_category_images') IS NULL
     OR NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name  = 'sub_category_images'
            AND column_name = 'sub_category_variant_id'
        )
  THEN
    RAISE NOTICE 'legacy catalogue tables missing — skipping series backfill';
    RAISE NOTICE 'apply migrations/20260918000000 + 20260919000000, or run supabase db push, to backfill series';
    RETURN;
  END IF;

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

  CREATE TEMP TABLE _series_map ON COMMIT DROP AS
  SELECT
    uuid_generate_v4() AS series_id,
    f.category_id, f.l, f.w,
    f.family_id, f.family_kind, f.family_slug
  FROM (
    SELECT category_id, l, w,
           (array_agg(family_id   ORDER BY source DESC, display_order, variant_name))[1] AS family_id,
           (array_agg(source       ORDER BY source DESC, display_order, variant_name))[1] AS family_kind,
           (array_agg(family_slug  ORDER BY source DESC, display_order, variant_name))[1] AS family_slug
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

  INSERT INTO product_variants (id, size_variant_id, version_name, version_code, model_code,
                                description, material, load_capacity,
                                outer_length, outer_width, outer_height,
                                inner_length, inner_width, inner_height,
                                colours, shape, price, is_active, display_order, created_at, updated_at)
  SELECT
    uuid_generate_v4(),
    sv.id,
    NULL, NULL,
    st.variant_name,
    NULL,
    st.material, st.capacity,
    st.l, st.w, st.h,
    NULL, NULL, NULL,
    st.color, st.shape, st.price,
    st.is_active,
    st.display_order,
    NOW(), NOW()
  FROM _staged st
  JOIN _series_map sm ON sm.category_id = st.category_id AND sm.l = st.l AND sm.w = st.w
  JOIN size_variants sv ON sv.series_id = sm.series_id AND sv.height = st.h;

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

  UPDATE product_images pi
  SET is_main = true
  FROM (
    SELECT id, row_number() OVER (PARTITION BY product_variant_id ORDER BY display_order, id) AS rn
    FROM product_images
  ) ranked
  WHERE pi.id = ranked.id AND ranked.rn = 1;
END $$;

-- 5.7 Repair names/labels produced by an older buggy clean_num
--     (e.g. "6 x 4 Series" -> "600 × 400 Series"). Idempotent.
UPDATE series s
SET name = public.clean_num(s.base_length) || ' × ' || public.clean_num(s.base_width) || ' Series',
    slug = regexp_replace(s.slug, '\-[0-9]+x[0-9]+$', '')
           || '-' || public.clean_num(s.base_length) || 'x' || public.clean_num(s.base_width)
WHERE s.name ~ '^[0-9]+ [x×] [0-9]+ Series$';

UPDATE size_variants sv
SET label = public.clean_num(sv.height) || ' mm'
WHERE sv.label ~ '^[0-9]+ mm$'
  AND sv.label <> (public.clean_num(sv.height) || ' mm');

-- 5.8 Documentation
COMMENT ON TABLE series IS 'A product series = one base footprint (base_length × base_width) under a category';
COMMENT ON COLUMN series.slug IS 'Unique URL slug, e.g. standard-crates-600x400';
COMMENT ON TABLE size_variants IS 'Height steps available within a series (label derived, e.g. "220 mm")';
COMMENT ON TABLE product_variants IS 'The final product = a version/type tied to one size; carries model code, material, capacity, dims';
COMMENT ON TABLE product_images IS 'Photos belonging to a final product variant (first image = main)';
COMMENT ON COLUMN product_variants.version_name IS 'e.g. Ribbed Bottom / Plain Bottom (NULL = unspecified)';
COMMENT ON COLUMN product_variants.version_code IS 'Short code for the version, e.g. RB (NULL = unspecified)';
COMMENT ON COLUMN product_variants.model_code IS 'Customer-facing model/SKU, e.g. VPC-600';
COMMENT ON COLUMN enquiries.product_variant_id IS 'Optional link from an enquiry to the exact final product variant queried';

-- ============================================================
-- 6. Post-hierarchy adjustments
-- ============================================================

-- 6.1 Series may belong to a Sub-Category / Product Type
--     Source: 20261002000000_series_subcategory_support.sql
ALTER TABLE series
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES sub_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_series_sub_category_id ON series(sub_category_id);

ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view sub_categories" ON sub_categories;
CREATE POLICY "Public can view sub_categories" ON sub_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert sub_categories" ON sub_categories;
CREATE POLICY "Admins can insert sub_categories" ON sub_categories FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update sub_categories" ON sub_categories;
CREATE POLICY "Admins can update sub_categories" ON sub_categories FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete sub_categories" ON sub_categories;
CREATE POLICY "Admins can delete sub_categories" ON sub_categories FOR DELETE USING (is_admin());

COMMENT ON COLUMN series.sub_category_id IS 'Optional link to a sub-category / product type within the parent category';

-- 6.2 Remove product variant weight
--     Source: 20261003000000_remove_product_variant_weight.sql
--     No-op on a database that never had the column.
ALTER TABLE product_variants DROP COLUMN IF EXISTS weight;

-- 6.3 Per-series lid / accessory image (height-independent)
--     Source: 20261004000000_series_lid_image.sql
ALTER TABLE series
  ADD COLUMN IF NOT EXISTS lid_image_url TEXT,
  ADD COLUMN IF NOT EXISTS lid_label VARCHAR(120),
  ADD COLUMN IF NOT EXISTS lid_note VARCHAR(255);

UPDATE series
SET lid_image_url = '/images/crate-lid.webp',
    lid_label     = COALESCE(lid_label, 'Crate Lid'),
    lid_note      = COALESCE(lid_note, 'Fits every height in this series')
WHERE lid_image_url IS NULL
  AND category_id IN (SELECT id FROM categories WHERE slug = 'plastic-crates');

COMMENT ON COLUMN series.lid_image_url IS
  'Photo of the lid / cover that fits this series footprint (height-independent). NULL hides the lid card.';
COMMENT ON COLUMN series.lid_label IS
  'Heading for the lid card on the series page. Defaults to "Crate Lid" when empty.';
COMMENT ON COLUMN series.lid_note IS
  'Optional note shown on the lid card, e.g. "Fits every height in this series".';
-- ============================================================
-- 7. Waste Bins catalogue
--     Source: migrations/20261005000000_waste_bins_catalogue.sql
--     Copied VERBATIM below. The migration file is authoritative;
--     if the two ever differ, re-copy from the migration.
--     Adds 6 sub-categories, 10 series, 23 sizes, 23 models under
--     the existing category slug 'waste-bins'.
-- ============================================================
-- Vinayak Plastics — Waste Bins catalogue data
--
-- Adds the Waste Bins product types (product sub-categories) together with their
-- models, using the same hierarchy the live site already reads:
--
--   categories ("Waste Bins")
--     └── sub_categories   product type, e.g. "Waste Bins With Swing Lid"
--           └── series
--                 └── size_variants      one height step per model, label "<H> mm"
--                       └── product_variants   model_code + outer dimensions + capacity + colours
--
-- Series structure — why it is mixed
-- -----------------------------------
-- The rest of the catalogue follows "series = one unique base footprint"
-- (20260923000000_series_hierarchy.sql: "Every unique (length x width) found in
-- existing variants becomes a series"), e.g. "600 x 400 Series". Waste bins only
-- half-fit that rule, so this file uses both forms:
--
--   * Rectangular bins get real footprint series, exactly like the rest of the
--     catalogue. Each of these models has its own footprint AND its own height,
--     so each becomes one series with one size:
--         Trolley   710 x 850 / 560 x 730 / 470 x 550
--         Lid       680 x 500 / 680 x 420
--         Large     1360 x 1060 / 1220 x 785
--
--   * Round bins cannot. idx_series_category_footprint is UNIQUE on
--     (category_id, base_length, base_width), and the swing-lid / dome-lid /
--     storage bodies repeat across those product types — 4080 is top O510 /
--     bottom O370 in both the swing-lid and the storage bin, and 4120 is top
--     O600 / bottom O440 in both the dome-lid and the storage bin. Giving those
--     a footprint would collide inside one category, and collapsing them into
--     shared series would drop the product types. So Swing Lid, Dome Lid and
--     Storage Bin each keep ONE footprint-free series and carry their dimensions
--     per model. All footprint-free read paths already handle this:
--     makeSeriesKey / makeSizeKey fall back to the slug, formatFootprint returns
--     '', and the admin series table prints a "-" chip instead of a footprint.
--
-- Everything is stored as structured specifications:
--   * size_variants.height  = overall height in mm (the size step)
--   * series.base_length / base_width = footprint in mm, where the model has one
--   * product_variants.outer_length / outer_width / outer_height = external
--     dimensions in mm (L x W x H)
--   * product_variants.load_capacity = nominal capacity in litres
--     (the field the catalogue already uses for bin capacity, e.g. VWB-120 -> "120 L")
--   * product_variants.colours = the confirmed colour list for the product type
--   * product_variants.description = the remaining per-model figures (bottom O,
--     height without lid, window size)
--
-- Nothing else is filled in: no price, stock, warranty, GST, material or image is
-- invented. product_images is left empty and series.image_url / sub_category image
-- stays NULL so the cards fall back to the existing Waste Bins category image.
--
-- Safety:
--   * Existing rows are never updated or deleted — only new rows are inserted, and
--     every insert is ON CONFLICT DO NOTHING, so re-running this file is a no-op.
--   * The same model number appearing in two product types (e.g. 4120 in dome-lid
--     and storage) is not a duplicate: each sits on its own size_variant, and the
--     product_variants uniqueness rule is (size_variant_id, model_code).
--   * Every insert resolves its parent by slug/height AFTER the parent insert, via
--     the temporary lookup tables, rather than assuming the fixed UUID below landed.
--     Without that, a pre-existing row on any of these slugs would make
--     ON CONFLICT DO NOTHING skip the parent and the child insert would then abort
--     the whole transaction on a foreign-key violation.
--   * Nothing is written under a slug that already belongs to a different category;
--     the block raises instead.
--   * The block ends by asserting the full 6 / 10 / 23 / 23 result and raises if any
--     of it is missing, so a partial load can never pass unnoticed.
--
-- One deliberate DELETE, at the very top of the series step: an earlier draft of
-- this file modelled Trolley, Lid and Large as three footprint-free series named
-- after the product type. Those are replaced here by the seven footprint series
-- below, so the draft rows are removed to avoid listing every model twice. The
-- DELETE is restricted to three exact UUIDs from this task, AND to rows that are
-- still slug-matched and still footprint-free, so it can never remove catalogue
-- data or a series an admin has since given a real footprint. Sizes and models
-- under those series go with them via ON DELETE CASCADE.
--
-- Run from the Supabase SQL Editor, or with `supabase db push`. The whole insert
-- lives in one DO block, so it runs as a single statement/transaction.

DO $$
DECLARE
  v_category_id UUID;
  n_types  INTEGER;
  n_series INTEGER;
  n_sizes  INTEGER;
  n_models INTEGER;
BEGIN
  -- 0. Resolve the existing Waste Bins category (never created or modified here).
  SELECT id INTO v_category_id
  FROM public.categories
  WHERE slug = 'waste-bins';

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Category "waste-bins" not found - apply the base schema and sample-data migrations first.';
  END IF;

  -- 1. Product types (sub-categories) under Waste Bins.
  INSERT INTO public.sub_categories (id, category_id, name, slug, description, image_url, is_active, display_order)
  VALUES
    ('8a32fe9f-be2a-5824-86d9-305dd8964104', v_category_id, 'Waste Bins With Trolley', 'waste-bins-with-trolley', 'Wheeled waste bins on a trolley frame with a lid — 120 L, 240 L and 360 L — portable and built for outdoor use.', NULL, true, 4),
    ('4351e719-8236-5f8e-8fdc-fe8a929bf578', v_category_id, 'Waste Bins With Lid', 'waste-bins-with-lid', 'Lidded waste bins — 80 L and 110 L — with a viewing window in the lid.', NULL, true, 5),
    ('48ebf10c-ddde-5b30-8b59-c0119d066e1b', v_category_id, 'Waste Bins With Swing Lid', 'waste-bins-with-swing-lid', 'Round swing-lid waste bins from 10 L to 80 L with a 360° swing lid.', NULL, true, 6),
    ('9067469c-c962-5792-8746-03fa34863ffb', v_category_id, 'Waste Bins With Dome Lid', 'waste-bins-with-dome-lid', 'Dome-lid waste bins in 100 L and 120 L for indoor and outdoor use.', NULL, true, 7),
    ('0bd8f714-06f0-5389-8354-40cecf7c656e', v_category_id, 'Storage Bin With Fix Lid', 'storage-bin-with-fix-lid', 'Storage bins with a fixed lid in 10 L to 120 L sizes.', NULL, true, 8),
    ('39aaa7b3-b340-58fe-8f7e-4f09235d2e3d', v_category_id, 'Large Waste Bins', 'large-waste-bins', 'Large wheeled waste bins in 660 L and 1100 L for industrial sites and public areas.', NULL, true, 9)
  ON CONFLICT DO NOTHING;

  -- 1b. Resolve the real product-type ids by slug, so the inserts below attach to
  -- the rows that actually exist rather than to the fixed UUIDs above.
  DROP TABLE IF EXISTS _wb_type;
  CREATE TEMP TABLE _wb_type (slug TEXT PRIMARY KEY, id UUID NOT NULL) ON COMMIT DROP;

  INSERT INTO _wb_type (slug, id)
  SELECT t.slug, sc.id
  FROM (VALUES
    ('waste-bins-with-trolley'),
    ('waste-bins-with-lid'),
    ('waste-bins-with-swing-lid'),
    ('waste-bins-with-dome-lid'),
    ('storage-bin-with-fix-lid'),
    ('large-waste-bins')
  ) AS t(slug)
  JOIN public.sub_categories sc ON sc.slug = t.slug;

  SELECT COUNT(*) INTO n_types FROM _wb_type;

  IF n_types <> 6 THEN
    RAISE EXCEPTION 'Expected 6 Waste Bins product types, resolved % - check the sub_categories insert.', n_types;
  END IF;

  IF EXISTS (
    SELECT 1 FROM _wb_type tt
    JOIN public.sub_categories sc ON sc.id = tt.id
    WHERE sc.category_id <> v_category_id
  ) THEN
    RAISE EXCEPTION 'One of the Waste Bins product-type slugs already belongs to a different category - resolve that before running this migration.';
  END IF;

  -- 2. Remove the superseded footprint-free draft series (see header note).
  DELETE FROM public.series s
  WHERE s.id IN (
    '2ff11e17-4956-5a32-82b0-fbd099820c96'::UUID,
    'afde277c-fbec-5381-80fe-effc99a1f425'::UUID,
    '00659da5-428e-5a65-8398-e3f962092dd4'::UUID
  )
    AND s.slug IN ('waste-bins-with-trolley', 'waste-bins-with-lid', 'large-waste-bins')
    AND s.base_length IS NULL
    AND s.base_width IS NULL;

  -- 3. Series.
  --    Seven footprint series for the rectangular bins, matching the catalogue-wide
  --    "series = one footprint" convention, plus the three footprint-free series the
  --    round bins need (their UUIDs are unchanged from the first load).
  INSERT INTO public.series (id, category_id, sub_category_id, name, slug,
                             base_length, base_width, description, product_code, short_description,
                             features, applications, image_url, is_featured, is_active, display_order)
  SELECT v.id, v_category_id, tt.id, v.name, v.slug,
         v.base_l, v.base_w, NULL, NULL, v.short_desc,
         v.features, NULL, NULL, false, true, v.display_order
  FROM (VALUES
    -- Waste Bins With Trolley (rectangular, one footprint per model)
    ('33f6d605-0bd9-45e2-9c38-5e648e391459'::UUID, 'waste-bins-with-trolley', '710 × 850 Series', 'waste-bins-trolley-710x850',
     710, 850,
     '360 L wheeled trolley waste bin with lid — 710 × 850 × 1120 mm.',
     ARRAY['Wheels', 'Lid / cover', 'Portable', 'Outdoor use']::TEXT[], 4),
    ('fa49c786-5f2a-4d31-b2d1-8f1d053fa954'::UUID, 'waste-bins-with-trolley', '560 × 730 Series', 'waste-bins-trolley-560x730',
     560, 730,
     '240 L wheeled trolley waste bin with lid — 560 × 730 × 1060 mm.',
     ARRAY['Wheels', 'Lid / cover', 'Portable', 'Outdoor use']::TEXT[], 5),
    ('15acd4fc-e977-401c-b820-7d9329a08cdc'::UUID, 'waste-bins-with-trolley', '470 × 550 Series', 'waste-bins-trolley-470x550',
     470, 550,
     '120 L wheeled trolley waste bin with lid — 470 × 550 × 920 mm.',
     ARRAY['Wheels', 'Lid / cover', 'Portable', 'Outdoor use']::TEXT[], 6),

    -- Waste Bins With Lid (rectangular, one footprint per model)
    ('3e918d7c-44f5-494c-a6bb-841fbe18838f'::UUID, 'waste-bins-with-lid', '680 × 500 Series', 'waste-bins-lid-680x500',
     680, 500,
     '110 L lidded waste bin — 680 × 500 × 945 mm.',
     NULL::TEXT[], 7),
    ('fddb7bcc-caf7-42a5-90da-14b2476fa172'::UUID, 'waste-bins-with-lid', '680 × 420 Series', 'waste-bins-lid-680x420',
     680, 420,
     '80 L lidded waste bin — 680 × 420 × 890 mm.',
     NULL::TEXT[], 8),

    -- Large Waste Bins (rectangular, one footprint per model)
    ('f38cb5e6-f515-4244-9990-95c86db81fcc'::UUID, 'large-waste-bins', '1360 × 1060 Series', 'waste-bins-large-1360x1060',
     1360, 1060,
     '1100 L large waste bin with wheels — 1360 × 1060 × 1370 mm.',
     ARRAY['Wheels', 'Weather-resistant', 'Portable', 'Industrial / public use']::TEXT[], 9),
    ('71b43e43-3e44-4798-bba3-372f7915f3d1'::UUID, 'large-waste-bins', '1220 × 785 Series', 'waste-bins-large-1220x785',
     1220, 785,
     '660 L large waste bin with wheels — 1220 × 785 × 1230 mm.',
     ARRAY['Wheels', 'Weather-resistant', 'Portable', 'Industrial / public use']::TEXT[], 10),

    -- Round bins: footprint-free, one series per product type (see header note)
    ('ea77e33f-0e6f-5e20-8cf8-5740578924f7'::UUID, 'waste-bins-with-swing-lid', 'Waste Bins With Swing Lid', 'waste-bins-with-swing-lid',
     NULL, NULL,
     'Swing-lid waste bins from 10 L to 80 L with a 360° swing lid.',
     ARRAY['360° swing lid']::TEXT[], 11),
    ('b251637a-eda5-5c73-88be-60e3e8aba9fb'::UUID, 'waste-bins-with-dome-lid', 'Waste Bins With Dome Lid', 'waste-bins-with-dome-lid',
     NULL, NULL,
     'Dome-lid waste bins — 100 L and 120 L — for indoor and outdoor use.',
     ARRAY['Dome lid', 'Indoor / outdoor use']::TEXT[], 12),
    ('a104715c-fc02-5079-8013-eda551f4689b'::UUID, 'storage-bin-with-fix-lid', 'Storage Bin With Fix Lid', 'storage-bin-with-fix-lid',
     NULL, NULL,
     'Storage bins with a fixed lid — 10 L to 120 L.',
     NULL::TEXT[], 13)
  ) AS v(id, type_slug, name, slug, base_l, base_w, short_desc, features, display_order)
  JOIN _wb_type tt ON tt.slug = v.type_slug
  -- WHERE true terminates the SELECT so "ON CONFLICT" can only bind to the
  -- INSERT, never to the JOIN above.
  WHERE true
  ON CONFLICT DO NOTHING;

  -- 3b. Resolve the real series ids by slug.
  DROP TABLE IF EXISTS _wb_series;
  CREATE TEMP TABLE _wb_series (slug TEXT PRIMARY KEY, id UUID NOT NULL) ON COMMIT DROP;

  INSERT INTO _wb_series (slug, id)
  SELECT t.slug, s.id
  FROM (VALUES
    ('waste-bins-trolley-710x850'),
    ('waste-bins-trolley-560x730'),
    ('waste-bins-trolley-470x550'),
    ('waste-bins-lid-680x500'),
    ('waste-bins-lid-680x420'),
    ('waste-bins-large-1360x1060'),
    ('waste-bins-large-1220x785'),
    ('waste-bins-with-swing-lid'),
    ('waste-bins-with-dome-lid'),
    ('storage-bin-with-fix-lid')
  ) AS t(slug)
  JOIN public.series s ON s.slug = t.slug AND s.category_id = v_category_id;

  SELECT COUNT(*) INTO n_series FROM _wb_series;

  IF n_series <> 10 THEN
    RAISE EXCEPTION 'Expected 10 Waste Bins series, resolved % - check the series insert.', n_series;
  END IF;

  -- 4. Sizes = the height step of each model (label follows the admin convention).
  INSERT INTO public.size_variants (id, series_id, label, height, is_active, display_order)
  SELECT v.id, ss.id, v.label, v.height, true, v.display_order
  FROM (VALUES
    -- Footprint series: one size each
    ('426c87a2-815c-4354-a172-00319c344f9a'::UUID, 'waste-bins-trolley-710x850',  '1120 mm', 1120, 0),
    ('cfa7551a-b232-43e0-969b-1fe56ef88ee2'::UUID, 'waste-bins-trolley-560x730',  '1060 mm', 1060, 0),
    ('6bed8b0f-7e4f-4b09-83ed-ef9c66b72e89'::UUID, 'waste-bins-trolley-470x550',   '920 mm',  920, 0),
    ('de1f7b76-8f30-4e0b-9068-0e18e14b182f'::UUID, 'waste-bins-lid-680x500',        '945 mm',  945, 0),
    ('254ce541-60e0-43e8-afcb-c13cd444bef5'::UUID, 'waste-bins-lid-680x420',        '890 mm',  890, 0),
    ('928bace7-6f40-454e-8328-2fc994f45e62'::UUID, 'waste-bins-large-1360x1060',   '1370 mm', 1370, 0),
    ('28c86476-08a4-49a3-be5e-6d80b890197b'::UUID, 'waste-bins-large-1220x785',    '1230 mm', 1230, 0),

    -- Swing Lid (footprint-free series, one size per height)
    ('c2200ea2-049d-5e0f-8d04-58a1f69ebdda'::UUID, 'waste-bins-with-swing-lid', '800 mm', 800, 0),
    ('13e64ed0-fed9-5262-8267-13ce80776c5b'::UUID, 'waste-bins-with-swing-lid', '710 mm', 710, 1),
    ('11f3905d-b800-5197-8ab2-4cb6b8861f7f'::UUID, 'waste-bins-with-swing-lid', '617 mm', 617, 2),
    ('087d1fbb-e9d3-5136-8ecd-cfadd1e41815'::UUID, 'waste-bins-with-swing-lid', '513 mm', 513, 3),
    ('38e12c08-b75d-5c68-89ac-320ebfdea089'::UUID, 'waste-bins-with-swing-lid', '487 mm', 487, 4),
    ('0101862f-8fa9-59db-8efd-00b756c30866'::UUID, 'waste-bins-with-swing-lid', '400 mm', 400, 5),

    -- Dome Lid (footprint-free series)
    ('281b1d4d-b730-5211-8306-1ef8f6f8e84c'::UUID, 'waste-bins-with-dome-lid', '900 mm', 900, 0),
    ('92a92954-e7d5-5f3a-8787-c10f9e0db194'::UUID, 'waste-bins-with-dome-lid', '870 mm', 870, 1),

    -- Storage Bin With Fix Lid (footprint-free series)
    ('36029827-963e-5ef6-8018-a8892123b04e'::UUID, 'storage-bin-with-fix-lid', '750 mm', 750, 0),
    ('9d294685-e59d-587a-8e07-00607bfe2aa2'::UUID, 'storage-bin-with-fix-lid', '710 mm', 710, 1),
    ('e746f7c7-130e-52d7-873d-0a320dab1bce'::UUID, 'storage-bin-with-fix-lid', '669 mm', 669, 2),
    ('5590b8e1-4c84-56b8-8b4d-030ade6ac8ef'::UUID, 'storage-bin-with-fix-lid', '622 mm', 622, 3),
    ('19607c65-e971-5a67-85c9-5559dd00a4da'::UUID, 'storage-bin-with-fix-lid', '529 mm', 529, 4),
    ('ce401ae7-7390-5402-82c4-6ae8a320be9f'::UUID, 'storage-bin-with-fix-lid', '425 mm', 425, 5),
    ('56f7a2cd-caa6-5711-88d2-83d236def628'::UUID, 'storage-bin-with-fix-lid', '385 mm', 385, 6),
    ('09b49ef6-4675-5f07-855a-c36cb3d31e55'::UUID, 'storage-bin-with-fix-lid', '320 mm', 320, 7)
  ) AS v(id, series_slug, label, height, display_order)
  JOIN _wb_series ss ON ss.slug = v.series_slug
  WHERE true
  ON CONFLICT DO NOTHING;

  -- 4b. Resolve the real size ids by (series slug, height).
  DROP TABLE IF EXISTS _wb_size;
  CREATE TEMP TABLE _wb_size (
    series_slug TEXT NOT NULL,
    height      NUMERIC(10,2) NOT NULL,
    id          UUID NOT NULL,
    PRIMARY KEY (series_slug, height)
  ) ON COMMIT DROP;

  INSERT INTO _wb_size (series_slug, height, id)
  SELECT v.series_slug, v.height, sz.id
  FROM (VALUES
    ('waste-bins-trolley-710x850', 1120),
    ('waste-bins-trolley-560x730', 1060),
    ('waste-bins-trolley-470x550',  920),
    ('waste-bins-lid-680x500',      945),
    ('waste-bins-lid-680x420',      890),
    ('waste-bins-large-1360x1060', 1370),
    ('waste-bins-large-1220x785',  1230),
    ('waste-bins-with-swing-lid',  800),
    ('waste-bins-with-swing-lid',  710),
    ('waste-bins-with-swing-lid',  617),
    ('waste-bins-with-swing-lid',  513),
    ('waste-bins-with-swing-lid',  487),
    ('waste-bins-with-swing-lid',  400),
    ('waste-bins-with-dome-lid',   900),
    ('waste-bins-with-dome-lid',   870),
    ('storage-bin-with-fix-lid',   750),
    ('storage-bin-with-fix-lid',   710),
    ('storage-bin-with-fix-lid',   669),
    ('storage-bin-with-fix-lid',   622),
    ('storage-bin-with-fix-lid',   529),
    ('storage-bin-with-fix-lid',   425),
    ('storage-bin-with-fix-lid',   385),
    ('storage-bin-with-fix-lid',   320)
  ) AS v(series_slug, height)
  JOIN _wb_series ss ON ss.slug = v.series_slug
  JOIN public.size_variants sz ON sz.series_id = ss.id AND sz.height = v.height;

  SELECT COUNT(*) INTO n_sizes FROM _wb_size;

  IF n_sizes <> 23 THEN
    RAISE EXCEPTION 'Expected 23 Waste Bins sizes, resolved % - check the size_variants insert.', n_sizes;
  END IF;

  -- 5. Products = the final model at each size.
  INSERT INTO public.product_variants (id, size_variant_id, version_name, version_code, model_code,
                                       description, material, load_capacity,
                                       outer_length, outer_width, outer_height,
                                       inner_length, inner_width, inner_height,
                                       colours, shape, price, is_active, display_order)
  SELECT v.id, szi.id, NULL, NULL, v.model_code,
         v.description, NULL, v.capacity,
         v.outer_l, v.outer_w, v.outer_h,
         NULL, NULL, NULL,
         v.colours, NULL, NULL, true, 0
  FROM (VALUES
    -- Waste Bins With Trolley (footprint series, one model each)
    ('8dee1b35-1e09-4e0e-b743-1d18799d7ce4'::UUID, 'waste-bins-trolley-710x850', 1120, '2360',
     '360 L trolley waste bin with lid and wheels.', '360 L', 710, 850, 1120,
     'Yellow, Blue, Red, Green, Black'::TEXT),
    ('1d20f32c-2780-49e3-8c28-a3d626fdd121'::UUID, 'waste-bins-trolley-560x730', 1060, '2240',
     '240 L trolley waste bin with lid and wheels.', '240 L', 560, 730, 1060,
     'Yellow, Blue, Red, Green, Black'::TEXT),
    ('08c9fb94-a54c-40c6-8109-7949847876f3'::UUID, 'waste-bins-trolley-470x550',  920, '2120',
     '120 L trolley waste bin with lid and wheels.', '120 L', 470, 550,  920,
     'Yellow, Blue, Red, Green, Black'::TEXT),

    -- Waste Bins With Lid (footprint series, one model each)
    ('a9a5624a-eec5-4f9d-b931-514cfac04e03'::UUID, 'waste-bins-lid-680x500', 945, '2110',
     '110 L lidded waste bin — H 945 mm × W 500 mm × D 680 mm; height without lid 700 mm; window 185 × 368 mm.', '110 L', 680, 500, 945,
     'Blue, Green'::TEXT),
    ('c8bb9494-4509-4b2b-8187-05dae43593d5'::UUID, 'waste-bins-lid-680x420', 890, '2080',
     '80 L lidded waste bin — H 890 mm × W 420 mm × D 680 mm; height without lid 700 mm; window 160 × 285 mm.', '80 L', 680, 420, 890,
     'Blue, Green'::TEXT),

    -- Waste Bins With Swing Lid
    ('d82d4467-d460-597f-8f07-cdd3e8f57779'::UUID, 'waste-bins-with-swing-lid', 800, '4080',
     '80 L swing-lid bin — top Ø 510 mm, bottom Ø 370 mm, height 800 mm.', '80 L', 510, 510, 800,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('0544d828-c8f9-5640-8a26-2d6cbe1f18a0'::UUID, 'waste-bins-with-swing-lid', 710, '4060',
     '60 L swing-lid bin — top Ø 465 mm, bottom Ø 335 mm, height 710 mm.', '60 L', 465, 465, 710,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('00883fc1-c288-5ec8-8773-3fbe349d2cf9'::UUID, 'waste-bins-with-swing-lid', 617, '4040',
     '40 L swing-lid bin — top Ø 410 mm, bottom Ø 310 mm, height 617 mm.', '40 L', 410, 410, 617,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('f47dc698-65e4-5af9-89cd-4c51c221921b'::UUID, 'waste-bins-with-swing-lid', 513, '4030',
     '30 L swing-lid bin — top Ø 350 mm, bottom Ø 285 mm, height 513 mm.', '30 L', 350, 350, 513,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('dd76c356-7cb7-58ee-83cc-d25e0bc5b199'::UUID, 'waste-bins-with-swing-lid', 487, '4025',
     '25 L swing-lid bin — top Ø 370 mm, bottom Ø 265 mm, height 487 mm.', '25 L', 370, 370, 487,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),
    ('2fb4c5a5-fb07-5383-8e75-ac604fea7317'::UUID, 'waste-bins-with-swing-lid', 400, '4010',
     '10 L swing-lid bin — top Ø 280 mm, bottom Ø 190 mm, height 400 mm.', '10 L', 280, 280, 400,
     'Red, Yellow, Black, Green/Turquoise, Blue'::TEXT),

    -- Waste Bins With Dome Lid
    ('64c4f10a-f7bc-52f1-8c35-38de11290569'::UUID, 'waste-bins-with-dome-lid', 900, '4120',
     '120 L dome-lid bin — top Ø 600 mm, bottom Ø 440 mm, height 900 mm.', '120 L', 600, 600, 900,
     'Blue'::TEXT),
    ('6b34ce0c-c7fa-55d0-8210-4cb4c5556111'::UUID, 'waste-bins-with-dome-lid', 870, '4100',
     '100 L dome-lid bin — top Ø 555 mm, bottom Ø 420 mm, height 870 mm.', '100 L', 555, 555, 870,
     'Blue'::TEXT),

    -- Storage Bin With Fix Lid
    ('826961b2-f8d2-52a1-84c9-3731c71daece'::UUID, 'storage-bin-with-fix-lid', 750, '4120',
     '120 L storage bin with fixed lid — top Ø 600 mm, bottom Ø 440 mm, height 750 mm.', '120 L', 600, 600, 750,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('de70d210-ff32-55a1-810e-bf846ae2c174'::UUID, 'storage-bin-with-fix-lid', 710, '4100',
     '100 L storage bin with fixed lid — top Ø 555 mm, bottom Ø 420 mm, height 710 mm.', '100 L', 555, 555, 710,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('df12a4d1-cac5-5ae8-8098-04d451fea50a'::UUID, 'storage-bin-with-fix-lid', 669, '4080',
     '80 L storage bin with fixed lid — top Ø 510 mm, bottom Ø 370 mm, height 669 mm.', '80 L', 510, 510, 669,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('69b6ad8b-42ce-502f-86cd-351cd9a4ecb8'::UUID, 'storage-bin-with-fix-lid', 622, '4060',
     '60 L storage bin with fixed lid — top Ø 465 mm, bottom Ø 335 mm, height 622 mm.', '60 L', 465, 465, 622,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('7bfff143-8176-5e5c-8527-681ea98ef8f9'::UUID, 'storage-bin-with-fix-lid', 529, '4040',
     '40 L storage bin with fixed lid — top Ø 410 mm, bottom Ø 310 mm, height 529 mm.', '40 L', 410, 410, 529,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('22753fba-8b85-51a4-8e67-81a7aaa1567b'::UUID, 'storage-bin-with-fix-lid', 425, '4030',
     '30 L storage bin with fixed lid — top Ø 350 mm, bottom Ø 285 mm, height 425 mm.', '30 L', 350, 350, 425,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('02ccdcc8-b7cc-5363-8a52-f3a809920f2d'::UUID, 'storage-bin-with-fix-lid', 385, '4025',
     '25 L storage bin with fixed lid — top Ø 370 mm, bottom Ø 265 mm, height 385 mm.', '25 L', 370, 370, 385,
     'Blue, Red, Turquoise/Green'::TEXT),
    ('b34db817-c071-58f5-83ad-b4fe5e0df0f5'::UUID, 'storage-bin-with-fix-lid', 320, '4010',
     '10 L storage bin with fixed lid — top Ø 280 mm, bottom Ø 190 mm, height 320 mm.', '10 L', 280, 280, 320,
     'Blue, Red, Turquoise/Green'::TEXT),

    -- Large Waste Bins (footprint series, one model each)
    ('32f677e7-db33-4325-bc31-8dd005dbe580'::UUID, 'waste-bins-large-1360x1060', 1370, '21100',
     '1100 L large waste bin with wheels — 1360 × 1060 × 1370 mm.', '1100 L', 1360, 1060, 1370,
     NULL::TEXT),
    ('8553aa45-b24e-49c9-a7ec-aa2aad985f29'::UUID, 'waste-bins-large-1220x785',  1230, '2660',
     '660 L large waste bin with wheels — 1220 × 785 × 1230 mm.', '660 L', 1220, 785, 1230,
     NULL::TEXT)
  ) AS v(id, series_slug, height, model_code, description, capacity, outer_l, outer_w, outer_h, colours)
  JOIN _wb_size szi ON szi.series_slug = v.series_slug AND szi.height = v.height
  WHERE true
  ON CONFLICT DO NOTHING;

  -- 6. Assert the whole catalogue landed, so a partial load can never pass silently.
  SELECT COUNT(*) INTO n_models
  FROM public.product_variants pv
  JOIN public.size_variants sz ON sz.id = pv.size_variant_id
  JOIN _wb_series ss ON ss.id = sz.series_id;

  IF n_models <> 23 THEN
    RAISE EXCEPTION 'Expected 23 Waste Bins models across the 10 Waste Bins series, found %.', n_models;
  END IF;

  RAISE NOTICE 'Waste Bins: % product types, % series, % sizes, % models now active under category %',
    n_types, n_series, n_sizes, n_models, v_category_id;
END $$;