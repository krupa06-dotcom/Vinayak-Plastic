-- Vinayak Plastics — Give main categories their own product details
--
-- Categories previously only had a name, description and a single image.
-- This adds per-category sizes/colours (the same variant builder used by
-- sub-categories) plus a gallery where each image can be attached to a
-- specific size, so the main ranges can be displayed exactly like products.
--
-- New model:
--   categories
--     ├── category_variants  (size · shape · colour · capacity …)
--     └── category_images    (gallery; optionally tied to one variant/size)

-- ============================================================
-- 1. Table: category_variants
-- ============================================================
CREATE TABLE IF NOT EXISTS category_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_category_variants_category_id ON category_variants(category_id);
CREATE INDEX IF NOT EXISTS idx_category_variants_is_active ON category_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_category_variants_display_order ON category_variants(display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_variants_category_name ON category_variants(category_id, name);

DROP TRIGGER IF EXISTS set_category_variants_updated_at ON category_variants;
CREATE TRIGGER set_category_variants_updated_at
  BEFORE UPDATE ON category_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE category_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view category variants"
  ON category_variants FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert category variants"
  ON category_variants FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update category variants"
  ON category_variants FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete category variants"
  ON category_variants FOR DELETE
  USING (is_admin());

-- ============================================================
-- 2. Table: category_images
-- Each image can belong to the category as a whole (category_variant_id NULL)
-- or to a specific size/model (category_variant_id set).
-- ============================================================
CREATE TABLE IF NOT EXISTS category_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  category_variant_id UUID REFERENCES category_variants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(500),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_images_category_id ON category_images(category_id);
CREATE INDEX IF NOT EXISTS idx_category_images_category_variant_id ON category_images(category_variant_id);
CREATE INDEX IF NOT EXISTS idx_category_images_display_order ON category_images(display_order);

ALTER TABLE category_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view category images"
  ON category_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert category images"
  ON category_images FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update category images"
  ON category_images FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete category images"
  ON category_images FOR DELETE
  USING (is_admin());

-- ============================================================
-- 3. Documentation comments
-- ============================================================
COMMENT ON TABLE category_variants IS 'Size, shape and colour variants for each main category';
COMMENT ON TABLE category_images IS 'Gallery images per category; category_variant_id ties an image to a specific size';