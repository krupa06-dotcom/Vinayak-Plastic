-- ============================================================
-- Backfill colour <-> product image mappings (all models)
-- ============================================================
-- The gallery reads colours from product_variants.colours and stores a photo's
-- colour association in product_images.alt_text as "[color: <Name>] <alt>".
-- Some older rows have photos uploaded but no colour data, so the public
-- page cannot switch the main image when a colour is selected.
--
-- This migration is generic: it applies to every model, not a single product.
--   1. Derive missing colour lists from photos that already carry a colour tag.
--   2. For single-colour variants whose photos are untagged, tag every photo
--      with that one colour (safe because every photo of a single-colour product
--      is that colour).
--
-- The statements are idempotent and only fill blank values, so re-running this
-- migration or applying it after an admin has edited the row is safe.
-- ============================================================

-- 1. Existing tagged photos -> missing product colour lists.
WITH tagged AS (
  SELECT DISTINCT
    pi.product_variant_id,
    initcap(trim((regexp_match(pi.alt_text, '^\s*\[colou?r:\s*([^\]]+)\]', 'i'))[1])) AS colour
  FROM product_images pi
  WHERE pi.alt_text ~* '^\s*\[colou?r:'
),
grouped AS (
  SELECT product_variant_id, string_agg(colour, ', ' ORDER BY colour) AS colour_list
  FROM tagged
  WHERE colour IS NOT NULL AND colour <> ''
  GROUP BY product_variant_id
)
UPDATE product_variants pv
SET colours = g.colour_list
FROM grouped g
WHERE pv.id = g.product_variant_id
  AND (pv.colours IS NULL OR btrim(pv.colours) = '');

-- 2. Single-colour variants with untagged photos -> tag all photos with that colour.
WITH single_colour_variants AS (
  SELECT id, trim(colours) AS colour
  FROM product_variants
  WHERE colours IS NOT NULL
    AND btrim(colours) <> ''
    AND colours NOT LIKE '%,%'
),
to_tag AS (
  SELECT
    pi.id AS image_id,
    sc.colour,
    pi.alt_text
  FROM product_images pi
  JOIN single_colour_variants sc ON sc.id = pi.product_variant_id
  WHERE pi.alt_text IS NULL OR pi.alt_text !~* '^\s*\[colou?r:'
)
UPDATE product_images pi
SET alt_text = '[color: ' || t.colour || ']' ||
  CASE WHEN btrim(coalesce(t.alt_text, '')) = '' THEN '' ELSE ' ' || t.alt_text END
FROM to_tag t
WHERE pi.id = t.image_id;
