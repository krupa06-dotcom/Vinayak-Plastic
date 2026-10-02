-- Vinayak Plastics — Support Sub-Categories / Product Types in Series Hierarchy
--
-- This migration updates the Series hierarchy so a Series can optionally
-- belong to a Sub-Category (Product Type) under a Category:
--
--   categories (e.g. "Plastic Crates")
--     └── sub_categories / product types (e.g. "Roto Crates", "Standard Crates", "Jumbo Crates")
--           └── series (e.g. "600 × 400 Series")
--                 └── size_variants (e.g. "220 mm")
--                       └── product_variants (e.g. "Ribbed Bottom" / model codes)
--                             └── product_images
--
-- If a category has no sub-types (or direct series), series.sub_category_id is NULL
-- and series.category_id links directly to the category.

-- 1. Add sub_category_id to series table
ALTER TABLE series
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES sub_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_series_sub_category_id ON series(sub_category_id);

-- 2. Ensure sub_categories table has proper RLS policies
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view sub_categories" ON sub_categories;
CREATE POLICY "Public can view sub_categories"
  ON sub_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert sub_categories" ON sub_categories;
CREATE POLICY "Admins can insert sub_categories"
  ON sub_categories FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update sub_categories" ON sub_categories;
CREATE POLICY "Admins can update sub_categories"
  ON sub_categories FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete sub_categories" ON sub_categories;
CREATE POLICY "Admins can delete sub_categories"
  ON sub_categories FOR DELETE USING (is_admin());

-- 3. Document new relationship
COMMENT ON COLUMN series.sub_category_id IS 'Optional link to a sub-category / product type (e.g. Roto Crates) within the parent category';
