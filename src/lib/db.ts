import { supabase, hasSupabase } from './supabase';

// ============================================================
// Types
// ============================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  sub_category_id: string;
  name: string;
  slug: string;
  product_code: string | null;
  short_description: string | null;
  description: string | null;
  features: string[] | null;
  applications: { name: string; description: string }[] | null;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

export interface ProductSpecification {
  id: string;
  product_id: string;
  specification_name: string;
  specification_value: string;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  size: string | null;
  shape: string | null;
  color: string | null;
  weight: string | null;
  capacity: string | null;
  material: string | null;
  price: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Industry {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

export interface Enquiry {
  id: string;
  product_id: string | null;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  quantity: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

// Extended types with relations
export interface ProductWithImages extends Product {
  product_images: ProductImage[];
}

export interface ProductWithDetails extends Product {
  product_images: ProductImage[];
  product_specifications: ProductSpecification[];
  product_variants: ProductVariant[];
  sub_category: SubCategory & {
    category: Category;
  };
}

export interface CategoryWithSubCategories extends Category {
  sub_categories: SubCategory[];
}

// ============================================================
// Category Queries
// ============================================================

export async function getCategories(): Promise<Category[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching category:', error);
    return null;
  }

  return data;
}

export async function getCategoriesWithSubCategories(): Promise<CategoryWithSubCategories[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      sub_categories (
        *
      )
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories with sub-categories:', error);
    return [];
  }

  return (data || []).map(cat => ({
    ...cat,
    sub_categories: (cat.sub_categories || [])
      .filter((sub: SubCategory) => sub.is_active)
      .sort((a: SubCategory, b: SubCategory) => a.display_order - b.display_order)
  }));
}

// ============================================================
// Sub-Category Queries
// ============================================================

export async function getSubCategories(): Promise<SubCategory[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('sub_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching sub-categories:', error);
    return [];
  }

  return data || [];
}

export async function getSubCategoryBySlug(slug: string): Promise<SubCategory | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from('sub_categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching sub-category:', error);
    return null;
  }

  return data;
}

// ============================================================
// Product Queries
// ============================================================

export async function getProducts(): Promise<Product[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (data || []) as unknown as Product[];
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      sub_category:sub_categories!inner (
        *,
        category:categories!inner (
          slug
        )
      )
    `)
    .eq('sub_category.category.slug', categorySlug)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }

  return (data || []) as unknown as Product[];
}

export async function getProductBySlug(slug: string): Promise<ProductWithDetails | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (
        *
      ),
      product_specifications (
        *
      ),
      sub_category:sub_categories (
        *,
        category:categories (
          *
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }

  // Variants live in their own table; fetch separately so a product page still
  // renders even if the product_variants migration has not been applied yet.
  const variants = await getProductVariants(data.id);

  return { ...data, product_variants: variants } as unknown as ProductWithDetails;
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching product variants:', error);
    return [];
  }

  return (data || []) as unknown as ProductVariant[];
}

export async function getFeaturedProducts(): Promise<ProductWithImages[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (
        *
      )
    `)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }

  return (data || []) as unknown as ProductWithImages[];
}

export async function getAllProductSlugs(): Promise<string[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('products')
    .select('slug')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching product slugs:', error);
    return [];
  }

  return (data || []).map(p => p.slug);
}

// ============================================================
// Product Image Queries
// ============================================================

export async function getProductImages(productId: string): Promise<ProductImage[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching product images:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// Product Specification Queries
// ============================================================

export async function getProductSpecifications(productId: string): Promise<ProductSpecification[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('product_specifications')
    .select('*')
    .eq('product_id', productId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching product specifications:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// Industry Queries
// ============================================================

export async function getIndustries(): Promise<Industry[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('industries')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching industries:', error);
    return [];
  }

  return data || [];
}

export async function getProductsByIndustry(industrySlug: string): Promise<Product[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_industries!inner (
        industry:industries!inner (
          slug
        )
      )
    `)
    .eq('product_industries.industry.slug', industrySlug)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching products by industry:', error);
    return [];
  }

  return (data || []) as unknown as Product[];
}

// ============================================================
// Enquiry Queries
// ============================================================

export async function createEnquiry(enquiry: Omit<Enquiry, 'id' | 'status' | 'created_at'>): Promise<Enquiry | null> {
  if (!hasSupabase()) return null;
  // Note: no .select() here - returning requires read access (admin only).
  // Public users can insert but cannot read back their own row.
  const { error } = await supabase
    .from('enquiries')
    .insert({
      ...enquiry,
      status: 'new'
    });

  if (error) {
    console.error('Error creating enquiry:', error);
    return null;
  }

  return enquiry as Enquiry;
}

// ============================================================
// Site Settings Queries
// ============================================================

export async function getSiteSetting(key: string): Promise<unknown> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('Error fetching site setting:', error);
    return null;
  }

  return data?.value ?? null;
}

export async function getSiteSettings(): Promise<Record<string, unknown>> {
  if (!hasSupabase()) return {};
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('Error fetching site settings:', error);
    return {};
  }

  return (data || []).reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, unknown>);
}

// ============================================================
// Storage Helpers
// ============================================================

export function getProductImageUrl(path: string): string {
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadProductImage(file: File, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  return data.path;
}
