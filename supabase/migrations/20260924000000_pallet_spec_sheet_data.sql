-- Vinayak Plastics — Master industrial technical specification: pallet dataset
--
-- Enters the standard metric plastic pallet series from the master industrial
-- technical specification data sheet into the Phase-3 hierarchy:
--
--   categories
--     └── series            (one per base footprint, e.g. "1200 × 1000 Series")
--           └── size_variants       (height steps of that footprint, e.g. "150 mm")
--                 └── product_variants  (model number, e.g. "121015-3R")
--
-- All series belong to the Plastic Pallets category. Product rows carry the
-- structural build designations (version_code) and the load capacity expressed
-- as Static / Dynamic / Racking loads in kilograms.
--
-- Structural designator legend (version codes):
--   PDSS — Perforated Deck, Single Side
--   CDSS — Closed Deck, Single Side
--   CDDS — Closed Deck, Double Side / Reversible
--   9L   — 9-Leg Nestable design
--   3S / 3R — 3-Runner Bottom style
--
-- Idempotent: series lookup happens by (category_id, base_length, base_width).
-- Series rows UPSERT so the ascending display_order (1100 × 1100 → 1200 × 1200)
-- is applied even on re-run. All other inserts use ON CONFLICT DO NOTHING.
--
-- Run from the Supabase SQL Editor (no server-side secret required).

-- ============================================================
-- 1. Series — one row per base footprint, ascending by footprint size
-- ============================================================
INSERT INTO series (id, category_id, name, slug, base_length, base_width,
                    description, short_description, image_url,
                    is_featured, is_active, display_order)
VALUES
  -- Dominant footprint in Japanese, South Korean, and Southeast Asian
  -- chemical and maritime transport fleets
  ('91000000-0000-0000-0000-000000000001', 'c2222222-2222-2222-2222-222222222222',
   '1100 × 1100 Series', 'pallets-1100x1100', 1100, 1100,
   'The dominant footprint deployed within Japanese, South Korean, and Southeast Asian chemical and maritime transport fleets.',
   'The dominant footprint deployed within Japanese, South Korean, and Southeast Asian chemical and maritime transport fleets.',
   '/images/products/plastic-pallets.webp', false, true, 0),

  -- CP9 chemical spec: eliminates overhanging corners on drum/container loads
  ('91000000-0000-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222222',
   '1140 × 1140 Series', 'pallets-1140x1140', 1140, 1140,
   'Specialised CP9 chemical-spec platform engineered to eliminate overhanging corners when handling 55-gallon oil drums, large flour sacks, or chemical containers.',
   'Specialised CP9 chemical-spec platform engineered to eliminate overhanging corners when handling 55-gallon oil drums, large flour sacks, or chemical containers.',
   '/images/products/plastic-pallets.webp', false, true, 1),

  -- Clears standard pedestrian warehouse doorways and distribution gates
  ('91000000-0000-0000-0000-000000000003', 'c2222222-2222-2222-2222-222222222222',
   '1200 × 800 Series', 'pallets-1200x800', 1200, 800,
   'Engineered specifically to seamlessly clear standard pedestrian warehouse doorways and distribution gates across European logistics hubs.',
   'Engineered specifically to seamlessly clear standard pedestrian warehouse doorways and distribution gates across European logistics hubs.',
   '/images/products/plastic-pallets.webp', false, true, 2),

  -- Most widely deployed multi-industry pallet footprint
  ('91000000-0000-0000-0000-000000000004', 'c2222222-2222-2222-2222-222222222222',
   '1200 × 1000 Series', 'pallets-1200x1000', 1200, 1000,
   'The most widely deployed multi-industry pallet footprint across Europe, Asia, and North American export systems.',
   'The most widely deployed multi-industry pallet footprint across Europe, Asia, and North American export systems.',
   '/images/products/plastic-pallets.webp', true, true, 3),

  -- Heavy-duty oversized platforms for drums, flour sacks, chemical containers
  ('91000000-0000-0000-0000-000000000005', 'c2222222-2222-2222-2222-222222222222',
   '1200 × 1200 Series', 'pallets-1200x1200', 1200, 1200,
   'Heavy-duty oversized platforms designed to eliminate overhanging corners when handling 55-gallon oil drums, large flour sacks, or chemical containers.',
   'Heavy-duty oversized platforms designed to eliminate overhanging corners when handling 55-gallon oil drums, large flour sacks, or chemical containers.',
   '/images/products/plastic-pallets.webp', false, true, 4)
ON CONFLICT (category_id, base_length, base_width)
  WHERE base_length IS NOT NULL AND base_width IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    is_featured = EXCLUDED.is_featured,
    display_order = EXCLUDED.display_order;

-- ============================================================
-- 2. Size variants (heights) — 1100 × 1100 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('150 mm', 150, 0), ('140 mm', 140, 1), ('120 mm', 120, 2)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1100 AND s.base_width = 1100
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              weight, outer_length, outer_width, outer_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.tare, v.ol, v.ow, v.oh, true, 0
FROM (VALUES
  ('111115-3R', 'PDSS / CDSS', 'Static 4500 kg / Dynamic 1200 kg / Racking 900 kg', '16.0 – 19.5 kg', 1100, 1100, 150),
  ('111114-3R', 'PDSS / CDSS', 'Static 4000 kg / Dynamic 1000 kg / Racking 700 kg', '14.5 – 15.5 kg', 1100, 1100, 140),
  ('111112-9L', 'PDSS / Nestable', 'Static 2500 kg / Dynamic 800 kg / Floor Only',      '9.5 – 11.0 kg', 1100, 1100, 120)
) AS v(model_code, version_code, capacity, tare, ol, ow, oh)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1100 AND s.base_width = 1100
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 3. Size variants (heights) — 1140 × 1140 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('150 mm', 150, 0)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1140 AND s.base_width = 1140
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              weight, outer_length, outer_width, outer_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.tare, v.ol, v.ow, v.oh, true, 0
FROM (VALUES
  ('114114-CP', 'CP9 / Chemical Spec', 'Static 5000 kg / Dynamic 1500 kg / Racking 1000 kg', '18.0 – 21.0 kg', 1140, 1140, 150)
) AS v(model_code, version_code, capacity, tare, ol, ow, oh)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1140 AND s.base_width = 1140
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 4. Size variants (heights) — 1200 × 800 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('160 mm', 160, 0), ('150 mm', 150, 1), ('140 mm', 140, 2)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1200 AND s.base_width = 800
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              weight, outer_length, outer_width, outer_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.tare, v.ol, v.ow, v.oh, true, 0
FROM (VALUES
  ('120816-3R', 'PDSS / CDSS', 'Static 4000 kg / Dynamic 1200 kg / Racking 800 kg', '15.0 – 17.0 kg', 1200, 800, 160),
  ('120815-3R', 'PDSS / CDSS', 'Static 3500 kg / Dynamic 1000 kg / Racking 600 kg', '13.5 – 15.0 kg', 1200, 800, 150),
  ('120814-9L', 'PDSS / Nestable', 'Static 2000 kg / Dynamic 800 kg / Floor Only',   '8.5 – 10.0 kg', 1200, 800, 140)
) AS v(model_code, version_code, capacity, tare, ol, ow, oh)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1200 AND s.base_width = 800
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 5. Size variants (heights) — 1200 × 1000 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('160 mm', 160, 0), ('150 mm', 150, 1), ('130 mm', 130, 2), ('125 mm', 125, 3)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1200 AND s.base_width = 1000
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              weight, outer_length, outer_width, outer_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.tare, v.ol, v.ow, v.oh, true, 0
FROM (VALUES
  ('121016-3R', 'PDSS / CDSS', 'Static 5000 kg / Dynamic 1500 kg / Racking 1000 kg', '18.0 – 22.0 kg', 1200, 1000, 160),
  ('121015-3R', 'PDSS / CDSS', 'Static 4000 kg / Dynamic 1200 kg / Racking 800 kg',  '15.0 – 17.5 kg', 1200, 1000, 150),
  ('121013-9L', 'PDSS / Nestable', 'Static 2500 kg / Dynamic 1000 kg / Floor Only',  '11.5 – 13.0 kg', 1200, 1000, 130),
  ('121012-9L', 'CDSS / Nestable', 'Static 2000 kg / Dynamic 750 kg / Floor Only',   '10.0 – 12.0 kg', 1200, 1000, 125)
) AS v(model_code, version_code, capacity, tare, ol, ow, oh)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1200 AND s.base_width = 1000
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 6. Size variants (heights) — 1200 × 1200 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('160 mm', 160, 0), ('150 mm', 150, 1)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1200 AND s.base_width = 1200
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              weight, outer_length, outer_width, outer_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.tare, v.ol, v.ow, v.oh, true, 0
FROM (VALUES
  ('121216-SR', 'CDSS / PDSS Heavy', 'Static 6000 kg / Dynamic 2000 kg / Racking 1200 kg',       '24.0 – 28.0 kg', 1200, 1200, 160),
  ('121215-CD', 'CDDS / Reversible', 'Static 6000 kg / Dynamic 1800 kg / Racking 1500 kg (Full Grid)', '26.5 – 31.0 kg', 1200, 1200, 150)
) AS v(model_code, version_code, capacity, tare, ol, ow, oh)
JOIN series s ON s.category_id = 'c2222222-2222-2222-2222-222222222222'
  AND s.base_length = 1200 AND s.base_width = 1200
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;