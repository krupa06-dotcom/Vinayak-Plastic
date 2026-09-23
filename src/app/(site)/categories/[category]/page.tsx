import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/category.css';
import BackButton from '@/components/BackButton';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
import CategorySectionNav, { type SectionNavItem } from '@/components/CategorySectionNav';
import CategoryModelCatalogue, { type CatalogueModelRow, type SpecColumn } from '@/components/CategoryModelCatalogue';
import CategoryRail, { type CategoryRailItem } from '@/components/CategoryRail';
import { getCatalogueData, resolveImageUrl, resolveFirstImage, variantSlug } from '@/lib/db';

export const dynamicParams = false;

export const generateStaticParams = async () => {
  const catalogue = await getCatalogueData();
  return catalogue.categories.map((cat) => ({ category: cat.slug }));
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const catalogue = await getCatalogueData();
  const category = catalogue.categories.find((c) => c.slug === categorySlug) ?? null;
  if (!category) return {};
  return {
    title: { absolute: `${category.name} | Vinayak Plastics` },
    description: `${category.description || `Explore our range of ${category.name.toLowerCase()}.`} View sizes, colours and available product types.`
  };
}

const HEX_MAP: Record<string, string> = {
  blue: '#2563eb', green: '#16a34a', red: '#dc2626', yellow: '#eab308',
  white: '#f8fafc', black: '#111827', grey: '#6b7280', gray: '#6b7280',
  orange: '#ea580c', brown: '#92400e', pink: '#ec4899', purple: '#7c3aed'
};
function colorHex(color: string | null): string | null {
  if (!color) return null;
  return HEX_MAP[color.trim().toLowerCase()] || null;
}

function sizeCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'Size / Model' : 'Sizes / Models'}`;
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params;
  const catalogue = await getCatalogueData();
  const category = catalogue.categories.find((c) => c.slug === categorySlug) ?? null;
  if (!category) notFound();

  const products = category.sub_categories;
  const totalSizes = category.variants_count;
  const categorySizes = category.variants;

  const colors = Array.from(new Set(categorySizes.map((v) => (v.color || '').trim()).filter(Boolean)));

  // Model catalogue data for the combined sizes & models spec sheet:
  // every variant gets its own resolved image, link and blueprint figure number.
  const modelImages = new Map(
    (category.images || [])
      .filter((i) => i.category_variant_id && i.image_url)
      .map((i) => [i.category_variant_id, i.image_url])
  );
  const visualOf = (catVariant: { id: string }) => resolveFirstImage(modelImages.get(catVariant.id), category.image_url);
  const hrefOf = (catVariant: { name: string | null; size: string | null }) => `/categories/${category.slug}/variant/${variantSlug(catVariant.name || catVariant.size || 'size')}`;

  const catalogueModels = categorySizes.map((catVariant, i) => {
    const img = visualOf(catVariant);
    const hex = (catVariant.color || '').trim();
    return {
      v: catVariant,
      img,
      name: catVariant.name || catVariant.size || 'Model',
      href: hrefOf(catVariant),
      hex,
      hexCss: colorHex(hex) || '',
      fig: `FIG/${String(i + 1).padStart(2, '0')}`
    };
  });

  // Model rows for the live quick-filter catalogue.
  const modelRows: CatalogueModelRow[] = catalogueModels.map((m) => {
    const v = m.v;
    const raw = (x: string | null) => (x || '').trim();
    return {
      id: v.id,
      name: m.name,
      href: m.href,
      img: m.img,
      fig: m.fig,
      hexCss: m.hexCss,
      cols: {
        name: m.name,
        size: raw(v.size) || '—',
        color: raw(v.color) || '—',
        capacity: raw(v.capacity) || '—',
        material: raw(v.material) || '—'
      },
      search: [m.name, v.size, v.color, v.capacity, v.material]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
    };
  });

  const modelColumns: SpecColumn[] = (['name', 'size', 'color', 'capacity', 'material'] as const)
    .filter((k) => categorySizes.some((v) => v[k] !== null && v[k] !== ''))
    .map((k) => k as SpecColumn);

  const colourFacets = colors.map((label) => ({ label, hex: colorHex(label) || '' }));
  const materialFacets = Array.from(
    new Set(categorySizes.map((v) => (v.material || '').trim()).filter(Boolean))
  );

  // Cross-category rail for "keep exploring".
  const railCategories: CategoryRailItem[] = catalogue.categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    image: resolveImageUrl(c.image_url),
    count: c.variants_count
  }));

  const navSections: SectionNavItem[] = [
    { id: 'range-detail', label: 'Overview' },
    ...(catalogueModels.length > 0 ? [{ id: 'range', label: 'Models & Specs' }] : []),
    ...(products.length > 0 ? [{ id: 'products', label: 'Products' }] : []),
    { id: 'enquire', label: 'Get a Quote' }
  ];

  const heroImage = resolveImageUrl(category.image_url);

  const categorySchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: category.name, item: `${SITE_URL}/categories/${category.slug}` }
    ]
  };

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / <a href="/products">Products</a> / {category.name}</p>
            <BackButton href="/products" />
          </div>
          <h1 className="display-800">{category.name}</h1>
          <p>{category.description}</p>
        </div>
      </section>

      <CategorySectionNav sections={navSections} />

      {/* ===== RANGE DETAIL ===== */}
      <section className="section" id="range-detail">
        <div className="container">
          <div className="cat-detail">
            <div className="cat-detail__media reveal">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={`${category.name} — Vinayak Plastics product range`}
                  width="800"
                  height="600"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="cat-detail__placeholder">{category.name}</span>
              )}
            </div>
            <div className="cat-detail__body reveal">
              <span className="sec-index">Product Range</span>
              <h2 className="display-700">{category.name}</h2>
              <p>{category.description || `We supply this product range in multiple sizes and colours to suit your application.`}</p>
              <div className="cat-detail__stats">
                <div className="cat-detail__stat">
                  <strong>{products.length}</strong>
                  <span>{products.length === 1 ? 'Product' : 'Products'}</span>
                </div>
                <div className="cat-detail__stat">
                  <strong>{totalSizes}</strong>
                  <span>{sizeCountLabel(totalSizes)}</span>
                </div>
              </div>
              {colors.length > 0 && (
                <div className="cat-detail__types">
                  <span className="cat-detail__types-label">Colours available:</span>
                  {colors.map((color) => (
                    <span className="cat-detail__chip" key={color}>{color}</span>
                  ))}
                </div>
              )}
              {categorySizes.length > 0 && (
                <div className="cat-detail__types">
                  <span className="cat-detail__types-label">Models:</span>
                  {categorySizes.slice(0, 6).map((v) => (
                    <a href={`/categories/${category.slug}/variant/${variantSlug(v.name || v.size || 'size')}`} className="cat-detail__chip" key={v.id}>{v.name || v.size}</a>
                  ))}
                  {categorySizes.length > 6 && <span className="cat-detail__types-label">+{categorySizes.length - 6} more</span>}
                </div>
              )}
              <a href="/contact" className="btn btn-primary">Request Pricing &amp; Specs</a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MODEL CATALOGUE: SIZES, MODELS & SPECS ===== */}
      {catalogueModels.length > 0 && (
        <section className="section-warm" id="range">
          <div className="container">
            <CategoryModelCatalogue
              models={modelRows}
              columns={modelColumns}
              colours={colourFacets}
              materials={materialFacets}
            />
          </div>
        </section>
      )}

      {/* ===== PRODUCTS IN THIS RANGE ===== */}
      <section className="section section-warm" id="products">
        <div className="container">
          <div className="section-header reveal">
            <p className="sec-index">Products in this range</p>
            <h2 className="display-700">Browse {category.name} products</h2>
            <p>Specific product types within the {category.name.toLowerCase()} family — choose one to see full specifications.</p>
          </div>

          {products.length > 0 ? (
            <div className="sc-grid">
              {products.map((sub) => {
                const subImg = resolveFirstImage(sub.image_url, sub.images[0]?.image_url, category.image_url);
                return (
                  <a href={`/categories/${sub.category_slug}/${sub.slug}`} className="sc-card reveal" key={sub.slug}>
                    <div className="sc-card__img">
                      {subImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={subImg}
                          alt={`${sub.name}`}
                          width="480"
                          height="300"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="sc-card__placeholder">{sub.name}</span>
                      )}
                    </div>
                    <div className="sc-card__body">
                      <h3>{sub.name}</h3>
                      {sub.short_description && <p>{sub.short_description}</p>}
                      <div className="sc-card__meta">
                        <span className="sc-card__count">{sizeCountLabel(sub.variants_count)}</span>
                        <span className="sc-card__cta">View Details <span aria-hidden="true">→</span></span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="empty-state reveal">
              <h3>Products in this range are coming soon</h3>
              <p>We are adding detailed breakdowns. <a href="/contact">Contact us</a> for the full range.</p>
            </div>
          )}
        </div>
      </section>

      <CategoryRail categories={railCategories} currentSlug={category.slug} />

      {/* ===== CTA ===== */}
      <section className="cta-banner" id="enquire" aria-label={`Enquire about ${category.name.toLowerCase()}`}>
        <div className="container reveal">
          <h2 className="display-700">Need {category.name.toLowerCase()} specs or pricing?</h2>
          <p>Call or WhatsApp us directly for dimensions, material grades, custom sizes and dispatch timelines.</p>
          <div className="cta-buttons">
            <a href={CONTACT.phoneHref} className="btn btn-primary">Call {CONTACT.phoneDisplay}</a>
            <a href={CONTACT.whatsappHref} className="btn btn-secondary" target="_blank" rel="noopener">WhatsApp Us</a>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categorySchema) }}
      />
    </main>
  );
}