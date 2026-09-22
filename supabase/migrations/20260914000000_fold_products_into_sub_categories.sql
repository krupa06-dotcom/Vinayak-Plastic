-- Vinayak Plastics — Fold products into sub-categories
--
-- The catalogue moves from:
--   Category -> Sub-category -> Product -> Variant (size · shape · colour)
-- to:
--   Category -> Sub-category (+ details, sizes, gallery)
--
-- A sub-category now holds the full product record (description, features,
-- applications, product code and featured flag) plus its own images,
-- specifications and variants tables. The old products / product_* tables
-- are dropped after the data is migrated, and enquiries link to a
-- sub-category instead of a product.
--
-- Run this ONCE, after all old product data is finalised. Best applied from
-- the Supabase SQL Editor (no server-side secret is required).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Add detail columns to sub_categories
-- ============================================================
ALTER TABLE sub_categories
  ADD COLUMN IF NOT EXISTS product_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS short_description VARCHAR(500),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS features TEXT[],
  ADD COLUMN IF NOT EXISTS applications JSONB,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Reuse the shared trigger (already defined by the initial schema) so the new column updates stay stamped.
DROP TRIGGER IF EXISTS set_sub_categories_updated_at ON sub_categories;
CREATE TRIGGER set_sub_categories_updated_at
  BEFORE UPDATE ON sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Table: sub_category_images
-- ============================================================
CREATE TABLE IF NOT EXISTS sub_category_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_category_id UUID NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(500),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_category_images_sub_category_id ON sub_category_images(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_sub_category_images_display_order ON sub_category_images(display_order);

ALTER TABLE sub_category_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view sub-category images"
  ON sub_category_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert sub-category images"
  ON sub_category_images FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sub-category images"
  ON sub_category_images FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete sub-category images"
  ON sub_category_images FOR DELETE
  USING (is_admin());

-- ============================================================
-- 3. Table: sub_category_specifications
-- ============================================================
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

CREATE POLICY "Public can view sub-category specifications"
  ON sub_category_specifications FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert sub-category specifications"
  ON sub_category_specifications FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sub-category specifications"
  ON sub_category_specifications FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete sub-category specifications"
  ON sub_category_specifications FOR DELETE
  USING (is_admin());

-- ============================================================
-- 4. Table: sub_category_variants
-- ============================================================
CREATE TABLE IF NOT EXISTS sub_category_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_category_id UUID NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,          -- e.g. "VPC-400"
  size VARCHAR(255),                   -- e.g. "400 × 300 × 130 mm"
  shape VARCHAR(255),                  -- e.g. "Rectangular", "Nestable"
  color VARCHAR(255),                  -- e.g. "Blue"
  capacity VARCHAR(255),               -- e.g. "15 kg"
  material VARCHAR(255),               -- e.g. "PP / HDPE"
  price VARCHAR(255),                  -- optional unit price / price band
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

CREATE POLICY "Public can view sub-category variants"
  ON sub_category_variants FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert sub-category variants"
  ON sub_category_variants FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sub-category variants"
  ON sub_category_variants FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete sub-category variants"
  ON sub_category_variants FOR DELETE
  USING (is_admin());

-- ============================================================
-- 5. Backfill the new structture from the existing products
-- ============================================================

-- 5a. Copy the primary product's details onto its owning sub-category.
--     Where several products exist under one sub-category, the first
--     (by display_order) wins — behaviour matches the old public site,
--     which pointed a sub-category page at its first product.
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
    sub_category_id,
    product_code,
    short_description,
    description,
    features,
    applications,
    is_featured
  FROM products
  ORDER BY sub_category_id, display_order, id
) p
WHERE p.sub_category_id = s.id;

-- 5b. Determine the image of the primary product for sub-categories that
--     do not already have one of their own.
WITH primary_product AS (
  SELECT DISTINCT ON (sub_category_id)
    products.id AS product_id,
    products.sub_category_id
  FROM products
  ORDER BY products.sub_category_id, products.display_order, products.id
),
primary_image AS (
  SELECT
    pp.sub_category_id,
    pi.image_url
  FROM primary_product pp
  JOIN product_images pi ON pi.product_id = pp.product_id
  ORDER BY pp.sub_category_id, pi.display_order
)
UPDATE sub_categories s
SET image_url = coalesce(
  s.image_url,
  (SELECT pi.image_url FROM primary_image pi WHERE pi.sub_category_id = s.id LIMIT 1)
);

-- 5c. Migrate product images -> sub-category images (id preserved).
INSERT INTO sub_category_images (id, sub_category_id, image_url, alt_text, display_order, created_at)
SELECT
  pi.id,
  p.sub_category_id,
  pi.image_url,
  pi.alt_text,
  pi.display_order,
  pi.created_at
FROM product_images pi
JOIN products p ON p.id = pi.product_id
ON CONFLICT (id) DO NOTHING;

-- 5d. Migrate product specifications -> sub-category specifications (id preserved).
INSERT INTO sub_category_specifications (id, sub_category_id, specification_name, specification_value, display_order)
SELECT
  ps.id,
  p.sub_category_id,
  ps.specification_name,
  ps.specification_value,
  ps.display_order
FROM product_specifications ps
JOIN products p ON p.id = ps.product_id
ON CONFLICT (id) DO NOTHING;

-- 5e. Migrate product variants -> sub-category variants (id preserved).
INSERT INTO sub_category_variants (
  id, sub_category_id, name, size, shape, color,
  capacity, material, price, is_active, display_order, created_at, updated_at
)
SELECT
  pv.id,
  p.sub_category_id,
  pv.name,
  pv.size,
  pv.shape,
  pv.color,
  pv.capacity,
  pv.material,
  pv.price,
  pv.is_active,
  pv.display_order,
  pv.created_at,
  pv.updated_at
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. enquiries: link to a sub-category instead of a product
-- ============================================================
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES sub_categories(id) ON DELETE SET NULL;

-- Point existing enquiries at the sub-category that owned the product they asked about.
UPDATE enquiries e
SET sub_category_id = p.sub_category_id
FROM products p
WHERE e.product_id = p.id
  AND e.sub_category_id IS NULL;

ALTER TABLE enquiries DROP COLUMN IF EXISTS product_id;

DROP INDEX IF EXISTS idx_enquiries_product_id;
CREATE INDEX IF NOT EXISTS idx_enquiries_sub_category_id ON enquiries(sub_category_id);

-- ============================================================
-- 7. Drop the old product tables (data now lives on sub-categories)
-- ============================================================
DROP TABLE IF EXISTS product_industries CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS product_specifications CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- ============================================================
-- 8. Documentation comments
-- ============================================================
COMMENT ON COLUMN sub_categories.product_code IS 'SKU / series code (formerly on products)';
COMMENT ON COLUMN sub_categories.short_description IS '1-2 sentence summary shown in listings';
COMMENT ON COLUMN sub_categories.description IS 'Full rich description of the product range';
COMMENT ON COLUMN sub_categories.features IS 'Bullet points describing key product features';
COMMENT ON COLUMN sub_categories.applications IS 'JSONB array of { name, description } industry applications';
COMMENT ON COLUMN sub_categories.is_featured IS 'Shown as a featured range on the homepage';
COMMENT ON TABLE sub_category_images IS 'Gallery images per sub-category (first = main image)';
COMMENT ON TABLE sub_category_specifications IS 'Flexible key-value specifications per sub-category';
COMMENT ON TABLE sub_category_variants IS 'Size, shape and colour variants for each sub-category';