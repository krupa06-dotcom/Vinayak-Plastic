-- Vinayak Plastics — Tie sub-category images to a specific size/model
--
-- Product images were previously an unordered gallery with no link to the
-- size/model they belong to. The admin product form now attaches one photo
-- per size, so images need to know which sub_category_variant they belong to.
-- This mirrors how category_images.category_variant_id already works.
--
-- Run ONCE from the Supabase SQL Editor (no server-side secret is required).

ALTER TABLE sub_category_images
  ADD COLUMN IF NOT EXISTS sub_category_variant_id UUID REFERENCES sub_category_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sub_category_images_sub_category_variant_id
  ON sub_category_images(sub_category_variant_id);

-- Backfill: tie existing unassigned gallery images to the first size of the
-- same sub-category so every photo becomes editable on the size that owns it.
UPDATE sub_category_images sci
SET sub_category_variant_id =
  (SELECT sv.id
     FROM sub_category_variants sv
    WHERE sv.sub_category_id = sci.sub_category_id
    ORDER BY sv.display_order, sv.id
    LIMIT 1)
WHERE sci.sub_category_variant_id IS NULL;

COMMENT ON TABLE sub_category_images IS 'Product photos; each is usually tied to a specific size/model (first image = main photo)';
COMMENT ON COLUMN sub_category_images.sub_category_variant_id IS 'Ties an image to a specific size/model; NULL = legacy unassigned gallery image';