-- Vinayak Plastics Sample Data
-- Phase 3: Test data for development and testing
-- 
-- Run this migration after the initial schema migration
-- Uses ON CONFLICT DO NOTHING so it is safe to re-run.

-- ============================================================
-- Categories
-- ============================================================
INSERT INTO categories (id, name, slug, description, image_url, display_order, is_active) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Plastic Crates', 'plastic-crates', 'Durable, lightweight and stackable crates for dairy, bakery, warehouse and material handling.', '/images/products/plastic-crates.webp', 1, true),
  ('c2222222-2222-2222-2222-222222222222', 'Plastic Pallets', 'plastic-pallets', 'Heavy-duty industrial pallets for warehouse racking, logistics and export applications.', '/images/products/plastic-pallets.webp', 2, true),
  ('c3333333-3333-3333-3333-333333333333', 'Waste Bins', 'waste-bins', 'Industrial waste bins and dustbins for municipal, commercial and factory use.', '/images/products/waste-bins.webp', 3, true),
  ('c4444444-4444-4444-4444-444444444444', 'Hand Pallet Trucks', 'hand-pallet-trucks', 'Manual material handling equipment for warehouse loading and unloading.', '/images/products/hand-pallet-trucks.webp', 4, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Sub-categories
-- ============================================================
INSERT INTO sub_categories (id, category_id, name, slug, description, image_url, display_order, is_active) VALUES
  -- Plastic Crates sub-categories
  ('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Standard Crates', 'standard-crates', 'Standard stackable and nestable crates for general material handling.', '/images/products/plastic-crates.webp', 1, true),
  ('a1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'Lid Crates', 'lid-crates', 'Lidded crates for secure, dust-free transport and storage.', '/images/products/lid-crates.webp', 2, true),
  
  -- Plastic Pallets sub-categories
  ('a2222222-2222-2222-2222-222222222221', 'c2222222-2222-2222-2222-222222222222', 'Standard Pallets', 'standard-pallets', 'Single-face and double-face pallets for warehouse and logistics.', '/images/products/plastic-pallets.webp', 1, true),
  
  -- Waste Bins sub-categories
  ('a3333333-3333-3333-3333-333333333331', 'c3333333-3333-3333-3333-333333333333', 'Standard Bins', 'standard-bins', 'Standard wheeled and lidded waste bins for commercial use.', '/images/products/waste-bins.webp', 1, true),
  
  -- Hand Pallet Trucks sub-categories
  ('a4444444-4444-4444-4444-444444444441', 'c4444444-4444-4444-4444-444444444444', 'Standard Trucks', 'standard-trucks', 'Manual pallet jacks with nylon or polyurethane wheels.', '/images/products/hand-pallet-truck.webp', 1, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Industries
-- ============================================================
INSERT INTO industries (id, name, slug, description, is_active) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Warehouse & Logistics', 'warehouse-logistics', 'Storage, racking and internal material movement.', true),
  ('b2222222-2222-2222-2222-222222222222', 'Dairy', 'dairy', 'Milk pouch crates, curd and paneer transport.', true),
  ('b3333333-3333-3333-3333-333333333333', 'Agriculture', 'agriculture', 'Farm produce storage and transport.', true),
  ('b4444444-4444-4444-4444-444444444444', 'FMCG', 'fmcg', 'Fast-moving consumer goods distribution.', true),
  ('b5555555-5555-5555-5555-555555555555', 'Municipal', 'municipal', 'Municipal corporations and public waste management.', true),
  ('b6666666-6666-6666-6666-666666666666', 'Commercial', 'commercial', 'Office complexes, shopping centers and institutions.', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Products
-- ============================================================
INSERT INTO products (id, sub_category_id, name, slug, product_code, short_description, description, features, applications, is_featured, is_active, display_order) VALUES
  -- Plastic Crates
  ('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Plastic Crates', 'plastic-crates', 'VPC-SERIES', 'Durable, lightweight & stackable crates for dairy, bakery, warehouse and material handling.', 'Our plastic crates are manufactured using high-grade HDPE and PP materials, designed for heavy-duty material handling in dairy, bakery, cold storage, and warehouse environments. Available in multiple sizes and colors.', 
    ARRAY['HDPE / PP grade — impact & UV resistant', 'Stackable with locking rims for safe transport', 'Nestable designs for space-saving return logistics', 'Ventilated and solid base options available', 'Custom colors and logo hot-stamping on request'],
    '[{"name": "Dairy", "description": "Milk pouch crates, curd and paneer transport crates with ventilation for moisture management."}, {"name": "Bakery", "description": "Bread and confectionery crates designed for stacking in delivery vehicles and storage racks."}, {"name": "Cold Storage", "description": "Frozen food and ice cream crates that withstand sub-zero temperatures without brittleness."}, {"name": "Warehouse", "description": "General material handling crates for inventory storage, order picking, and internal logistics."}]',
    true, true, 1),

  -- Plastic Pallets
  ('d2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222221', 'Plastic Pallets', 'plastic-pallets', 'VPP-SERIES', 'Heavy-duty industrial pallets for warehouse racking, logistics, and export applications.', 'Industrial-grade plastic pallets manufactured from high-strength HDPE for warehouse racking, logistics, and export applications. Available in single-face, double-face, and nestable configurations.',
    ARRAY['HDPE construction for maximum load capacity', 'Single-face and double-face designs available', 'Nestable options for return logistics efficiency', 'Four-way forklift entry for easy handling', 'Custom dimensions and colors available'],
    '[{"name": "Warehouse Racking", "description": "Heavy-duty storage in selective and drive-in racking systems with consistent dimensions."}, {"name": "Export Shipping", "description": "Lightweight alternative to wooden pallets for international freight with no fumigation required."}, {"name": "Manufacturing", "description": "Work-in-process handling and finished goods staging in production facilities."}, {"name": "Distribution", "description": "Cross-docking and last-mile delivery applications with durability and reusability."}]',
    true, true, 2),

  -- Waste Bins
  ('d3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333331', 'Waste Bins / Dustbins', 'waste-bins', 'VWB-SERIES', 'Municipal & commercial waste solutions for industrial applications.', 'Industrial-grade waste bins and dustbins for municipal, commercial, and factory applications. Available in multiple capacities with wheeled, lidded, and color-coded options for waste segregation.',
    ARRAY['HDPE construction for weather resistance', 'Wheeled options for easy mobility', 'Tight-fitting lids to prevent spillage', 'Color coding for waste segregation', 'UV stabilized for outdoor use'],
    '[{"name": "Municipal Collection", "description": "Street-side waste collection bins for residential and commercial areas with wheeled mobility."}, {"name": "Factory & Industrial", "description": "Heavy-duty waste containers for manufacturing facilities and industrial complexes."}, {"name": "Commercial Buildings", "description": "Office complexes, shopping centers, and institutional waste management systems."}, {"name": "Segregation Systems", "description": "Color-coded bins for recyclable, organic, and general waste separation programs."}]',
    true, true, 3),

  -- Hand Pallet Trucks
  ('d4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444441', 'Hand Pallet Trucks', 'hand-pallet-trucks', 'VPT-SERIES', 'Manual material handling equipment for warehouse loading and unloading.', 'Heavy-duty hand pallet trucks (pallet jacks) for warehouse loading, unloading, and material transport. Available in 2.5T and 3T capacities with nylon or polyurethane wheel options.',
    ARRAY['2.5T and 3T load capacity options', 'Nylon or polyurethane wheel configurations', 'Ergonomic handle design for operator comfort', 'Precision hydraulic lifting mechanism', 'Heavy-duty steel construction'],
    '[{"name": "Warehouse Loading", "description": "Loading and unloading trucks, containers, and warehouse racking systems efficiently."}, {"name": "Manufacturing", "description": "Moving raw materials, work-in-process, and finished goods within production facilities."}, {"name": "Retail & Distribution", "description": "Back-of-house operations in retail stores and distribution centers for inventory handling."}, {"name": "Cross-Docking", "description": "Fast-paced material transfer in logistics hubs and transportation terminals."}]',
    true, true, 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Product Specifications
-- ============================================================
INSERT INTO product_specifications (product_id, specification_name, specification_value, display_order) VALUES
  -- Plastic Crates specifications
  ('d1111111-1111-1111-1111-111111111111', 'Model', 'VPC-400', 1),
  ('d1111111-1111-1111-1111-111111111111', 'Size (mm)', '400 × 300 × 130', 2),
  ('d1111111-1111-1111-1111-111111111111', 'Weight', '~750g', 3),
  ('d1111111-1111-1111-1111-111111111111', 'Capacity', '15kg', 4),
  ('d1111111-1111-1111-1111-111111111111', 'Material', 'PP / HDPE', 5),

  ('d1111111-1111-1111-1111-111111111111', 'Model', 'VPC-500', 6),
  ('d1111111-1111-1111-1111-111111111111', 'Size (mm)', '500 × 350 × 150', 7),
  ('d1111111-1111-1111-1111-111111111111', 'Weight', '~1050g', 8),
  ('d1111111-1111-1111-1111-111111111111', 'Capacity', '20kg', 9),
  ('d1111111-1111-1111-1111-111111111111', 'Material', 'PP / HDPE', 10),

  ('d1111111-1111-1111-1111-111111111111', 'Model', 'VPC-600', 11),
  ('d1111111-1111-1111-1111-111111111111', 'Size (mm)', '600 × 400 × 200', 12),
  ('d1111111-1111-1111-1111-111111111111', 'Weight', '~1400g', 13),
  ('d1111111-1111-1111-1111-111111111111', 'Capacity', '25kg', 14),
  ('d1111111-1111-1111-1111-111111111111', 'Material', 'HDPE', 15),

  ('d1111111-1111-1111-1111-111111111111', 'Model', 'VPC-650', 16),
  ('d1111111-1111-1111-1111-111111111111', 'Size (mm)', '650 × 450 × 250', 17),
  ('d1111111-1111-1111-1111-111111111111', 'Weight', '~1800g', 18),
  ('d1111111-1111-1111-1111-111111111111', 'Capacity', '30kg', 19),
  ('d1111111-1111-1111-1111-111111111111', 'Material', 'HDPE', 20),

  ('d1111111-1111-1111-1111-111111111111', 'Model', 'VPC-700', 21),
  ('d1111111-1111-1111-1111-111111111111', 'Size (mm)', '700 × 500 × 300', 22),
  ('d1111111-1111-1111-1111-111111111111', 'Weight', '~2200g', 23),
  ('d1111111-1111-1111-1111-111111111111', 'Capacity', '35kg', 24),
  ('d1111111-1111-1111-1111-111111111111', 'Material', 'HDPE', 25),

  -- Plastic Pallets specifications
  ('d2222222-2222-2222-2222-222222222222', 'Model', 'VPP-1200', 1),
  ('d2222222-2222-2222-2222-222222222222', 'Size (mm)', '1200 × 1000 × 150', 2),
  ('d2222222-2222-2222-2222-222222222222', 'Weight', '~18kg', 3),
  ('d2222222-2222-2222-2222-222222222222', 'Load Capacity', '1500kg', 4),
  ('d2222222-2222-2222-2222-222222222222', 'Material', 'HDPE', 5),

  ('d2222222-2222-2222-2222-222222222222', 'Model', 'VPP-1100', 6),
  ('d2222222-2222-2222-2222-222222222222', 'Size (mm)', '1100 × 1100 × 150', 7),
  ('d2222222-2222-2222-2222-222222222222', 'Weight', '~20kg', 8),
  ('d2222222-2222-2222-2222-222222222222', 'Load Capacity', '1800kg', 9),
  ('d2222222-2222-2222-2222-222222222222', 'Material', 'HDPE', 10),

  ('d2222222-2222-2222-2222-222222222222', 'Model', 'VPP-1208', 11),
  ('d2222222-2222-2222-2222-222222222222', 'Size (mm)', '1200 × 800 × 150', 12),
  ('d2222222-2222-2222-2222-222222222222', 'Weight', '~15kg', 13),
  ('d2222222-2222-2222-2222-222222222222', 'Load Capacity', '1200kg', 14),
  ('d2222222-2222-2222-2222-222222222222', 'Material', 'HDPE', 15),

  ('d2222222-2222-2222-2222-222222222222', 'Model', 'VPP-NEST', 16),
  ('d2222222-2222-2222-2222-222222222222', 'Size (mm)', '1200 × 1000 × 160', 17),
  ('d2222222-2222-2222-2222-222222222222', 'Weight', '~22kg', 18),
  ('d2222222-2222-2222-2222-222222222222', 'Load Capacity', '2000kg', 19),
  ('d2222222-2222-2222-2222-222222222222', 'Material', 'HDPE', 20),

  -- Waste Bins specifications
  ('d3333333-3333-3333-3333-333333333333', 'Model', 'VWB-120', 1),
  ('d3333333-3333-3333-3333-333333333333', 'Size (mm)', '480 × 550 × 930', 2),
  ('d3333333-3333-3333-3333-333333333333', 'Weight', '~8kg', 3),
  ('d3333333-3333-3333-3333-333333333333', 'Capacity', '120L', 4),
  ('d3333333-3333-3333-3333-333333333333', 'Material', 'HDPE', 5),

  ('d3333333-3333-3333-3333-333333333333', 'Model', 'VWB-240', 6),
  ('d3333333-3333-3333-3333-333333333333', 'Size (mm)', '580 × 740 × 1100', 7),
  ('d3333333-3333-3333-3333-333333333333', 'Weight', '~14kg', 8),
  ('d3333333-3333-3333-3333-333333333333', 'Capacity', '240L', 9),
  ('d3333333-3333-3333-3333-333333333333', 'Material', 'HDPE', 10),

  ('d3333333-3333-3333-3333-333333333333', 'Model', 'VWB-360', 11),
  ('d3333333-3333-3333-3333-333333333333', 'Size (mm)', '620 × 860 × 1200', 12),
  ('d3333333-3333-3333-3333-333333333333', 'Weight', '~18kg', 13),
  ('d3333333-3333-3333-3333-333333333333', 'Capacity', '360L', 14),
  ('d3333333-3333-3333-3333-333333333333', 'Material', 'HDPE', 15),

  ('d3333333-3333-3333-3333-333333333333', 'Model', 'VWB-660', 16),
  ('d3333333-3333-3333-3333-333333333333', 'Size (mm)', '800 × 1200 × 1350', 17),
  ('d3333333-3333-3333-3333-333333333333', 'Weight', '~28kg', 18),
  ('d3333333-3333-3333-3333-333333333333', 'Capacity', '660L', 19),
  ('d3333333-3333-3333-3333-333333333333', 'Material', 'HDPE', 20),

  -- Hand Pallet Trucks specifications
  ('d4444444-4444-4444-4444-444444444444', 'Model', 'VPT-2500', 1),
  ('d4444444-4444-4444-4444-444444444444', 'Size (mm)', '1150 × 550 × 1200', 2),
  ('d4444444-4444-4444-4444-444444444444', 'Weight', '~68kg', 3),
  ('d4444444-4444-4444-4444-444444444444', 'Load Capacity', '2500kg', 4),
  ('d4444444-4444-4444-4444-444444444444', 'Material', 'Steel', 5),

  ('d4444444-4444-4444-4444-444444444444', 'Model', 'VPT-3000', 6),
  ('d4444444-4444-4444-4444-444444444444', 'Size (mm)', '1150 × 550 × 1200', 7),
  ('d4444444-4444-4444-4444-444444444444', 'Weight', '~75kg', 8),
  ('d4444444-4444-4444-4444-444444444444', 'Load Capacity', '3000kg', 9),
  ('d4444444-4444-4444-4444-444444444444', 'Material', 'Steel', 10),

  ('d4444444-4444-4444-4444-444444444444', 'Model', 'VPT-2500-PU', 11),
  ('d4444444-4444-4444-4444-444444444444', 'Size (mm)', '1150 × 550 × 1200', 12),
  ('d4444444-4444-4444-4444-444444444444', 'Weight', '~70kg', 13),
  ('d4444444-4444-4444-4444-444444444444', 'Load Capacity', '2500kg', 14),
  ('d4444444-4444-4444-4444-444444444444', 'Material', 'Steel + PU', 15),

  ('d4444444-4444-4444-4444-444444444444', 'Model', 'VPT-3000-PU', 16),
  ('d4444444-4444-4444-4444-444444444444', 'Size (mm)', '1150 × 550 × 1200', 17),
  ('d4444444-4444-4444-4444-444444444444', 'Weight', '~78kg', 18),
  ('d4444444-4444-4444-4444-444444444444', 'Load Capacity', '3000kg', 19),
  ('d4444444-4444-4444-4444-444444444444', 'Material', 'Steel + PU', 20);

-- ============================================================
-- Product Industries (junction table)
-- ============================================================
INSERT INTO product_industries (product_id, industry_id) VALUES
  -- Plastic Crates
  ('d1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111'), -- Warehouse & Logistics
  ('d1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'), -- Dairy
  ('d1111111-1111-1111-1111-111111111111', 'b3333333-3333-3333-3333-333333333333'), -- Agriculture
  ('d1111111-1111-1111-1111-111111111111', 'b4444444-4444-4444-4444-444444444444'), -- FMCG

  -- Plastic Pallets
  ('d2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111'), -- Warehouse & Logistics
  ('d2222222-2222-2222-2222-222222222222', 'b4444444-4444-4444-4444-444444444444'), -- FMCG

  -- Waste Bins
  ('d3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555'), -- Municipal
  ('d3333333-3333-3333-3333-333333333333', 'b6666666-6666-6666-6666-666666666666'), -- Commercial

  -- Hand Pallet Trucks
  ('d4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111'), -- Warehouse & Logistics
  ('d4444444-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444') -- FMCG
ON CONFLICT DO NOTHING;

-- ============================================================
-- Site Settings
-- ============================================================
INSERT INTO site_settings (key, value, updated_at) VALUES
  ('company', '{"name": "Vinayak Plastics", "tagline": "Material Handling & Packaging Products"}', NOW()),
  ('contact', '{"phone": "9558747862", "phone_display": "+91 95587 47862", "email": "Vinayakplast2020@gmail.com", "whatsapp": "919558747862", "address": "Vinayak Plastics, BS Kapoor Roadlines, Near Darjipura, Golden Chokdi, Vadodara 390019"}', NOW()),
  ('social', '{"facebook": "", "instagram": "", "linkedin": "", "youtube": ""}', NOW()),
  ('seo', '{"title": "Vinayak Plastics — Material Handling & Packaging Products", "description": "Manufacturer and supplier of plastic crates, pallets, waste bins, hand pallet trucks and material handling equipment for warehouses, dairy, municipal and commercial buyers across India."}', NOW())
ON CONFLICT (key) DO NOTHING;