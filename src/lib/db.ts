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

export interface SubCategoryImage {
  id: string;
  sub_category_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

export interface SubCategorySpecification {
  id: string;
  sub_category_id: string;
  specification_name: string;
  specification_value: string;
  display_order: number;
}

export interface SubCategoryVariant {
  id: string;
  sub_category_id: string;
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

export interface SubCategoryApplication {
  name: string;
  description: string;
}

/** A sub-category carrying the full product detail (this replaces the old products table). */
export interface SubCategoryDetail extends SubCategory {
  product_code: string | null;
  short_description: string | null;
  features: string[] | null;
  applications: SubCategoryApplication[] | null;
  is_featured: boolean;
  images: SubCategoryImage[];
  specifications: SubCategorySpecification[];
  variants: SubCategoryVariant[];
}

export interface CategoryWithSubCategories extends Category {
  sub_categories: SubCategoryDetail[];
}

// ============================================================
// Catalogue types (public site)
// ============================================================

export interface CatalogueSubCategory extends SubCategoryDetail {
  category_name: string;
  category_slug: string;
  /** Number of active size/models under this sub-category. */
  variants_count: number;
}

export interface CatalogueCategory extends Category {
  /** Total active sizes/models across all sub-categories. */
  variants_count: number;
  sub_categories: CatalogueSubCategory[];
}

export interface CatalogueData {
  categories: CatalogueCategory[];
  subCategories: CatalogueSubCategory[];
}

const EMPTY_CATALOGUE: CatalogueData = { categories: [], subCategories: [] };

// ============================================================
// Category Queries
// ============================================================

export async function getCategoriesWithSubCategories(): Promise<CategoryWithSubCategories[]> {
  const catalogue = await getCatalogueData();
  return catalogue.categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    image_url: cat.image_url,
    display_order: cat.display_order,
    is_active: cat.is_active,
    sub_categories: cat.sub_categories.map(sub => detailFromCatalogue(sub))
  }));
}

export function getSubCategoryPath(sub: CatalogueSubCategory): { params: { category: string; sub: string } } {
  return { params: { category: sub.category_slug, sub: sub.slug } };
}

/** Pairs (category slug, sub slug) for the sub-category detail pages. */
export async function getSubCategoryPaths(): Promise<{ params: { category: string; sub: string } }[]> {
  const catalogue = await getCatalogueData();
  return catalogue.subCategories
    .filter(s => s.is_active && s.category_slug)
    .map(getSubCategoryPath);
}

export async function getSubCategoryBySlug(categorySlug: string, subSlug: string): Promise<CatalogueSubCategory | null> {
  const catalogue = await getCatalogueData();
  return catalogue.subCategories.find(s => s.slug === subSlug && s.category_slug === categorySlug) ?? null;
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
// Catalogue queries
// ============================================================

function sortImages(images: SubCategoryImage[]): SubCategoryImage[] {
  return (images || []).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

function sortSpecs(specs: SubCategorySpecification[]): SubCategorySpecification[] {
  return (specs || []).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

function sortVariants(variants: SubCategoryVariant[]): SubCategoryVariant[] {
  return (variants || [])
    .slice()
    .filter(v => v.is_active !== false)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

export function getCatalogueData(): Promise<CatalogueData> {
  if (!hasSupabase()) return Promise.resolve(getFallbackCatalogueData());

  const [categoriesQuery, subCategoriesQuery] = [
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('sub_categories')
      .select(`
        *,
        sub_category_images ( * ),
        sub_category_specifications ( * ),
        sub_category_variants ( * )
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
  ];

  return Promise.all([categoriesQuery, subCategoriesQuery]).then(
    ([categoriesRes, subCategoriesRes]) => {
      const firstError = categoriesRes.error || subCategoriesRes.error;
      if (firstError) {
        console.error('Error fetching catalogue data:', firstError);
        return EMPTY_CATALOGUE;
      }

      const categories = (categoriesRes.data || []) as Category[];
      interface RawSub extends SubCategory {
        product_code: string | null;
        short_description: string | null;
        features: string[] | null;
        applications: SubCategoryApplication[] | null;
        is_featured: boolean;
        sub_category_images?: SubCategoryImage[];
        sub_category_specifications?: SubCategorySpecification[];
        sub_category_variants?: SubCategoryVariant[];
      }
      const rawSubs = (subCategoriesRes.data || []) as RawSub[];

      const categoryById = new Map(categories.map(c => [c.id, c]));

      const catalogueSubs: CatalogueSubCategory[] = rawSubs.map(s => {
        const cat = categoryById.get(s.category_id);
        return {
          ...s,
          images: sortImages(s.sub_category_images || []),
          specifications: sortSpecs(s.sub_category_specifications || []),
          variants: sortVariants(s.sub_category_variants || []),
          category_name: cat?.name ?? '',
          category_slug: cat?.slug ?? '',
          variants_count: sortVariants(s.sub_category_variants || []).length,
          is_featured: s.is_featured === true
        };
      });

      const catalogueCategories: CatalogueCategory[] = categories.map(cat => {
        const subs = catalogueSubs.filter(s => s.category_id === cat.id);
        return {
          ...cat,
          variants_count: subs.reduce((sum, s) => sum + s.variants_count, 0),
          sub_categories: subs
        };
      });

      return { categories: catalogueCategories, subCategories: catalogueSubs };
    },
    (error) => {
      console.error('Error building catalogue data:', error);
      return EMPTY_CATALOGUE;
    }
  );
}

function detailFromCatalogue(sub: CatalogueSubCategory): SubCategoryDetail {
  const { category_name: _a, category_slug: _b, variants_count: _c, ...rest } = sub;
  return rest as SubCategoryDetail;
}

// ============================================================
// Static fallback catalogue (used when Supabase is not configured)
// Mirrors supabase/migrations/20260910000001_sample_data.sql (products
// folded into sub-categories by 20260914000000_fold_products_into_sub_categories)
// so the public site renders the same base range in local/dev builds.
// ============================================================

interface FallbackDetail {
  name: string;
  slug: string;
  description: string;
  short_description: string;
  image_url: string;
  product_code: string;
  features: string[];
  applications: { name: string; description: string }[];
  variants: Array<{ model: string; size: string; weight: string; capacity: string; material: string }>;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'c-plastic-crates', name: 'Plastic Crates', slug: 'plastic-crates', description: 'Durable, lightweight and stackable crates for dairy, bakery, warehouse and material handling.', image_url: '/images/products/plastic-crates.webp', display_order: 1, is_active: true },
  { id: 'c-plastic-pallets', name: 'Plastic Pallets', slug: 'plastic-pallets', description: 'Heavy-duty industrial pallets for warehouse racking, logistics and export applications.', image_url: '/images/products/plastic-pallets.webp', display_order: 2, is_active: true },
  { id: 'c-waste-bins', name: 'Waste Bins', slug: 'waste-bins', description: 'Industrial waste bins and dustbins for municipal, commercial and factory use.', image_url: '/images/products/waste-bins.webp', display_order: 3, is_active: true },
  { id: 'c-hand-pallet-trucks', name: 'Hand Pallet Trucks', slug: 'hand-pallet-trucks', description: 'Manual material handling equipment for warehouse loading and unloading.', image_url: '/images/products/hand-pallet-truck.webp', display_order: 4, is_active: true }
];

const FALLBACK_DETAILS: Record<string, FallbackDetail> = {
  'standard-crates': {
    name: 'Standard Crates',
    slug: 'standard-crates',
    description: 'Our plastic crates are manufactured using high-grade HDPE and PP materials, designed for heavy-duty material handling in dairy, bakery, cold storage, and warehouse environments. Available in multiple sizes and colors.',
    short_description: 'Durable, lightweight & stackable crates for dairy, bakery, warehouse and material handling.',
    image_url: '/images/products/plastic-crates.webp',
    product_code: 'VPC-SERIES',
    features: [
      'HDPE / PP grade — impact & UV resistant',
      'Stackable with locking rims for safe transport',
      'Nestable designs for space-saving return logistics',
      'Ventilated and solid base options available',
      'Custom colors and logo hot-stamping on request'
    ],
    applications: [
      { name: 'Dairy', description: 'Milk pouch crates, curd and paneer transport crates with ventilation for moisture management.' },
      { name: 'Bakery', description: 'Bread and confectionery crates designed for stacking in delivery vehicles and storage racks.' },
      { name: 'Cold Storage', description: 'Frozen food and ice cream crates that withstand sub-zero temperatures without brittleness.' },
      { name: 'Warehouse', description: 'General material handling crates for inventory storage, order picking, and internal logistics.' }
    ],
    variants: [
      { model: 'VPC-400', size: '400 × 300 × 130', weight: '~750g', capacity: '15kg', material: 'PP / HDPE' },
      { model: 'VPC-500', size: '500 × 350 × 150', weight: '~1050g', capacity: '20kg', material: 'PP / HDPE' },
      { model: 'VPC-600', size: '600 × 400 × 200', weight: '~1400g', capacity: '25kg', material: 'HDPE' },
      { model: 'VPC-650', size: '650 × 450 × 250', weight: '~1800g', capacity: '30kg', material: 'HDPE' },
      { model: 'VPC-700', size: '700 × 500 × 300', weight: '~2200g', capacity: '35kg', material: 'HDPE' }
    ]
  },
  'standard-pallets': {
    name: 'Standard Pallets',
    slug: 'standard-pallets',
    description: 'Industrial-grade plastic pallets manufactured from high-strength HDPE for warehouse racking, logistics, and export applications. Available in single-face, double-face, and nestable configurations.',
    short_description: 'Heavy-duty industrial pallets for warehouse racking, logistics, and export applications.',
    image_url: '/images/products/plastic-pallets.webp',
    product_code: 'VPP-SERIES',
    features: [
      'HDPE construction for maximum load capacity',
      'Single-face and double-face designs available',
      'Nestable options for return logistics efficiency',
      'Four-way forklift entry for easy handling',
      'Custom dimensions and colors available'
    ],
    applications: [
      { name: 'Warehouse Racking', description: 'Heavy-duty storage in selective and drive-in racking systems with consistent dimensions.' },
      { name: 'Export Shipping', description: 'Lightweight alternative to wooden pallets for international freight with no fumigation required.' },
      { name: 'Manufacturing', description: 'Work-in-process handling and finished goods staging in production facilities.' },
      { name: 'Distribution', description: 'Cross-docking and last-mile delivery applications with durability and reusability.' }
    ],
    variants: [
      { model: 'VPP-1200', size: '1200 × 1000 × 150', weight: '~18kg', capacity: '1500kg', material: 'HDPE' },
      { model: 'VPP-1100', size: '1100 × 1100 × 150', weight: '~20kg', capacity: '1800kg', material: 'HDPE' },
      { model: 'VPP-1208', size: '1200 × 800 × 150', weight: '~15kg', capacity: '1200kg', material: 'HDPE' },
      { model: 'VPP-NEST', size: '1200 × 1000 × 160', weight: '~22kg', capacity: '2000kg', material: 'HDPE' }
    ]
  },
  'standard-bins': {
    name: 'Standard Bins',
    slug: 'standard-bins',
    description: 'Industrial-grade waste bins and dustbins for municipal, commercial, and factory applications. Available in multiple capacities with wheeled, lidded, and color-coded options for waste segregation.',
    short_description: 'Municipal & commercial waste solutions for industrial applications.',
    image_url: '/images/products/waste-bins.webp',
    product_code: 'VWB-SERIES',
    features: [
      'HDPE construction for weather resistance',
      'Wheeled options for easy mobility',
      'Tight-fitting lids to prevent spillage',
      'Color coding for waste segregation',
      'UV stabilized for outdoor use'
    ],
    applications: [
      { name: 'Municipal Collection', description: 'Street-side waste collection bins for residential and commercial areas with wheeled mobility.' },
      { name: 'Factory & Industrial', description: 'Heavy-duty waste containers for manufacturing facilities and industrial complexes.' },
      { name: 'Commercial Buildings', description: 'Office complexes, shopping centers, and institutional waste management systems.' },
      { name: 'Segregation Systems', description: 'Color-coded bins for recyclable, organic, and general waste separation programs.' }
    ],
    variants: [
      { model: 'VWB-120', size: '480 × 550 × 930', weight: '~8kg', capacity: '120L', material: 'HDPE' },
      { model: 'VWB-240', size: '580 × 740 × 1100', weight: '~14kg', capacity: '240L', material: 'HDPE' },
      { model: 'VWB-360', size: '620 × 860 × 1200', weight: '~18kg', capacity: '360L', material: 'HDPE' },
      { model: 'VWB-660', size: '800 × 1200 × 1350', weight: '~28kg', capacity: '660L', material: 'HDPE' }
    ]
  },
  'standard-trucks': {
    name: 'Standard Trucks',
    slug: 'standard-trucks',
    description: 'Heavy-duty hand pallet trucks (pallet jacks) for warehouse loading, unloading, and material transport. Available in 2.5T and 3T capacities with nylon or polyurethane wheel options.',
    short_description: 'Manual material handling equipment for warehouse loading and unloading.',
    image_url: '/images/products/hand-pallet-truck.webp',
    product_code: 'VPT-SERIES',
    features: [
      '2.5T and 3T load capacity options',
      'Nylon or polyurethane wheel configurations',
      'Ergonomic handle design for operator comfort',
      'Precision hydraulic lifting mechanism',
      'Heavy-duty steel construction'
    ],
    applications: [
      { name: 'Warehouse Loading', description: 'Loading and unloading trucks, containers, and warehouse racking systems efficiently.' },
      { name: 'Manufacturing', description: 'Moving raw materials, work-in-process, and finished goods within production facilities.' },
      { name: 'Retail & Distribution', description: 'Back-of-house operations in retail stores and distribution centers for inventory handling.' },
      { name: 'Cross-Docking', description: 'Fast-paced material transfer in logistics hubs and transportation terminals.' }
    ],
    variants: [
      { model: 'VPT-2500', size: '1150 × 550 × 1200', weight: '~68kg', capacity: '2500kg', material: 'Steel' },
      { model: 'VPT-3000', size: '1150 × 550 × 1200', weight: '~75kg', capacity: '3000kg', material: 'Steel' },
      { model: 'VPT-2500-PU', size: '1150 × 550 × 1200', weight: '~70kg', capacity: '2500kg', material: 'Steel + PU' },
      { model: 'VPT-3000-PU', size: '1150 × 550 × 1200', weight: '~78kg', capacity: '3000kg', material: 'Steel + PU' }
    ]
  }
};

function buildFallbackSub(detail: FallbackDetail, category: Category, order: number): CatalogueSubCategory {
  const variants: SubCategoryVariant[] = detail.variants.map((v, i) => ({
    id: `v-${category.slug}-${i + 1}`,
    sub_category_id: `s-${category.slug}`,
    name: v.model,
    size: v.size,
    shape: null,
    color: null,
    weight: v.weight,
    capacity: v.capacity,
    material: v.material,
    price: null,
    is_active: true,
    display_order: i
  }));
  const specifications: SubCategorySpecification[] = detail.variants.flatMap((v, i) => [
    { id: `sp-${category.slug}-${i}-model`, sub_category_id: `s-${category.slug}`, specification_name: 'Model', specification_value: v.model, display_order: i * 5 + 1 },
    { id: `sp-${category.slug}-${i}-size`, sub_category_id: `s-${category.slug}`, specification_name: 'Size (mm)', specification_value: v.size, display_order: i * 5 + 2 },
    { id: `sp-${category.slug}-${i}-weight`, sub_category_id: `s-${category.slug}`, specification_name: 'Weight', specification_value: v.weight, display_order: i * 5 + 3 },
    { id: `sp-${category.slug}-${i}-cap`, sub_category_id: `s-${category.slug}`, specification_name: getCapName(category.slug), specification_value: v.capacity, display_order: i * 5 + 4 },
    { id: `sp-${category.slug}-${i}-mat`, sub_category_id: `s-${category.slug}`, specification_name: 'Material', specification_value: v.material, display_order: i * 5 + 5 }
  ]);
  return {
    id: `s-${category.slug}`,
    category_id: category.id,
    name: detail.name,
    slug: detail.slug,
    description: detail.description,
    image_url: detail.image_url,
    product_code: detail.product_code,
    short_description: detail.short_description,
    features: detail.features,
    applications: detail.applications,
    is_featured: true,
    display_order: order,
    is_active: true,
    images: [{ id: `i-${category.slug}`, sub_category_id: `s-${category.slug}`, image_url: detail.image_url, alt_text: `${detail.name} — Vinayak Plastics`, display_order: 0 }],
    specifications,
    variants,
    category_name: category.name,
    category_slug: category.slug,
    variants_count: variants.length
  };
}

function getCapName(slug: string): string {
  return slug === 'standard-crates' ? 'Capacity' : slug === 'standard-trucks' ? 'Load Capacity' : 'Capacity';
}

function getFallbackCatalogueData(): CatalogueData {
  const categories: CatalogueCategory[] = FALLBACK_CATEGORIES.map((cat) => {
    const detail = FALLBACK_DETAILS[cat.slug === 'plastic-crates' ? 'standard-crates' : cat.slug === 'plastic-pallets' ? 'standard-pallets' : cat.slug === 'waste-bins' ? 'standard-bins' : 'standard-trucks'];
    const mainSub = buildFallbackSub(detail, cat, 1);
    const subs: CatalogueSubCategory[] = [mainSub];

    if (cat.slug === 'plastic-crates') {
      subs.push({
        id: 's-lid-crates',
        category_id: cat.id,
        name: 'Lid Crates',
        slug: 'lid-crates',
        description: 'Lidded crates for secure, dust-free transport and storage.',
        image_url: '/images/products/lid-crates.jpeg',
        product_code: null,
        short_description: 'Lidded crates for secure, dust-free transport and storage of goods in transit and warehouse.',
        features: [],
        applications: [],
        is_featured: false,
        display_order: 2,
        is_active: true,
        images: [],
        specifications: [],
        variants: [],
        category_name: cat.name,
        category_slug: cat.slug,
        variants_count: 0
      });
    }

    return {
      ...cat,
      variants_count: subs.reduce((sum, s) => sum + s.variants_count, 0),
      sub_categories: subs
    };
  });

  return { categories, subCategories: categories.flatMap(c => c.sub_categories) };
}

// ============================================================
// Image / Storage Helpers
// ============================================================

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

export function getProductImageUrl(path: string): string {
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return data.publicUrl;
}