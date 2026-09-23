-- Vinayak Plastics — Master industrial technical specification: crate size dataset
--
-- Enters every standard metric modular plastic crate series from the master
-- industrial technical specification data sheet into the Phase-3 hierarchy:
--
--   categories
--     └── series            (one per base footprint, e.g. "600 × 400 Series")
--           └── size_variants       (height steps of that footprint, e.g. "370 mm")
--                 └── product_variants  (model number, e.g. "604037")
--
-- All series belong to the Plastic Crates category. Product rows carry the
-- structural build designations (version_code, e.g. "FC / FP / FPBC"),
-- the outer / inner dimensions and the volumetric capacity in litres.
--
-- Idempotent: series lookup happens by (category_id, base_length, base_width),
-- so if a footprint series already exists (e.g. built by the series_hierarchy
-- backfill) the sizes and models are attached to that exact series instead of
-- creating a duplicate. Series rows UPSERT so the ascending display_order
-- (300 × 200 → 800 × 600) is applied even on re-run. All other inserts use
-- ON CONFLICT DO NOTHING.
--
-- Run from the Supabase SQL Editor (no server-side secret required).
--
-- Structural build designation legend (version codes):
--   FC   — Fully Closed
--   FP   — Fully Perforated
--   CC   — Complete Closed
--   CH   — Complete Closed with Handle
--   FCRB — Fully Closed, Ribbed Bottom
--   CCRB — Complete Closed, Ribbed Bottom
--   FPBC — Fully Perforated, Bottom Closed
--   FPHC — Fully Perforated with Handle
--   FPBCHC — Fully Perforated, Bottom Closed with Handle
--   FPSC — Fully Perforated, Side Closed
--   SCH  — Complete Closed with Handle
--   SP   — Side Perforated / Mesh Walls, Closed Floor
--   TP   — Totally Perforated / Full Mesh
--   SCL  — Slotted & Closed-Leg (standard assembly-line crate)
--   FB   — Flat Bottom
--   RB   — Ribbed Bottom
--   BB   — Blank Bottom
--   Agro — Agricultural / horticultural ventilation crate
--   Wheel— Integrated transport wheels / pallet-racking reinforcement

-- ============================================================
-- 1. Series — one row per base footprint, ascending by footprint size
-- ============================================================
INSERT INTO series (id, category_id, name, slug, base_length, base_width,
                    description, short_description, image_url,
                    is_featured, is_active, display_order)
VALUES
  -- Micro-sorting crates: assembly lines, workshops, bin shelves
  ('90000000-0000-0000-0000-000000000003', 'c1111111-1111-1111-1111-111111111111',
   '300 × 200 Series', 'crates-300x200', 300, 200,
   'Micro-sorting crates utilized on factory assembly lines, workshops, and high-density bin shelves.',
   'Micro-sorting crates utilized on factory assembly lines, workshops, and high-density bin shelves.',
   '/images/products/plastic-crates.webp', false, true, 0),

  -- Sub-modular: stacks two-abreast onto a 600 × 400 layer
  ('90000000-0000-0000-0000-000000000002', 'c1111111-1111-1111-1111-111111111111',
   '400 × 300 Series', 'crates-400x300', 400, 300,
   'Perfect sub-modular sizing designed to stack two-abreast directly onto a 600 × 400 series crate layer.',
   'Perfect sub-modular sizing designed to stack two-abreast directly onto a 600 × 400 series crate layer.',
   '/images/products/plastic-crates.webp', false, true, 1),

  -- Commercial kitchen racking, refrigeration, flight catering, cold-room food processing
  ('90000000-0000-0000-0000-000000000005', 'c1111111-1111-1111-1111-111111111111',
   '500 × 325 Series', 'crates-500x325', 500, 325,
   'Sized for commercial kitchen racking, refrigeration units, flight catering setups, and cold-room food processing.',
   'Sized for commercial kitchen racking, refrigeration units, flight catering setups, and cold-room food processing.',
   '/images/products/plastic-crates.webp', false, true, 2),

  -- Skeletal / agricultural: optimized airflow, reduced metabolic decay in transit
  ('90000000-0000-0000-0000-000000000006', 'c1111111-1111-1111-1111-111111111111',
   '540 × 360 Series', 'crates-540x360', 540, 360,
   'Skeletal-structured crates dedicated to optimized fruit and vegetable airflow, reducing metabolic decay during transit.',
   'Skeletal-structured crates dedicated to optimized fruit and vegetable airflow, reducing metabolic decay during transit.',
   '/images/products/plastic-crates.webp', false, true, 3),

  -- Standard footprint: global manufacturing, automated sorting, pallet logistics
  ('90000000-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111',
   '600 × 400 Series', 'crates-600x400', 600, 400,
   'The standard footprint for global manufacturing, automated sorting, and multi-tier pallet logistics.',
   'The standard footprint for global manufacturing, automated sorting, and multi-tier pallet logistics.',
   '/images/products/plastic-crates.webp', true, true, 4),

  -- Expanded footprint: bulky industrial components, marine, retail distribution
  ('90000000-0000-0000-0000-000000000004', 'c1111111-1111-1111-1111-111111111111',
   '650 × 450 Series', 'crates-650x450', 650, 450,
   'Expanded footprint layout optimized for handling bulky industrial components, large marine catches, or large retail distribution loads.',
   'Expanded footprint layout optimized for handling bulky industrial components, large marine catches, or large retail distribution loads.',
   '/images/products/plastic-crates.webp', false, true, 5),

  -- Maximum tier footprint: transport wheels / steel pallet racking reinforcements
  ('90000000-0000-0000-0000-000000000007', 'c1111111-1111-1111-1111-111111111111',
   '800 × 600 Series', 'crates-800x600', 800, 600,
   'The maximum tier structural footprint, frequently integrated with transport wheels or steel pallet racking reinforcements.',
   'The maximum tier structural footprint, frequently integrated with transport wheels or steel pallet racking reinforcements.',
   '/images/products/plastic-crates.webp', false, true, 6)
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
-- 2. Size variants (heights) — 600 × 400 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('370 mm', 370, 0), ('325 mm', 325, 1), ('280 mm', 280, 2),
  ('245 mm', 245, 3), ('220 mm', 220, 4), ('180 mm', 180, 5),
  ('160 mm', 160, 6), ('125 mm', 125, 7), ('80 mm', 80, 8)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 600 AND s.base_width = 400
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              outer_length, outer_width, outer_height,
                              inner_length, inner_width, inner_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.ol, v.ow, v.oh, v.il, v.iw, v.ih, true, 0
FROM (VALUES
  ('604037', 'FC / FP / FPBC',            '73.58 L', 600, 400, 370, 560, 365, 360),
  ('604032', 'FC / CC / FCRB / CCRB / FP / FPHC / FPBC / FPBCHC', '65.99 L', 600, 400, 325, 565, 365, 320),
  ('604028', 'FC / FCRB / CC / CCRB / FP / FPBC / FPBCHC',        '56.71 L', 600, 400, 280, 565, 365, 275),
  ('604024', 'FC / FCRB / CC / CCRB / FP / FPBC / FPBCHC',        '49.49 L', 600, 400, 245, 565, 365, 240),
  ('604022', 'FC / CC / FCRB / CCRB / FP / FPHC / FPBC / FPBCHC', '44.34 L', 600, 400, 220, 565, 365, 215),
  ('604018', 'FC / FCRB / CC / CCRB / FP / FPBC',                 '36.09 L', 600, 400, 180, 565, 365, 175),
  ('604016', 'FC / FCRB / CC / CCRB / FP / FPSC',                 '31.96 L', 600, 400, 160, 565, 365, 155),
  ('604012', 'FC / FCRB / CC / CCRB / FP / FPBC',                 '24.75 L', 600, 400, 125, 565, 365, 120),
  ('604008', 'CC / CCRB / FP / FPBC',                             '15.47 L', 600, 400,  80, 565, 365,  75)
) AS v(model_code, version_code, capacity, ol, ow, oh, il, iw, ih)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 600 AND s.base_width = 400
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 3. Size variants (heights) — 400 × 300 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('275 mm', 275, 0), ('220 mm', 220, 1), ('200 mm', 200, 2),
  ('175 mm', 175, 3), ('150 mm', 150, 4), ('120 mm', 120, 5),
  ('100 mm', 100, 6), ('90 mm', 90, 7), ('65 mm', 65, 8)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 400 AND s.base_width = 300
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              outer_length, outer_width, outer_height,
                              inner_length, inner_width, inner_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.ol, v.ow, v.oh, v.il, v.iw, v.ih, true, 0
FROM (VALUES
  ('403027', 'FC / FP / FPBC', '26.00 L', 400, 300, 275, 365, 265, 270),
  ('403022', 'FC / FP / FPBC', '21.00 L', 400, 300, 220, 365, 265, 215),
  ('403020', 'SCL / FB / RB',  '19.00 L', 400, 300, 200, 365, 265, 195),
  ('403017', 'FC / FP / FPBC', '17.00 L', 400, 300, 175, 365, 265, 170),
  ('403015', 'SCL / FB / RB',  '14.00 L', 400, 300, 150, 365, 265, 145),
  ('403012', 'FC / FP / FPBC', '11.50 L', 400, 300, 120, 365, 265, 115),
  ('403010', 'SCL / FB / BB / RB', '9.00 L', 400, 300, 100, 365, 265, 95),
  ('403009', 'SCL / FB / RB',  '8.50 L', 400, 300,  90, 365, 265, 85),
  ('403006', 'SCL / FB / RB',  '6.00 L', 400, 300,  65, 365, 265, 55)
) AS v(model_code, version_code, capacity, ol, ow, oh, il, iw, ih)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 400 AND s.base_width = 300
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 4. Size variants (heights) — 300 × 200 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('200 mm', 200, 0), ('175 mm', 175, 1), ('150 mm', 150, 2), ('100 mm', 100, 3)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 300 AND s.base_width = 200
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              outer_length, outer_width, outer_height,
                              inner_length, inner_width, inner_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.ol, v.ow, v.oh, v.il, v.iw, v.ih, true, 0
FROM (VALUES
  ('302020', 'SCL / FB / RB',      '8.00 L', 300, 200, 200, 265, 165, 190),
  ('302017', 'SCL / FB / RB',      '7.00 L', 300, 200, 175, 265, 165, 165),
  ('302015', 'SCL / FB / RB / BB', '6.00 L', 300, 200, 150, 265, 165, 145),
  ('302010', 'SCL / FB / RB / BB', '4.00 L', 300, 200, 100, 265, 165,  95)
) AS v(model_code, version_code, capacity, ol, ow, oh, il, iw, ih)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 300 AND s.base_width = 200
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 5. Size variants (heights) — 650 × 450 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('485 mm', 485, 0), ('325 mm', 325, 1), ('315 mm', 315, 2),
  ('300 mm', 300, 3), ('260 mm', 260, 4), ('210 mm', 210, 5)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 650 AND s.base_width = 450
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              outer_length, outer_width, outer_height,
                              inner_length, inner_width, inner_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.ol, v.ow, v.oh, v.il, v.iw, v.ih, true, 0
FROM (VALUES
  ('654548', 'CC / CH / TP / SP', '120.00 L', 650, 450, 485, 615, 405, 468),
  ('654532', 'CC / CH / TP / SP', '85.00 L', 650, 450, 325, 610, 405, 310),
  ('654531', 'CC / CH / TP / SP', '76.00 L', 650, 450, 315, 610, 405, 305),
  ('654530', 'CC / CH / FB / TP', '76.00 L', 650, 450, 300, 610, 405, 290),
  ('654526', 'CC / CH / TP / SP', '50.00 L', 650, 450, 260, 610, 405, 250),
  ('654521', 'CC / CH / TP / SP', '50.00 L', 650, 450, 210, 600, 400, 200)
) AS v(model_code, version_code, capacity, ol, ow, oh, il, iw, ih)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 650 AND s.base_width = 450
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 6. Size variants (heights) — 500 × 325 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('360 mm', 360, 0), ('250 mm', 250, 1), ('150 mm', 150, 2), ('100 mm', 100, 3)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 500 AND s.base_width = 325
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              outer_length, outer_width, outer_height,
                              inner_length, inner_width, inner_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.ol, v.ow, v.oh, v.il, v.iw, v.ih, true, 0
FROM (VALUES
  ('533236', 'CC / CH / TP / SP', '45.00 L', 500, 325, 360, 468, 292, 345),
  ('533225', 'CC / CH / TP / FB', '32.00 L', 500, 325, 250, 468, 292, 242),
  ('533215', 'CC / CH / FB / TP', '18.50 L', 500, 325, 150, 468, 292, 142),
  ('533210', 'CC / CH / FB / TP', '12.00 L', 500, 325, 100, 468, 292,  92)
) AS v(model_code, version_code, capacity, ol, ow, oh, il, iw, ih)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 500 AND s.base_width = 325
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 7. Size variants (heights) — 540 × 360 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('350 mm', 350, 0), ('300 mm', 300, 1), ('290 mm', 290, 2)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 540 AND s.base_width = 360
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              outer_length, outer_width, outer_height,
                              inner_length, inner_width, inner_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.ol, v.ow, v.oh, v.il, v.iw, v.ih, true, 0
FROM (VALUES
  ('543635', 'TP / SP / Agro', '56.00 L', 540, 360, 350, 505, 325, 340),
  ('543630', 'TP / SP / Agro', '45.00 L', 540, 360, 300, 505, 325, 290),
  ('543629', 'TP / SP / Agro', '42.00 L', 540, 360, 290, 505, 325, 280)
) AS v(model_code, version_code, capacity, ol, ow, oh, il, iw, ih)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 540 AND s.base_width = 360
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;

-- ============================================================
-- 8. Size variants (heights) — 800 × 600 Series
-- ============================================================
INSERT INTO size_variants (series_id, label, height, is_active, display_order)
SELECT s.id, v.label, v.height, true, v.disp
FROM (VALUES
  ('425 mm', 425, 0), ('315 mm', 315, 1)
) AS v(label, height, disp)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 800 AND s.base_width = 600
ON CONFLICT (series_id, height) DO NOTHING;

INSERT INTO product_variants (size_variant_id, version_code, model_code, load_capacity,
                              outer_length, outer_width, outer_height,
                              inner_length, inner_width, inner_height,
                              is_active, display_order)
SELECT sv.id, v.version_code, v.model_code, v.capacity,
       v.ol, v.ow, v.oh, v.il, v.iw, v.ih, true, 0
FROM (VALUES
  ('806042', 'CC / TP / Wheel', '183.00 L', 809, 570, 425, 760, 538, 405),
  ('806031', 'CC / TP / SP',    '125.00 L', 810, 570, 315, 760, 540, 305)
) AS v(model_code, version_code, capacity, ol, ow, oh, il, iw, ih)
JOIN series s ON s.category_id = 'c1111111-1111-1111-1111-111111111111'
  AND s.base_length = 800 AND s.base_width = 600
JOIN size_variants sv ON sv.series_id = s.id AND sv.height = v.oh
ON CONFLICT (size_variant_id, model_code) DO NOTHING;