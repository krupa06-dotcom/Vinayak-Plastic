-- Vinayak Plastics Database Schema
-- Phase 3: Supabase Backend Foundation
-- 
-- Run this migration in your Supabase SQL Editor or via supabase db push

-- ============================================================
-- Enable UUID extension (if not already enabled)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Helper function: auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Table: categories
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_display_order ON categories(display_order);

-- Trigger for categories updated_at
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: sub_categories
-- ============================================================
CREATE TABLE sub_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sub_categories
CREATE INDEX idx_sub_categories_category_id ON sub_categories(category_id);
CREATE INDEX idx_sub_categories_slug ON sub_categories(slug);
CREATE INDEX idx_sub_categories_is_active ON sub_categories(is_active);
CREATE INDEX idx_sub_categories_display_order ON sub_categories(display_order);

-- Trigger for sub_categories updated_at
CREATE TRIGGER set_sub_categories_updated_at
  BEFORE UPDATE ON sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: products
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_category_id UUID NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  product_code VARCHAR(100),
  short_description VARCHAR(500),
  description TEXT,
  features TEXT[],
  applications JSONB,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX idx_products_sub_category_id ON products(sub_category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_display_order ON products(display_order);
CREATE INDEX idx_products_product_code ON products(product_code);

-- Trigger for products updated_at
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: product_images
-- ============================================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(500),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for product_images
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_display_order ON product_images(display_order);

-- ============================================================
-- Table: product_specifications
-- ============================================================
CREATE TABLE product_specifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  specification_name VARCHAR(255) NOT NULL,
  specification_value VARCHAR(500) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Indexes for product_specifications
CREATE INDEX idx_product_specifications_product_id ON product_specifications(product_id);
CREATE INDEX idx_product_specifications_display_order ON product_specifications(display_order);

-- ============================================================
-- Table: industries
-- ============================================================
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for industries
CREATE INDEX idx_industries_slug ON industries(slug);
CREATE INDEX idx_industries_is_active ON industries(is_active);

-- ============================================================
-- Table: product_industries (junction table)
-- ============================================================
CREATE TABLE product_industries (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, industry_id)
);

-- Indexes for product_industries
CREATE INDEX idx_product_industries_product_id ON product_industries(product_id);
CREATE INDEX idx_product_industries_industry_id ON product_industries(industry_id);

-- ============================================================
-- Table: enquiries
-- ============================================================
CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  quantity VARCHAR(100),
  message TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for enquiries
CREATE INDEX idx_enquiries_product_id ON enquiries(product_id);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_enquiries_created_at ON enquiries(created_at);

-- ============================================================
-- Table: site_settings
-- ============================================================
CREATE TABLE site_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for site_settings updated_at
CREATE TRIGGER set_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: Public read access for active catalogue data
-- ============================================================

-- Categories: Public can read active categories
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Sub-categories: Public can read active sub-categories
CREATE POLICY "Public can view active sub-categories"
  ON sub_categories FOR SELECT
  USING (is_active = true);

-- Products: Public can read active products
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (is_active = true);

-- Product Images: Public can read all product images
CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT
  USING (true);

-- Product Specifications: Public can read all product specifications
CREATE POLICY "Public can view product specifications"
  ON product_specifications FOR SELECT
  USING (true);

-- Industries: Public can read active industries
CREATE POLICY "Public can view active industries"
  ON industries FOR SELECT
  USING (is_active = true);

-- Product Industries: Public can read all product-industry relationships
CREATE POLICY "Public can view product industries"
  ON product_industries FOR SELECT
  USING (true);

-- Site Settings: Public can read all settings
CREATE POLICY "Public can view site settings"
  ON site_settings FOR SELECT
  USING (true);

-- ============================================================
-- RLS Policies: Public can submit enquiries
-- ============================================================

-- Enquiries: Public can insert new enquiries
CREATE POLICY "Public can submit enquiries"
  ON enquiries FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- RLS Policies: Admin-only operations
-- (Requires authenticated user with admin role)
-- ============================================================

-- For now, we'll create a simple admin check function
-- This can be enhanced later with proper role-based access

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the user is authenticated and has admin role
  -- For now, we'll use a simple check based on email domain
  -- You can enhance this with a proper roles table later
  RETURN (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@vinayakplastics.com'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for categories
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (is_admin());

-- Admin policies for sub_categories
CREATE POLICY "Admins can insert sub-categories"
  ON sub_categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sub-categories"
  ON sub_categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete sub-categories"
  ON sub_categories FOR DELETE
  USING (is_admin());

-- Admin policies for products
CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- Admin policies for product_images
CREATE POLICY "Admins can insert product images"
  ON product_images FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update product images"
  ON product_images FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete product images"
  ON product_images FOR DELETE
  USING (is_admin());

-- Admin policies for product_specifications
CREATE POLICY "Admins can insert product specifications"
  ON product_specifications FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update product specifications"
  ON product_specifications FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete product specifications"
  ON product_specifications FOR DELETE
  USING (is_admin());

-- Admin policies for industries
CREATE POLICY "Admins can insert industries"
  ON industries FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update industries"
  ON industries FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete industries"
  ON industries FOR DELETE
  USING (is_admin());

-- Admin policies for product_industries
CREATE POLICY "Admins can insert product industries"
  ON product_industries FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete product industries"
  ON product_industries FOR DELETE
  USING (is_admin());

-- Admin policies for enquiries (read and update)
CREATE POLICY "Admins can view all enquiries"
  ON enquiries FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update enquiries"
  ON enquiries FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete enquiries"
  ON enquiries FOR DELETE
  USING (is_admin());

-- Admin policies for site_settings
CREATE POLICY "Admins can insert site settings"
  ON site_settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update site settings"
  ON site_settings FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete site settings"
  ON site_settings FOR DELETE
  USING (is_admin());

-- ============================================================
-- Storage Bucket: product-images
-- ============================================================
-- Note: Storage buckets must be created via the Supabase Dashboard
-- or using the Supabase CLI. The following is for reference:
--
-- Bucket name: product-images
-- Public: true (for public read access)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--
-- You can create this bucket manually in your Supabase Dashboard:
-- 1. Go to Storage
-- 2. Click "New bucket"
-- 3. Name: "product-images"
-- 4. Check "Public bucket"
-- 5. Set file size limit to 5MB
-- 6. Add allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- ============================================================
-- Comments for documentation
-- ============================================================
COMMENT ON TABLE categories IS 'Product categories (e.g., Plastic Crates, Plastic Pallets)';
COMMENT ON TABLE sub_categories IS 'Sub-categories within each category';
COMMENT ON TABLE products IS 'Individual products with details and specifications';
COMMENT ON TABLE product_images IS 'Multiple images per product';
COMMENT ON TABLE product_specifications IS 'Flexible key-value specifications per product';
COMMENT ON TABLE industries IS 'Target industries for products';
COMMENT ON TABLE product_industries IS 'Many-to-many relationship between products and industries';
COMMENT ON TABLE enquiries IS 'Customer enquiries and quote requests';
COMMENT ON TABLE site_settings IS 'Key-value store for site configuration';
