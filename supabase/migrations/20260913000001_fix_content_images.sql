-- ============================================================
-- Fix broken content image paths and backfill product_images
-- ============================================================
-- The sample data pointed at /images/products/*.webp files that do not
-- exist (404), and the product_images table was empty, so product pages
-- fell back to bundled demo art. This migration:
--   1. Points category / sub-category images at assets that are shipped
--      in the repo under public/images/products/ (served at
--      /images/products/...).
--   2. Seeds product_images with the same working assets so DB-driven
--      imagery renders on the public product pages.
--
-- The bundled copies live in public/images/products/ (see the repo).
-- Safe to re-run: updates are idempotent and inserts use ON CONFLICT.
-- ============================================================

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------
update categories set image_url = '/images/products/plastic-crates.webp'    where slug = 'plastic-crates';
update categories set image_url = '/images/products/plastic-pallets.webp'   where slug = 'plastic-pallets';
update categories set image_url = '/images/products/waste-bins.webp'        where slug = 'waste-bins';
update categories set image_url = '/images/products/hand-pallet-truck.webp' where slug = 'hand-pallet-trucks';

-- ------------------------------------------------------------
-- Sub-categories
-- ------------------------------------------------------------
update sub_categories set image_url = '/images/products/plastic-crates.webp'    where slug = 'standard-crates';
update sub_categories set image_url = '/images/products/lid-crates.jpeg'        where slug = 'lid-crates';
update sub_categories set image_url = '/images/products/plastic-pallets.webp'   where slug = 'standard-pallets';
update sub_categories set image_url = '/images/products/waste-bins.webp'        where slug = 'standard-bins';
update sub_categories set image_url = '/images/products/hand-pallet-truck.webp' where slug = 'standard-trucks';

-- ------------------------------------------------------------
-- Products (gallery images). Explicit stable IDs keep this idempotent.
-- ------------------------------------------------------------
insert into product_images (id, product_id, image_url, alt_text, display_order) values
  -- Plastic Crates
  ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111',
   '/images/products/plastic-crates.webp', 'Stackable plastic crates for dairy and warehouse use', 1),
  ('e1111111-1111-1111-1111-111111111112', 'd1111111-1111-1111-1111-111111111111',
   '/images/products/stack-crates.jpeg', 'Plastic crates stacked in a warehouse', 2),

  -- Plastic Pallets
  ('e2222222-2222-2222-2222-222222222221', 'd2222222-2222-2222-2222-222222222222',
   '/images/products/plastic-pallets.webp', 'Heavy-duty plastic pallets', 1),
  ('e2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222',
   '/images/products/plastic-pallets.jpeg', 'Plastic pallets stacked for dispatch', 2),

  -- Waste Bins
  ('e3333333-3333-3333-3333-333333333331', 'd3333333-3333-3333-3333-333333333333',
   '/images/products/waste-bins.webp', 'Industrial waste bins and dustbins', 1),
  ('e3333333-3333-3333-3333-333333333332', 'd3333333-3333-3333-3333-333333333333',
   '/images/products/dustbins.jpeg', 'Wheeled waste bins for municipal use', 2),

  -- Hand Pallet Trucks
  ('e4444444-4444-4444-4444-444444444441', 'd4444444-4444-4444-4444-444444444444',
   '/images/products/hand-pallet-truck.webp', 'Hand pallet truck for warehouse loading', 1),
  ('e4444444-4444-4444-4444-444444444442', 'd4444444-4444-4444-4444-444444444444',
   '/images/products/truck-pallets.jpeg', 'Hand pallet truck moving a loaded pallet', 2)
on conflict (id) do nothing;
