-- Vinayak Plastics — Per-series Lid / Accessory Image
--
-- A crate series (footprint) sells several heights, but its lid does not vary
-- by height: one lid fits the whole footprint. So the lid is stored once on the
-- series row instead of being repeated on every size_variant.
--
--   series.lid_image_url  → photo shown in the "Lid" card on the series page
--   series.lid_label      → heading for that card (defaults to "Crate Lid")
--   series.lid_note       → short line under the dims (e.g. fitment note)
--
-- Leave lid_image_url NULL to hide the lid card for that series. This works for
-- any category, not just crates — pallets/bins can use it for their own lid or
-- cover accessory.

-- 1. Columns
ALTER TABLE series
  ADD COLUMN IF NOT EXISTS lid_image_url TEXT,
  ADD COLUMN IF NOT EXISTS lid_label VARCHAR(120),
  ADD COLUMN IF NOT EXISTS lid_note VARCHAR(255);

-- 2. Seed the existing crate series with the shared lid asset so the cards
--    appear immediately after this migration.
UPDATE series
SET lid_image_url = '/images/crate-lid.webp',
    lid_label     = COALESCE(lid_label, 'Crate Lid'),
    lid_note      = COALESCE(lid_note, 'Fits every height in this series')
WHERE lid_image_url IS NULL
  AND category_id IN (SELECT id FROM categories WHERE slug = 'plastic-crates');

-- 3. Documentation
COMMENT ON COLUMN series.lid_image_url IS
  'Photo of the lid / cover that fits this series footprint (height-independent). NULL hides the lid card.';
COMMENT ON COLUMN series.lid_label IS
  'Heading for the lid card on the series page. Defaults to "Crate Lid" when empty.';
COMMENT ON COLUMN series.lid_note IS
  'Optional note shown on the lid card, e.g. "Fits every height in this series".';