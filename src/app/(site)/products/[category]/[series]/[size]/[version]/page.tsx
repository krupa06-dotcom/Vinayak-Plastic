import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/category.css';
import '@/styles/subcategory.css';
import '@/styles/catalogue.css';
import '@/styles/variant.css';
import BackButton from '@/components/BackButton';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import SafeImage from '@/components/SafeImage';
import SizeMegaNav, { type MegaNavSize } from '@/components/SizeMegaNav';
import SpecTable, { type SpecRow } from '@/components/SpecTable';
import VariantGallery from '@/components/VariantGallery';
import EnquiryForm, { type EnquiryPrefill } from '@/components/EnquiryForm';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
import {
  formatFootprint,
  formatVariantSize,
  getHierarchyVersionPaths,
  getProductDetail,
  normalizeApplications
} from '@/lib/hierarchy';
import type { ProductDetailContext } from '@/lib/hierarchy';

export const revalidate = 3600;

export const generateStaticParams = getHierarchyVersionPaths;

function d(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}

function joinMm(a?: number | null, b?: number | null, c?: number | null): string | null {
  const x = d(a);
  const y = d(b);
  const z = d(c);
  if (!(x && y && z)) return null;
  return `${x} × ${y} × ${z} mm`;
}

const COLOUR_SWATCHES: Record<string, string> = {
  blue: '#1f5fae',
  grey: '#7a828c',
  gray: '#7a828c',
  green: '#1f7a4d',
  red: '#c0392b',
  yellow: '#e8b81c',
  black: '#23272c',
  white: '#f1f1ec',
  orange: '#e8630c',
  turquoise: '#1aa6a6'
};

function colourSwatch(name: string): string {
  const key = name.toLowerCase().split('/')[0].trim();
  return COLOUR_SWATCHES[key] || '#9aa1a9';
}

function specsFor(ctx: ProductDetailContext): { dimensions: SpecRow[]; technical: SpecRow[] } {
  const { series, size, variant } = ctx;
  const add = (
    rows: SpecRow[],
    name: string,
    value: string | number | null | undefined
  ) => {
    const v = value === null || value === undefined ? '' : String(value).trim();
    if (v) rows.push({ name, value: v });
    return rows;
  };

  const dimensions: SpecRow[] = [];
  const technical: SpecRow[] = [];

  add(
    dimensions,
    'External Size (L × W × H)',
    joinMm(variant.outer_length, variant.outer_width, variant.outer_height) ??
      joinMm(series.base_length, series.base_width, size.height)
  );
  add(dimensions, 'Inner Size (L × W × H)', joinMm(variant.inner_length, variant.inner_width, variant.inner_height));

  add(technical, 'Model Code', variant.model_code);
  add(technical, 'Version', variant.version_name || variant.version_code);
  add(technical, 'Material', variant.material);
  add(technical, 'Load Capacity', variant.load_capacity);
  add(technical, 'Shape', variant.shape);
  add(technical, 'Series Code', series.product_code);

  return { dimensions, technical };
}

export async function generateMetadata({
  params
}: { params: Promise<{ category: string; series: string; size: string; version: string }> }): Promise<Metadata> {
  const { category, series, size, version } = await params;
  const ctx = await getProductDetail(category, series, size, version);
  if (!ctx) return {};
  const { category: cat, series: s, size: sz, variant } = ctx;
  const fullName = `${variant.display_name} — ${formatVariantSize(s, sz.height, variant)}`;
  const name = `${variant.display_name} — ${s.name}`;
  const description =
    variant.description || s.short_description || `${name} from the ${cat.name} range.`.slice(0, 160);
  const image = variant.images[0]?.src || variant.card_image;
  return {
    title: { absolute: `${fullName} | Vinayak Plastics` },
    description: description.slice(0, 160),
    alternates: { canonical: variant.href },
    openGraph: {
      title: `${fullName} | Vinayak Plastics`,
      description: description.slice(0, 160),
      url: variant.href,
      images: image ? [{ url: image, alt: `${name} — ${cat.name}` }] : undefined
    }
  };
}

export default async function ProductDetailPage({
  params
}: { params: Promise<{ category: string; series: string; size: string; version: string }> }) {
  const { category, series, size, version } = await params;
  const ctx = await getProductDetail(category, series, size, version);
  if (!ctx) notFound();

  const { category: cat, series: s, size: sz, variant, siblingVariants } = ctx;
  const features = (variant.description ? [variant.description] : []).concat(s.features || []);
  const applications = normalizeApplications(s.applications);
  const specs = specsFor(ctx);
  const fullSize = formatVariantSize(s, sz.height, variant);

  // Colour values live on the variant; crates without a stored value fall back
  // to the standard crate colours so the swatches are always useful.
  const colourValue =
    variant.colours?.trim() || (cat.slug === 'plastic-crates' ? 'Blue, Grey' : '');
  const colourList = colourValue
    .split(',')
    .map((colour) => colour.trim())
    .filter(Boolean);

  // One tab per footprint/series in the category. The mega menu lists every
  // model (all heights and construction types) inside that footprint.
  const megaSizes: MegaNavSize[] = cat.series
    .map((series) => ({
      key: series.series_key,
      label: formatFootprint(series) || series.name,
      href: series.href,
      models: series.sizes.flatMap((size) =>
        size.variants.map((v) => ({
          href: v.href,
          image: v.card_image,
          modelCode: v.model_code,
          name: v.display_name,
          dimensions: formatVariantSize(series, size.height, v)
        }))
      )
    }))
    .filter((series) => series.models.length > 0);

  const galleryImages =
    variant.images.length > 0
      ? variant.images
      : variant.card_image
        ? [{ src: variant.card_image, alt: `${variant.display_name} — ${cat.name}` }]
        : [];

  const quickFacts = [
    // Series footprint × height when the series has one; otherwise the model's
    // own external size (waste bins carry their dimensions per model).
    {
      tag: 'Size',
      value:
        joinMm(s.base_length, s.base_width, sz.height) ??
        joinMm(variant.outer_length, variant.outer_width, variant.outer_height)
    },
    { tag: 'Height', value: `${sz.height} mm` },
    { tag: 'Material', value: variant.material },
    { tag: 'Load', value: variant.load_capacity }
  ].filter((f): f is { tag: string; value: string } => Boolean(f.value));

  const prefill: EnquiryPrefill = {
    productVariantId: variant.id,
    category: cat.name,
    series: s.name,
    size: fullSize,
    version: variant.display_name,
    modelCode: variant.model_code
  };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${variant.display_name} — ${s.name}`,
    description:
      variant.description || s.short_description || `${variant.display_name} from the ${cat.name} range.`,
    brand: { '@type': 'Brand', name: 'Vinayak Plastics' },
    category: cat.name,
    sku: variant.model_code,
    mpn: variant.model_code,
    color: colourList.length > 0 ? colourList.join(', ') : undefined,
    image: galleryImages[0]?.src || `${SITE_URL}/images/vp-logo.png`,
    additionalProperty: [...specs.dimensions, ...specs.technical].map((row) => ({
      '@type': 'PropertyValue',
      name: row.name,
      value: row.value
    }))
  };

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <nav aria-label="Breadcrumb" className="breadcrumb">
              <a href="/">Home</a> / <a href="/products">Products</a> /{' '}
              <a href={cat.href}>{cat.name}</a> /{' '}
              <a href={s.href}>{s.name}</a> /{' '}
              <span aria-current="page">{variant.display_name}</span>
            </nav>
            <BackButton href={`${s.href}#size-${sz.size_key}`} />
          </div>
          <h1 className="display-800">{variant.display_name}</h1>
          {fullSize && <p className="page-hero__dims">{fullSize}</p>}
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
            Model Code: <strong>{variant.model_code}</strong> • Series: <strong>{s.name}</strong> • Category: <strong>{cat.name}</strong>
          </p>
        </div>
      </section>

      {/* ===== PRODUCT DETAIL ===== */}
      <section className="section" id="product-detail">
        <div className="container">
          <SizeMegaNav categoryName={cat.name} activeKey={s.series_key} sizes={megaSizes} />
          <div className="cat-detail">
            <div className="cat-detail__media-wrap reveal">
              <div className="pd-gallery-block">
                <VariantGallery images={galleryImages} name={variant.display_name} />
                {colourList.length > 0 && (
                  <div className="pd-colours pd-colours--gallery">
                    <span className="pd-colours__label">Available Colours</span>
                    <ul className="pd-colours__list">
                      {colourList.map((colour) => (
                        <li key={colour}>
                          <button
                            type="button"
                            className="pd-colours__chip-btn is-active"
                            data-colour={colour.toLowerCase()}
                            aria-pressed="true"
                          >
                            <span
                              className="pd-colours__swatch"
                              style={{ background: colourSwatch(colour) }}
                              aria-hidden="true"
                            />
                            <span>{colour}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="lightbox" data-lightbox aria-modal="true" role="dialog" aria-label="Enlarged product image">
                <div className="lightbox__backdrop" data-lightbox-close></div>
                <div className="lightbox__panel">
                  <button type="button" className="lightbox__close" data-lightbox-close aria-label="Close preview">✕</button>
                  <div className="lightbox__imgwrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img id="lightbox-img" alt="" />
                  </div>
                  <div className="lightbox__foot">
                    <span className="lightbox__fig">VINAYAK PLASTICS</span>
                    <span className="lightbox__name">{variant.display_name}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="cat-detail__body reveal">
              <span className="sec-index">Product · {cat.name}</span>
              <h2 className="display-700">{variant.display_name}</h2>
              <p>
                {variant.description || s.short_description || s.description || `${variant.display_name} from the ${cat.name} range.`}
              </p>
              {fullSize && (
                <div className="pd-dims">
                  <span className="pd-dims__tag">Product Size</span>
                  <span className="pd-dims__val">{fullSize}</span>
                  <span className="pd-dims__hint">L × W × H · external dimensions</span>
                </div>
              )}
              {quickFacts.length > 0 && (
                <ul className="hx-facts">
                  {quickFacts.map((f) => (
                    <li key={f.tag} className="hx-fact">
                      <span className="hx-fact__tag">{f.tag}</span>
                      <span>{f.value}</span>
                    </li>
                  ))}
                </ul>
              )}
              {colourList.length > 0 && (
                <div className="pd-colours pd-colours--body">
                  <span className="pd-colours__label">Available Colours</span>
                  <ul className="pd-colours__list">
                    {colourList.map((colour) => (
                      <li key={colour}>
                        <button
                          type="button"
                          className="pd-colours__chip-btn is-active"
                          data-colour={colour.toLowerCase()}
                          aria-pressed="true"
                        >
                          <span
                            className="pd-colours__swatch"
                            style={{ background: colourSwatch(colour) }}
                            aria-hidden="true"
                          />
                          <span>{colour}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <a href="#quote" className="btn btn-primary">Request Bulk Quote</a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SPECIFICATIONS ===== */}
      {(specs.dimensions.length > 0 || specs.technical.length > 0) && (
        <section className="section-warm" id="specs">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Specifications</p>
              <h2 className="display-700">{variant.display_name} technical specs</h2>
              <p>Key dimensions and properties for the {variant.model_code} model.</p>
            </div>
            <div className="specs-tables">
              <SpecTable title="Dimensions" rows={specs.dimensions} />
              <SpecTable title="Technical Information" rows={specs.technical} />
            </div>
            <div className="reveal" style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--steel)', textAlign: 'center' }}>
              <p>Specifications are indicative and may vary by batch. Contact us for detailed technical drawings.</p>
            </div>
          </div>
        </section>
      )}

      {/* ===== FEATURES & APPLICATIONS ===== */}
      {(features.length > 0 || applications.length > 0) && (
        <section className="section section-warm" id="features">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Features &amp; Applications</p>
              <h2 className="display-700">About {variant.display_name}</h2>
              <p>What this model is used for and the industries that rely on it.</p>
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

      {/* ===== OTHER VERSIONS IN THIS SIZE ===== */}
      {siblingVariants.length > 0 && (
        <section className="section section-warm" id="other-versions">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Other models</p>
              <h2 className="display-700">Other versions at {fullSize}</h2>
              <p>Alternative construction types available at this size in the {s.name.toLowerCase()} series.</p>
            </div>
            <div className="px-version-grid reveal">
              {siblingVariants.map((v) => (
                <a key={v.version_key} href={v.href} className="px-version">
                  <div className="px-version__img">
                    {v.card_image ? (
                      <SafeImage src={v.card_image} alt={`${v.display_name} — ${v.model_code}`} width="480" height="300" loading="lazy" decoding="async" />
                    ) : (
                      <span className="px-version__placeholder">{v.display_name}</span>
                    )}
                  </div>
                  <div className="px-version__body">
                    <span className="px-version__code">{v.model_code}</span>
                    <h3 className="px-version__name">{v.display_name}</h3>
                    <span className="px-version__dims">{fullSize}</span>
                    <div className="px-version__foot">
                      <span className="px-version__cta">View Details <span aria-hidden="true">→</span></span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== QUOTE ===== */}
      <section className="section" id="quote">
        <div className="container">
          <div className="hx-quote">
            <span className="sec-index">Request a Quote</span>
            <h2 className="display-700">Get pricing for {variant.display_name}</h2>
            <p className="hx-quote__intro">
              Share your quantity and we will respond with pricing and availability for the{' '}
              {variant.model_code} model.
            </p>
            <EnquiryForm prefill={prefill} />
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label="Get a quote">
        <div className="container reveal">
          <h2 className="display-700">Prefer to talk directly?</h2>
          <p>Call or WhatsApp us for immediate assistance with {cat.name.toLowerCase()} products.</p>
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
      <BreadcrumbSchema
        crumbs={[
          { name: 'Home', item: `${SITE_URL}/` },
          { name: 'Products', item: `${SITE_URL}/products` },
          { name: cat.name, item: `${SITE_URL}${cat.href}` },
          { name: s.name, item: `${SITE_URL}${s.href}` },
          { name: `${sz.height} mm`, item: `${SITE_URL}${s.href}#size-${sz.size_key}` },
          { name: variant.display_name }
        ]}
      />
    </main>
  );
}