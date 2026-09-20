import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/category.css';
import BackButton from '@/components/BackButton';
import CategoryLightbox from '@/components/CategoryLightbox';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
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

  const variantCols = (['name', 'size', 'color', 'weight', 'capacity', 'material'] as const)
    .filter((k) => categorySizes.some((v) => v[k] !== null && v[k] !== ''));
  const variantLabels: Record<string, string> = {
    name: 'Model',
    size: 'Size (L × W × H)',
    color: 'Colour',
    weight: 'Weight',
    capacity: 'Capacity / Load',
    material: 'Material'
  };

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
            <div className="section-header reveal">
              <p className="sec-index">Model Catalogue</p>
              <h2 className="display-700">Available sizes &amp; models</h2>
              <p>Click any model image to view it enlarged — or click a model name to open its full detail page.</p>
            </div>

            <div className="specs-table-wrap reveal">
              <table className="specs-table spec-table-models">
                <thead>
                  <tr>
                    {variantCols.map((k) => (
                      <th key={k}>{variantLabels[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalogueModels.map((m) => (
                    <tr className="spec-row" data-spec-href={m.href} key={m.v.id}>
                      {variantCols.map((k) => (
                        <td className={k === 'name' ? 'spec-td-model' : ''} key={k}>
                          {k === 'name' ? (
                            <div className="spec-model">
                              {m.img && (
                                <button
                                  type="button"
                                  className="spec-model__thumb-btn"
                                  data-lightbox-src={m.img}
                                  data-lightbox-name={m.name}
                                  data-lightbox-fig={m.fig}
                                  aria-label={`Preview ${m.name} image`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img className="spec-model__thumb" src={m.img} alt="" width="108" height="84" loading="lazy" decoding="async" />
                                </button>
                              )}
                              <a href={m.href} className="specs-model spec-model__link">{m.v[k] || '—'}</a>
                            </div>
                          ) : k === 'color' ? (
                            <span className="spec-swatch" style={{ '--chip': m.hexCss || '#cccccc' } as React.CSSProperties}>{m.v[k] || '—'}</span>
                          ) : (
                            m.v[k] || '—'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CategoryLightbox />

            <div className="reveal" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--steel)', textAlign: 'center' }}>
              <p>Note: Specifications are indicative. Final dimensions and weight may vary by batch. Contact us for detailed technical drawings.</p>
            </div>
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

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label={`Enquire about ${category.name.toLowerCase()}`}>
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