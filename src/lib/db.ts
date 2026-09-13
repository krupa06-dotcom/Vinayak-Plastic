import { supabase, hasSupabase } from './supabase';
import { path } from './site';

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

  // Ensure the gallery is in display_order so [0] is reliably the main image.
  if (Array.isArray((data as { product_images?: unknown }).product_images)) {
    (data as { product_images: ProductImage[] }).product_images.sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );
  }

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
// Catalogue Queries (Products page)
// ============================================================

export interface CatalogueSubCategory extends SubCategory {
  product_count: number;
  category_name: string;
  category_slug: string;
}

export interface CatalogueCategory extends Category {
  product_count: number;
  sub_categories: CatalogueSubCategory[];
}

export interface CatalogueProduct {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  image_url: string | null;
}

export interface CatalogueData {
  categories: CatalogueCategory[];
  subCategories: CatalogueSubCategory[];
  /** Products grouped by category slug (for /products?category=<slug>). */
  productsByCategorySlug: Record<string, CatalogueProduct[]>;
  /** Products grouped by sub-category slug (for /products?subcategory=<slug>). */
  productsBySubCategorySlug: Record<string, CatalogueProduct[]>;
}

const EMPTY_CATALOGUE: CatalogueData = {
  categories: [],
  subCategories: [],
  productsByCategorySlug: {},
  productsBySubCategorySlug: {}
};

export function getCatalogueData(): Promise<CatalogueData> {
  if (!hasSupabase()) return Promise.resolve(EMPTY_CATALOGUE);

  const [categoriesQuery, subCategoriesQuery, productsQuery] = [
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('sub_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, slug, short_description, sub_category_id, product_images ( image_url )')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
  ];

  return Promise.all([categoriesQuery, subCategoriesQuery, productsQuery]).then(
    ([categoriesRes, subCategoriesRes, productsRes]) => {
      const firstError =
        categoriesRes.error || subCategoriesRes.error || productsRes.error;
      if (firstError) {
        console.error('Error fetching catalogue data:', firstError);
        return EMPTY_CATALOGUE;
      }

      const categories = (categoriesRes.data || []) as Category[];
      const subCategories = (subCategoriesRes.data || []) as SubCategory[];
      const products = productsRes.data || [];

      const categoryById = new Map(categories.map(c => [c.id, c]));
      const subById = new Map(subCategories.map(s => [s.id, s]));

      const subCounts = new Map<string, number>();
      const catCounts = new Map<string, number>();
      const bySubSlug: Record<string, CatalogueProduct[]> = {};
      const byCatSlug: Record<string, CatalogueProduct[]> = {};

      for (const p of products) {
        const sub = subById.get(p.sub_category_id);
        // images must be in display_order so [0] is the main image
        const images = (p.product_images as ProductImage[] | undefined) ?? [];
        const image = images
          .slice()
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]?.image_url ?? null;
        const catalogueProduct: CatalogueProduct = {
          id: p.id,
          name: p.name,
          slug: p.slug,
          short_description: p.short_description,
          image_url: image
        };

        subCounts.set(p.sub_category_id, (subCounts.get(p.sub_category_id) || 0) + 1);
        if (sub) {
          (bySubSlug[sub.slug] ||= []).push(catalogueProduct);
          const cat = categoryById.get(sub.category_id);
          catCounts.set(sub.category_id, (catCounts.get(sub.category_id) || 0) + 1);
          if (cat) (byCatSlug[cat.slug] ||= []).push(catalogueProduct);
        }
      }

      const catalogueCategories: CatalogueCategory[] = categories.map(cat => ({
        ...cat,
        product_count: catCounts.get(cat.id) || 0,
        sub_categories: subCategories
          .filter(s => s.category_id === cat.id)
          .map(s => ({
            ...s,
            product_count: subCounts.get(s.id) || 0,
            category_name: cat.name,
            category_slug: cat.slug
          }))
      }));

      const allSubCategories: CatalogueSubCategory[] = subCategories.map(s => {
        const cat = categoryById.get(s.category_id);
        return {
          ...s,
          product_count: subCounts.get(s.id) || 0,
          category_name: cat?.name ?? '',
          category_slug: cat?.slug ?? ''
        };
      });

      return {
        categories: catalogueCategories,
        subCategories: allSubCategories,
        productsByCategorySlug: byCatSlug,
        productsBySubCategorySlug: bySubSlug
      };
    },
    (error) => {
      console.error('Error building catalogue data:', error);
      return EMPTY_CATALOGUE;
    }
  );
}

/**
 * Resolve an image reference stored in the database into a usable URL.
 * Absolute URLs pass through; root-relative paths get the base prefix;
 * anything else is treated as a Supabase Storage object path.
 */
export function resolveImageUrl(image: string | null): string | null {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/')) return path(image);
  return getProductImageUrl(image);
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