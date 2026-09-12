-- Vinayak Plastics — Product Variants
--
-- Products come in many sizes, shapes and colours. This table stores one row
-- per model / size / shape combination under a product, so the catalogue is
-- structured as:
--
--   Category → Sub-category → Product → Variant (size · shape · colour)
--
-- Safe to re-run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: product_variants
-- ============================================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,          -- e.g. "VPC-400"
  size VARCHAR(255),                   -- e.g. "400 × 300 × 130 mm"
  shape VARCHAR(255),                  -- e.g. "Rectangular", "Nestable"
  color VARCHAR(255),                  -- e.g. "Blue"
  weight VARCHAR(255),                 -- e.g. "~750 g"
  capacity VARCHAR(255),               -- e.g. "15 kg"
  material VARCHAR(255),               -- e.g. "PP / HDPE"
  price VARCHAR(255),                  -- optional unit price / price band
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_is_active ON product_variants(is_active);
CREATE INDEX idx_product_variants_display_order ON product_variants(display_order);
CREATE UNIQUE INDEX idx_product_variants_product_name ON product_variants(product_id, name);

CREATE TRIGGER set_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product variants"
  ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert product variants"
  ON product_variants FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update product variants"
  ON product_variants FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete product variants"
  ON product_variants FOR DELETE
  USING (is_admin());

-- ============================================================
-- One-time backfill: rebuild variants from the old flat
-- product_specifications layout, which stored one block per
-- model ("Model" → "Size" → "Weight" → "Capacity" → "Material").
-- Deterministic IDs keep this safe to re-run.
-- ============================================================
INSERT INTO product_variants (id, product_id, name, size, weight, capacity, material, display_order, is_active)
SELECT
  md5(product_id::text || ':' || block.name)::uuid AS id,
  product_id,
  block.name,
  block.size,
  block.weight,
  block.capacity,
  block.material,
  row_number() OVER (PARTITION BY product_id ORDER BY block.min_order)::int AS display_order,
  true AS is_active
FROM (
  SELECT
    o.product_id,
    MAX(CASE WHEN o.specification_name = 'Model' THEN o.specification_value END) AS name,
    MAX(CASE WHEN o.specification_name IN ('Size', 'Size (mm)', 'External Size (mm)') THEN o.specification_value END) AS size,
    MAX(CASE WHEN o.specification_name = 'Weight' THEN o.specification_value END) AS weight,
    MAX(CASE WHEN o.specification_name IN ('Capacity', 'Load Capacity') THEN o.specification_value END) AS capacity,
    MAX(CASE WHEN o.specification_name = 'Material' THEN o.specification_value END) AS material,
    MIN(o.display_order) AS min_order
  FROM (
    SELECT id, product_id, specification_name, specification_value, display_order,
      COUNT(*) FILTER (WHERE specification_name = 'Model') OVER (
        PARTITION BY product_id ORDER BY display_order
      ) AS block_id
    FROM product_specifications
  ) o
  GROUP BY o.product_id, o.block_id
  HAVING MAX(CASE WHEN o.specification_name = 'Model' THEN o.specification_value END) IS NOT NULL
) block
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE product_variants IS 'Size, shape and colour variants for each product';