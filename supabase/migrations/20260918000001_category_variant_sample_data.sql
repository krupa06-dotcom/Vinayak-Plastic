-- Vinayak Plastics — Sample category sizes & images
--
-- The category_variants / category_images tables back the Supreme-style
-- structure: the product (range) page shows every size as a name+colour+
-- image card, and each size opens its own detail page. Populate them with
-- the standard models already used by the sub-categories so the public site
-- renders the new Level-2 "Range" cards and Level-3 per-size pages.
--
-- Uses ON CONFLICT DO NOTHING so it is safe to re-run.

-- ============================================================
-- 1. Category variants (per-size models)
-- ============================================================
INSERT INTO category_variants (id, category_id, name, size, shape, color, weight, capacity, material, price, is_active, display_order) VALUES
  -- Plastic Crates (crates)
  ('e1111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111111', 'VPC-400', '400 × 300 × 130 mm', 'Rectangular', 'Blue, Grey', '~750 g', '15 kg', 'PP / HDPE', NULL, true, 1),
  ('e1111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111111', 'VPC-500', '500 × 350 × 150 mm', 'Rectangular', 'Blue, Grey', '~1050 g', '20 kg', 'PP / HDPE', NULL, true, 2),
  ('e1111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111111', 'VPC-600', '600 × 400 × 200 mm', 'Rectangular', 'Blue, Green', '~1400 g', '25 kg', 'HDPE', NULL, true, 3),
  ('e1111111-1111-1111-1111-111111111104', 'c1111111-1111-1111-1111-111111111111', 'VPC-650', '650 × 450 × 250 mm', 'Rectangular', 'Blue', '~1800 g', '30 kg', 'HDPE', NULL, true, 4),
  ('e1111111-1111-1111-1111-111111111105', 'c1111111-1111-1111-1111-111111111111', 'VPC-700', '700 × 500 × 300 mm', 'Rectangular', 'Blue, Grey', '~2200 g', '35 kg', 'HDPE', NULL, true, 5),

  -- Plastic Pallets
  ('e2222222-2222-2222-2222-222222222201', 'c2222222-2222-2222-2222-222222222222', 'VPP-1200', '1200 × 1000 × 150 mm', 'Single Face', 'Blue', '~18 kg', '1500 kg', 'HDPE', NULL, true, 1),
  ('e2222222-2222-2222-2222-222222222202', 'c2222222-2222-2222-2222-222222222222', 'VPP-1100', '1100 × 1100 × 150 mm', 'Double Face', 'Grey', '~20 kg', '1800 kg', 'HDPE', NULL, true, 2),
  ('e2222222-2222-2222-2222-222222222203', 'c2222222-2222-2222-2222-222222222222', 'VPP-1208', '1200 × 800 × 150 mm', 'Single Face', 'Blue', '~15 kg', '1200 kg', 'HDPE', NULL, true, 3),
  ('e2222222-2222-2222-2222-222222222204', 'c2222222-2222-2222-2222-222222222222', 'VPP-NEST', '1200 × 1000 × 160 mm', 'Nestable', 'Grey', '~22 kg', '2000 kg', 'HDPE', NULL, true, 4),

  -- Waste Bins
  ('e3333333-3333-3333-3333-333333333301', 'c3333333-3333-3333-3333-333333333333', 'VWB-120', '480 × 550 × 930 mm', 'Wheeled, Lidded', 'Green, Blue', '~8 kg', '120 L', 'HDPE', NULL, true, 1),
  ('e3333333-3333-3333-3333-333333333302', 'c3333333-3333-3333-3333-333333333333', 'VWB-240', '580 × 740 × 1100 mm', 'Wheeled, Lidded', 'Green, Blue', '~14 kg', '240 L', 'HDPE', NULL, true, 2),
  ('e3333333-3333-3333-3333-333333333303', 'c3333333-3333-3333-3333-333333333333', 'VWB-360', '620 × 860 × 1200 mm', 'Wheeled, Lidded', 'Green, Grey', '~18 kg', '360 L', 'HDPE', NULL, true, 3),
  ('e3333333-3333-3333-3333-333333333304', 'c3333333-3333-3333-3333-333333333333', 'VWB-660', '800 × 1200 × 1350 mm', 'Wheeled, Lidded', 'Green, Blue', '~28 kg', '660 L', 'HDPE', NULL, true, 4),

  -- Hand Pallet Trucks
  ('e4444444-4444-4444-4444-444444444401', 'c4444444-4444-4444-4444-444444444444', 'VPT-2500', '1150 × 550 × 1200 mm', 'Nylon Wheels', 'Red', '~68 kg', '2500 kg', 'Steel', NULL, true, 1),
  ('e4444444-4444-4444-4444-444444444402', 'c4444444-4444-4444-4444-444444444444', 'VPT-3000', '1150 × 550 × 1200 mm', 'Nylon Wheels', 'Red', '~75 kg', '3000 kg', 'Steel', NULL, true, 2),
  ('e4444444-4444-4444-4444-444444444403', 'c4444444-4444-4444-4444-444444444444', 'VPT-2500-PU', '1150 × 550 × 1200 mm', 'PU Wheels', 'Red', '~70 kg', '2500 kg', 'Steel + PU', NULL, true, 3),
  ('e4444444-4444-4444-4444-444444444404', 'c4444444-4444-4444-4444-444444444444', 'VPT-3000-PU', '1150 × 550 × 1200 mm', 'PU Wheels', 'Red', '~78 kg', '3000 kg', 'Steel + PU', NULL, true, 4)
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================================
-- 2. Category images (one per size so the Range cards have photos)
-- ============================================================
INSERT INTO category_images (id, category_id, category_variant_id, image_url, alt_text, display_order) VALUES
  -- Plastic Crates
  ('f1111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111101', '/images/products/plastic-crates.webp', 'VPC-400 plastic crate', 0),
  ('f1111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111102', '/images/products/plastic-crates.webp', 'VPC-500 plastic crate', 0),
  ('f1111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111103', '/images/products/plastic-crates.webp', 'VPC-600 plastic crate', 0),
  ('f1111111-1111-1111-1111-111111111104', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111104', '/images/products/plastic-crates.webp', 'VPC-650 plastic crate', 0),
  ('f1111111-1111-1111-1111-111111111105', 'c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111105', '/images/products/plastic-crates.webp', 'VPC-700 plastic crate', 0),

  -- Plastic Pallets
  ('f2222222-2222-2222-2222-222222222201', 'c2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222201', '/images/products/plastic-pallets.webp', 'VPP-1200 plastic pallet', 0),
  ('f2222222-2222-2222-2222-222222222202', 'c2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222202', '/images/products/plastic-pallets.webp', 'VPP-1100 plastic pallet', 0),
  ('f2222222-2222-2222-2222-222222222203', 'c2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222203', '/images/products/plastic-pallets.webp', 'VPP-1208 plastic pallet', 0),
  ('f2222222-2222-2222-2222-222222222204', 'c2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222204', '/images/products/plastic-pallets.webp', 'VPP-NEST plastic pallet', 0),

  -- Waste Bins
  ('f3333333-3333-3333-3333-333333333301', 'c3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333301', '/images/products/waste-bins.webp', 'VWB-120 waste bin', 0),
  ('f3333333-3333-3333-3333-333333333302', 'c3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333302', '/images/products/waste-bins.webp', 'VWB-240 waste bin', 0),
  ('f3333333-3333-3333-3333-333333333303', 'c3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333303', '/images/products/waste-bins.webp', 'VWB-360 waste bin', 0),
  ('f3333333-3333-3333-3333-333333333304', 'c3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333304', '/images/products/waste-bins.webp', 'VWB-660 waste bin', 0),

  -- Hand Pallet Trucks
  ('f4444444-4444-4444-4444-444444444401', 'c4444444-4444-4444-4444-444444444444', 'e4444444-4444-4444-4444-444444444401', '/images/products/hand-pallet-truck.webp', 'VPT-2500 hand pallet truck', 0),
  ('f4444444-4444-4444-4444-444444444402', 'c4444444-4444-4444-4444-444444444444', 'e4444444-4444-4444-4444-444444444402', '/images/products/hand-pallet-truck.webp', 'VPT-3000 hand pallet truck', 0),
  ('f4444444-4444-4444-4444-444444444403', 'c4444444-4444-4444-4444-444444444444', 'e4444444-4444-4444-4444-444444444403', '/images/products/hand-pallet-truck.webp', 'VPT-2500-PU hand pallet truck', 0),
  ('f4444444-4444-4444-4444-444444444404', 'c4444444-4444-4444-4444-444444444444', 'e4444444-4444-4444-4444-444444444404', '/images/products/hand-pallet-truck.webp', 'VPT-3000-PU hand pallet truck', 0)
ON CONFLICT (id) DO NOTHING;