import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/subcategory.css';
import BackButton from '@/components/BackButton';
import CategoryLightbox from '@/components/CategoryLightbox';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
import { getSubCategoryPaths, getCatalogueData, resolveFirstImage, variantSlug } from '@/lib/db';

export const dynamicParams = false;

export const generateStaticParams = async () => getSubCategoryPaths();

export async function generateMetadata({ params }: { params: Promise<{ category: string; sub: string }> }): Promise<Metadata> {
  const { category, sub } = await params;
  const catalogue = await getCatalogueData();
  const subCategory = catalogue.subCategories.find((s) => s.slug === sub && s.category_slug === category) ?? null;
  if (!subCategory) return {};
  return {
    title: { absolute: `${subCategory.name} | Vinayak Plastics` },
    description: `${(subCategory.description || subCategory.short_description || `Explore our ${subCategory.name} range.`).slice(0, 150)}`
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

export default async function SubCategoryPage({ params }: { params: Promise<{ category: string; sub: string }> }) {
  const { category, sub } = await params;
  const catalogue = await getCatalogueData();
  const subCategory = catalogue.subCategories.find((s) => s.slug === sub && s.category_slug === category) ?? null;
  if (!subCategory) notFound();

  const categoryData = catalogue.categories.find((c) => c.slug === category) ?? null;
  const siblingProducts = (categoryData?.sub_categories ?? []).filter((s) => s.slug !== subCategory.slug);
  const categoryVariantNames = new Set((categoryData?.variants ?? []).map((v) => (v.name || '').trim()).filter(Boolean));
  const linkableVariants = subCategory.variants.filter((v) => categoryVariantNames.has((v.name || '').trim()));

  const variants = subCategory.variants;
  const hasVariants = variants.length > 0;
  const variantCols = (['name', 'size', 'shape', 'color', 'capacity', 'material'] as const)
    .filter((k) => hasVariants && variants.some((v) => v[k] !== null && v[k] !== ''));
  const variantLabels: Record<string, string> = {
    name: 'Model',
    size: 'Size (L × W × H)',
    shape: 'Shape',
    color: 'Colour',
    capacity: 'Capacity / Load',
    material: 'Material'
  };

  // Specifications are kept as a fallback table for ranges that have no explicit variants.
  const specificationModels = (subCategory.specifications || []).reduce((acc, spec) => {
    const existing = acc.find((s) => s.model === spec.specification_name);
    if (existing) {
      existing[spec.specification_name.toLowerCase()] = spec.specification_value;
    } else {
      acc.push({ model: spec.specification_name, [spec.specification_name.toLowerCase()]: spec.specification_value });
    }
    return acc;
  }, [] as Array<Record<string, string>>);

  const features = subCategory.features || [];
  const applications = (subCategory.applications || []).filter((a) => a.name);
  const gallery = subCategory.images.length > 0
    ? subCategory.images
    : subCategory.image_url
      ? [{ id: 'main', sub_category_id: subCategory.id, sub_category_variant_id: null, image_url: subCategory.image_url, alt_text: null, display_order: 0 }]
      : [];
  const mainImage = resolveFirstImage(subCategory.image_url, ...gallery.map((g) => g.image_url));

  const colors = Array.from(new Set(variants.map((v) => (v.color || '').trim()).filter(Boolean)));

  // Model catalogue data for the combined sizes & models spec sheet:
  // every variant gets its own resolved image, link and blueprint figure number.
  const modelImages = new Map(
    (subCategory.images || [])
      .filter((i) => i.sub_category_variant_id && i.image_url)
      .map((i) => [i.sub_category_variant_id, i.image_url])
  );
  const catalogueModels = variants.map((v, i) => {
    const img = resolveFirstImage(modelImages.get(v.id), mainImage);
    const isLinkable = categoryVariantNames.has((v.name || '').trim());
    const hex = (v.color || '').trim();
    return {
      v,
      img,
      name: v.name || v.size || 'Model',
      href: isLinkable
        ? `/categories/${subCategory.category_slug}/variant/${variantSlug(v.name || v.size || 'size')}`
        : '/contact',
      hex,
      hexCss: colorHex(hex) || '',
      fig: `FIG/${String(i + 1).padStart(2, '0')}`
    };
  });

  const statCards = [
    {
      value: String(hasVariants ? variants.length : specificationModels.length),
      label: sizeCountLabel(hasVariants ? variants.length : specificationModels.length)
    },
    ...(applications.length > 0
      ? [{ value: String(applications.length), label: applications.length === 1 ? 'Application' : 'Applications' }]
      : [])
  ];

  const subtitle = subCategory.short_description || subCategory.description || subCategory.name;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: subCategory.name,
    description: subCategory.description || subtitle,
    image: `${SITE_URL}/images/vp-logo.png`,
    brand: { '@type': 'Brand', name: 'Vinayak Plastics' },
    category: 'Material Handling Equipment'
  };

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / <a href="/products">Products</a> / <a href={`/categories/${subCategory.category_slug}`}>{subCategory.category_name}</a> / {subCategory.name}</p>
            <BackButton href={`/categories/${subCategory.category_slug}`} />
          </div>
          <h1 className="display-800">{subCategory.name}</h1>
          <p>{subtitle}</p>
        </div>
      </section>

      {/* ===== PRODUCT DETAIL ===== */}
      <section className="section" id="range-detail">
        <div className="container">
          <div className="cat-detail">
            <div className="cat-detail__media-wrap reveal">
              <div className="cat-detail__media">
                {mainImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mainImage}
                    alt={`${subCategory.name} — ${subCategory.category_name}`}
                    width="800"
                    height="600"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="cat-detail__placeholder">{subCategory.name}</span>
                )}
              </div>
            </div>
            <div className="cat-detail__body reveal">
              <span className="sec-index">Product · {subCategory.category_name}</span>
              <h2 className="display-700">{subCategory.name}</h2>
              <p>{subCategory.description}</p>
              {statCards.length > 0 && (
                <div className="cat-detail__stats">
                  {statCards.map((stat) => (
                    <div className="cat-detail__stat" key={stat.label}>
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {colors.length > 0 && (
                <div className="cat-detail__types">
                  <span className="cat-detail__types-label">Colours available:</span>
                  {colors.map((color) => (
                    <span className="cat-detail__chip" key={color}>{color}</span>
                  ))}
                </div>
              )}
              {linkableVariants.length > 0 && (
                <div className="cat-detail__types">
                  <span className="cat-detail__types-label">Models:</span>
                  {linkableVariants.slice(0, 6).map((v) => (
                    <a href={`/categories/${subCategory.category_slug}/variant/${variantSlug(v.name || v.size || 'size')}`} className="cat-detail__chip" key={v.id}>{v.name || v.size}</a>
                  ))}
                  {linkableVariants.length > 6 && <span className="cat-detail__types-label">+{linkableVariants.length - 6} more</span>}
                </div>
              )}
              {subCategory.product_code && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--steel)' }}>
                  Series code: <strong>{subCategory.product_code}</strong>
                </p>
              )}
              <a href="/contact" className="btn btn-primary">Request Pricing &amp; Specs</a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MODEL CATALOGUE: SIZES, MODELS & SPECS ===== */}
      {(hasVariants || specificationModels.length > 0) && (
        <section className="section-warm" id="range">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Model Catalogue</p>
              <h2 className="display-700">Available sizes &amp; models</h2>
              <p>Click any model image to view it enlarged — or click a model name to open its full detail page.</p>
            </div>

            {hasVariants ? (
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
            ) : (
              <div className="specs-table-wrap reveal">
                <table className="specs-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>External Size (L × W × H) mm</th>
                      <th>Load Capacity</th>
                      <th>Material</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specificationModels.map((spec, i) => (
                      <tr key={i}>
                        <td>{spec.model}</td>
                        <td>{spec.size}</td>
                        <td>{spec.capacity}</td>
                        <td>{spec.material}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasVariants && <CategoryLightbox />}

            <div className="reveal" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--steel)', textAlign: 'center' }}>
              <p>Note: Specifications are indicative and may vary by batch. Contact us for detailed technical drawings.</p>
            </div>
          </div>
        </section>
      )}

      {/* ===== FEATURES & APPLICATIONS ===== */}
      {(features.length > 0 || applications.length > 0) && (
        <section className="section-warm" id="features">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Features &amp; Applications</p>
              <h2 className="display-700">Why choose {subCategory.name}</h2>
              <p>Key product features and the sectors where {subCategory.name.toLowerCase()} is used every day.</p>
            </div>
            <div className="feat-app">
              {features.length > 0 && (
                <ul className="pd-features reveal">
                  {features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              )}
              {applications.length > 0 && (
                <div className="app-grid reveal">
                  {applications.map((app) => (
                    <div className="app-card" key={app.name}>
                      <h3>{app.name}</h3>
                      <p>{app.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== MORE IN THIS RANGE ===== */}
      <section className="section section-warm" id="products">
        <div className="container">
          <div className="section-header reveal">
            <p className="sec-index">More from this range</p>
            <h2 className="display-700">More {subCategory.category_name} products</h2>
            <p>Specific product types within the {subCategory.category_name.toLowerCase()} family — choose one to see full specifications.</p>
          </div>
          {siblingProducts.length > 0 ? (
            <div className="sc-grid reveal">
              {siblingProducts.map((p) => {
                const img = resolveFirstImage(p.image_url, p.images[0]?.image_url, categoryData?.image_url);
                return (
                  <a href={`/categories/${p.category_slug}/${p.slug}`} className="sc-card reveal" key={p.slug}>
                    <div className="sc-card__img">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={p.name}
                          width="480"
                          height="300"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="sc-card__placeholder">{p.name}</span>
                      )}
                    </div>
                    <div className="sc-card__body">
                      <h3>{p.name}</h3>
                      {p.short_description && <p>{p.short_description}</p>}
                      <div className="sc-card__meta">
                        <span className="sc-card__count">{sizeCountLabel(p.variants_count)}</span>
                        <span className="sc-card__cta">View Details <span aria-hidden="true">→</span></span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="empty-state reveal">
              <h3>More {subCategory.category_name.toLowerCase()} products are coming soon</h3>
              <p>We are adding detailed product breakdowns. <a href="/contact">Contact us</a> for the full {subCategory.category_name.toLowerCase()} range.</p>
            </div>
          )}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label={`Enquire about ${subCategory.name.toLowerCase()}`}>
        <div className="container reveal">
          <h2 className="display-700">Need {subCategory.name.toLowerCase()} specs or pricing?</h2>
          <p>We supply {subCategory.category_name.toLowerCase()} to businesses across India. Call or WhatsApp for a quote.</p>
          <div className="cta-buttons">
            <a href={CONTACT.phoneHref} className="btn btn-primary">Call {CONTACT.phoneDisplay}</a>
            <a href={CONTACT.whatsappHref} className="btn btn-secondary" target="_blank" rel="noopener">WhatsApp Us</a>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
    </main>
  );
}