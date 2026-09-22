-- ============================================================
-- VINAYAK PLASTICS — Bring the remote Supabase DB in sync
-- ============================================================
-- WHY THIS EXISTS
--   The deployed admin JS (and the categories page especially) queries
--   sub_category_variants / sub_category_images / sub_category_specifications.
--   Those tables only exist once the "fold products into sub-categories"
--   migration has been applied. On the linked project they are MISSING
--   (a plain REST check returns 404 for sub_category_*), so the categories
--   list fails to load and newly-saved categories never appear — the
--   "data is not entering" symptom.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--   It is safe to run once (idempotent where possible).
-- ============================================================

-- ============================================================
-- SECTION 0 (OPTIONAL). Remove the existing sample catalogue.
--   Uncomment the line below ONLY if you want to wipe the current
--   categories/sub-categories/products/variants/specs/images first.
--   It cascades, so everything under them is deleted.
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
-- 4. Fold products into sub-categories (new content model)
--    Source: supabase/migrations/20260914000000_fold_products_into_sub_categories.sql
-- ============================================================

-- 4.1 Add detail columns to sub_categories
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
CREATE INDEX IF NOT EXISTS idx_sub_category_images_sub_category_id ON sub_category_images(sub_category_id);
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

-- 4.5 Backfill from existing products
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

DELETE FROM sub_category_specifications WHERE LOWER(specification_name) = 'weight';

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

-- 4.6 enquiries: link to sub-category instead of product
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES sub_categories(id) ON DELETE SET NULL;

UPDATE enquiries e
SET sub_category_id = p.sub_category_id
FROM products p
WHERE e.product_id = p.id
  AND e.sub_category_id IS NULL;

ALTER TABLE enquiries DROP COLUMN IF EXISTS product_id;
DROP INDEX IF EXISTS idx_enquiries_product_id;
CREATE INDEX IF NOT EXISTS idx_enquiries_sub_category_id ON enquiries(sub_category_id);

-- 4.7 Drop the old product tables (data now lives on sub-categories)
DROP TABLE IF EXISTS product_industries CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS product_specifications CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;