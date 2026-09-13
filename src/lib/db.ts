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

// Extended types with relations
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
// Product Queries
// ============================================================

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

// ============================================================
// Storage Helpers
// ============================================================

export function getProductImageUrl(path: string): string {
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return data.publicUrl;
}