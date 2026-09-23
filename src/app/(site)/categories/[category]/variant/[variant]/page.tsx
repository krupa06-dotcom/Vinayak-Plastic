import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/variant.css';
import BackButton from '@/components/BackButton';
import VariantGallery from '@/components/VariantGallery';
import { CONTACT } from '@/lib/contact';
import { getCategoryVariantPaths, getCategoryVariantBySlug, getCatalogueData, variantSlug, resolveImageUrl, resolveFirstImage } from '@/lib/db';

export const dynamicParams = false;

export const generateStaticParams = async () => getCategoryVariantPaths();

export async function generateMetadata({ params }: { params: Promise<{ category: string; variant: string }> }): Promise<Metadata> {
  const { category, variant } = await params;
  const size = await getCategoryVariantBySlug(category || '', variant || '');
  if (!size) return {};
  return {
    title: { absolute: `${size.name} | ${size.category_name} | Vinayak Plastics` },
    description: `${size.name} ${size.category_name.toLowerCase()} — ${[size.size, size.color, size.capacity].filter(Boolean).join(' · ')}.`
  };
}

const COLOR_HEX: Record<string, string> = {
  blue: '#2563eb', green: '#16a34a', red: '#dc2626', yellow: '#eab308',
  white: '#f8fafc', black: '#111827', grey: '#6b7280', gray: '#6b7280',
  orange: '#ea580c', brown: '#92400e', pink: '#ec4899', purple: '#7c3aed'
};

export default async function VariantPage({ params }: { params: Promise<{ category: string; variant: string }> }) {
  const { category, variant } = await params;
  const size = await getCategoryVariantBySlug(category || '', variant || '');
  if (!size) notFound();

  const catalogue = await getCatalogueData();
  const parent = catalogue.categories.find((c) => c.slug === size.category_slug) ?? null;
  const relatedSizes = (parent?.variants || []).filter((v) => v.id !== size.id);
  const relatedProducts = (parent?.sub_categories || []).filter((s) => s.is_active);

  // Prev / next navigation within the same size range.
  const variantOrder = parent?.variants || [];
  const currentIndex = variantOrder.findIndex((v) => v.id === size.id);
  const prevVariant = currentIndex > 0 ? variantOrder[currentIndex - 1] : null;
  const nextVariant = (currentIndex >= 0 && currentIndex < variantOrder.length - 1) ? variantOrder[currentIndex + 1] : null;
  const backHref = `/categories/${size.category_slug}`;
  const variantHref = (catVariant: { name: string | null; size: string | null }) => `/categories/${size.category_slug}/variant/${variantSlug(catVariant.name || catVariant.size || 'size')}`;

  const sizeImages = size.images;
  const mainImage = resolveFirstImage(...sizeImages.map((i) => i.image_url), size.category_image_url);
  const resolvableSizeImages = sizeImages.filter((i) => resolveImageUrl(i.image_url));

  const specs = [
    { label: 'Model', value: size.name },
    { label: 'External Size (L × W × H)', value: size.size },
    { label: 'Shape / Version', value: size.shape },
    { label: 'Colour', value: size.color },
    { label: 'Capacity / Load', value: size.capacity },
    { label: 'Material', value: size.material },
    { label: 'Price / Band', value: size.price }
  ].filter((s) => s.value);

  const colorValues = size.color ? size.color.split(',').map((c) => c.trim()).filter(Boolean) : [];

  const familyApplications = Array.from(new Map(
    relatedProducts
      .flatMap((s) => (s.applications || []).map((a) => ({ name: a.name, description: a.description })))
      .map((a) => [a.name, a])
  ).values()).filter((a) => a.name);

  const subtitle = size.category_description ?? 'Size / model in the Vinayak Plastics range.';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: size.name,
    description: subtitle,
    ...(mainImage ? { image: mainImage } : {}),
    brand: { '@type': 'Brand', name: 'Vinayak Plastics' },
    category: size.category_name,
    ...(size.size ? { size: size.size } : {}),
    ...(size.color ? { color: size.color } : {}),
    ...(size.material ? { material: size.material } : {})
  };

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb">
              <a href="/">Home</a> / <a href="/products">Products</a> /
              <a href={backHref}>{size.category_name}</a> / {size.name}
            </p>
            <BackButton href={backHref} />
          </div>
          <h1 className="display-800">{size.name}</h1>
          <p>{size.size || size.category_name}</p>
        </div>
      </section>

      {/* ===== SIZE DETAIL ===== */}
      <section className="section" id="size-detail">
        <div className="container">
          <div className="cat-detail">
            <VariantGallery
              images={resolvableSizeImages.map((img) => ({
                src: resolveImageUrl(img.image_url)!,
                alt: img.alt_text || `${size.name} — ${size.category_name}`
              }))}
              name={size.name}
            />
            <div className="cat-detail__body reveal">
              <span className="sec-index">{size.category_name} · Size / Model</span>
              <h2 className="display-700">{size.name}</h2>
              <p>{subtitle}</p>

              {colorValues.length > 0 && (
                <div className="cat-detail__types">
                  <span className="cat-detail__types-label">Colours available:</span>
                  {colorValues.map((c) => {
                    const hex = COLOR_HEX[c.trim().toLowerCase()] || null;
                    return (
                      <span className="cat-detail__chip v-chip" style={hex ? ({ '--chip': hex } as React.CSSProperties) : undefined} key={c}>{c}</span>
                    );
                  })}
                </div>
              )}

              {specs.length > 0 && (
                <dl className="vd-specs">
                  {specs.map((s) => (
                    <div className="vd-spec" key={s.label}>
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="cat-detail__actions">
                <a href="/contact" className="btn btn-primary">Request Pricing &amp; Specs</a>
              </div>
            </div>
          </div>

          {(prevVariant || nextVariant) && (
            <nav className="vpager" aria-label="Other sizes in this range">
              {prevVariant ? (
                <a className="vpager__link vpager__link--prev" href={variantHref(prevVariant)}>
                  <span aria-hidden="true">←</span> {prevVariant.name || prevVariant.size}
                </a>
              ) : (
                <span className="vpager__spacer" aria-hidden="true"></span>
              )}
              <span className="vpager__count">{currentIndex >= 0 ? `Size ${currentIndex + 1} of ${variantOrder.length}` : ''}</span>
              {nextVariant ? (
                <a className="vpager__link vpager__link--next" href={variantHref(nextVariant)}>
                  {nextVariant.name || nextVariant.size} <span aria-hidden="true">→</span>
                </a>
              ) : (
                <span className="vpager__spacer" aria-hidden="true"></span>
              )}
            </nav>
          )}

          <p className="vd-note reveal">
            Note: Specifications are indicative and may vary by batch. Contact us for detailed technical drawings.
          </p>
        </div>
      </section>

      {/* ===== APPLICATIONS ===== */}
      {familyApplications.length > 0 && (
        <section className="section" id="applications">
          <div className="container-sm">
            <div className="section-header reveal">
              <p className="sec-index">Applications</p>
              <h2 className="display-700">Common applications</h2>
              <p>Where {size.category_name.toLowerCase()} of this size are typically used.</p>
            </div>
            <div className="app-grid reveal">
              {familyApplications.map((app) => (
                <div className="app-card" key={app.name}>
                  <h3>{app.name}</h3>
                  <p>{app.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== OTHER SIZES IN RANGE ===== */}
      {relatedSizes.length > 0 && (
        <section className="section section-warm" id="related-sizes">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Range</p>
              <h2 className="display-700">Other sizes in this range</h2>
              <p>Explore every model in the {size.category_name.toLowerCase()} family.</p>
            </div>
            <div className="sc-grid reveal">
              {relatedSizes.map((v) => {
                const vImage = parent?.images.find((i) => i.category_variant_id === v.id);
                const img = resolveFirstImage(vImage?.image_url, size.category_image_url);
                const hex = (v.color || '').trim();
                const hexCss = COLOR_HEX[hex.toLowerCase()] || null;
                return (
                  <a href={`/categories/${size.category_slug}/variant/${variantSlug(v.name || v.size || 'size')}`} className="sc-card" key={v.id}>
                    <div className="sc-card__img">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={`${v.name} — ${size.category_name}`} width="480" height="300" loading="lazy" decoding="async" />
                      ) : (
                        <span className="sc-card__placeholder">{v.name}</span>
                      )}
                    </div>
                    <div className="sc-card__body">
                      <h3>{v.name || v.size}</h3>
                      {v.size && <p>{v.size}</p>}
                      <div className="sc-card__meta">
                        {hex ? (
                          <span className="v-color-chip" style={(hexCss ? { '--chip': hexCss } : undefined) as unknown as React.CSSProperties}>{hex}</span>
                        ) : (
                          <span className="sc-card__count">{size.category_name}</span>
                        )}
                        <span className="sc-card__cta">View Size <span aria-hidden="true">→</span></span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== PRODUCTS IN THIS RANGE ===== */}
      {relatedProducts.length > 0 && (
        <section className="section" id="products">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Products</p>
              <h2 className="display-700">{size.category_name} product types</h2>
              <p>Related product types sharing this range.</p>
            </div>
            <div className="sc-grid reveal">
              {relatedProducts.map((sub) => {
                const img = resolveFirstImage(sub.image_url, sub.images[0]?.image_url, size.category_image_url);
                return (
                  <a href={`/categories/${sub.category_slug}/${sub.slug}`} className="sc-card" key={sub.slug}>
                    <div className="sc-card__img">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={sub.name} width="480" height="300" loading="lazy" decoding="async" />
                      ) : (
                        <span className="sc-card__placeholder">{sub.name}</span>
                      )}
                    </div>
                    <div className="sc-card__body">
                      <h3>{sub.name}</h3>
                      {sub.short_description && <p>{sub.short_description}</p>}
                      <div className="sc-card__meta">
                        <span className="sc-card__count">{sub.variants_count} size{sub.variants_count === 1 ? '' : 's'}</span>
                        <span className="sc-card__cta">View Details <span aria-hidden="true">→</span></span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label={`Enquire about ${size.name}`}>
        <div className="container reveal">
          <h2 className="display-700">Need {size.name} specs or pricing?</h2>
          <p>Call or WhatsApp us directly for dimensions, material grades, custom sizes and dispatch timelines.</p>
          <div className="cta-buttons">
            <a href={CONTACT.phoneHref} className="btn btn-primary">Call {CONTACT.phoneDisplay}</a>
            <a href={CONTACT.whatsappHref} className="btn btn-secondary" target="_blank" rel="noopener">WhatsApp Us</a>
          </div>
        </div>
      </section>

      {mainImage && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Enlarged model image">
          <div className="lightbox__backdrop" data-lightbox-close></div>
          <figure className="lightbox__panel">
            <button type="button" className="lightbox__close" data-lightbox-close aria-label="Close preview">&times;</button>
            <div className="lightbox__imgwrap">
              <img id="lightbox-img" alt="" />
            </div>
            <figcaption className="lightbox__foot">
              <span className="lightbox__fig">{size.category_name} · Size / Model</span>
              <span className="lightbox__name">{size.name}</span>
            </figcaption>
          </figure>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </main>
  );
}