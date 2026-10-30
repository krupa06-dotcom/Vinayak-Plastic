-- ============================================================
-- Add dummy product images for variants missing gallery photos
-- ============================================================
-- Some product variants have no product_images rows, so their
-- gallery falls back to the series image. This migration adds
-- a proper product_images row (using the series image as the
-- placeholder) so every variant has at least one gallery image.
-- ============================================================

INSERT INTO product_images (product_variant_id, image_url, alt_text, is_main, display_order)
VALUES
  ('11d4afea-4fe2-49b0-8b2d-019a8e44d3a8', 'media/sub-categories/standard-trucks-1789817102736.png', 'VPT-3000 product image', true, 0),
  ('dbd75375-ec6f-42c7-9ab2-bb702a1b09c0', 'media/sub-categories/standard-trucks-1789817102736.png', 'VPT-2500-PU product image', true, 0),
  ('5147540b-87db-451f-8518-3ef7720749fe', 'media/sub-categories/standard-trucks-1789817102736.png', 'VPT-3000-PU product image', true, 0),
  ('37f276c4-0b8b-4239-920f-70db60679864', '/images/products/plastic-crates.webp', '806031 product image', true, 0),
  ('2a4ebcf0-f8fa-4876-83fb-adbc06290fe6', 'media/series/crates-650x450-1792819860301.jpeg', '654526 product image', true, 0),
  ('bfded4d3-09f9-4be8-abea-56f76f24eed8', '/images/products/plastic-crates.webp', '806042 product image', true, 0),
  ('4e8bde7f-1067-450f-9a6a-d3f4b73761ab', 'media/series/pallets-1200x800-1793168125591.jpeg', '120816-3R product image', true, 0),
  ('86948670-3ec9-48ae-9d51-232ee0a18061', 'media/series/pallets-1200x800-1793168125591.jpeg', '120814-9L product image', true, 0),
  ('f78e5959-360d-4f2a-b874-5431428f9c0d', 'media/series/crates-500x325-1790248016333.webp', '533236 product image', true, 0)
ON CONFLICT DO NOTHING;
