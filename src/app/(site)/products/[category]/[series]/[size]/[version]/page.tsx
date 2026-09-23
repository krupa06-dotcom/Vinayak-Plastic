import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/category.css';
import '@/styles/subcategory.css';
import '@/styles/catalogue.css';
import BackButton from '@/components/BackButton';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import SeriesRail from '@/components/SeriesRail';
import VariantGallery from '@/components/VariantGallery';
import EnquiryForm, { type EnquiryPrefill } from '@/components/EnquiryForm';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
import {
  formatFootprint,
  formatSize,
  getHierarchyVersionPaths,
  getProductDetail,
  normalizeApplications
} from '@/lib/hierarchy';
import type { ProductDetailContext } from '@/lib/hierarchy';

export const dynamicParams = false;

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

function specsFor(ctx: ProductDetailContext): { name: string; value: string }[] {
  const { series, size, variant } = ctx;
  const add = (
    rows: { name: string; value: string }[],
    name: string,
    value: string | number | null | undefined
  ) => {
    const v = value === null || value === undefined ? '' : String(value).trim();
    if (v) rows.push({ name, value: v });
    return rows;
  };

  const rows: { name: string; value: string }[] = [];
  add(rows, 'Model Code', variant.model_code);
  add(rows, 'Version', variant.version_name || variant.version_code);
  add(
    rows,
    'External Size (L × W × H)',
    joinMm(variant.outer_length, variant.outer_width, variant.outer_height) ??
      joinMm(series.base_length, series.base_width, size.height)
  );
  add(rows, 'Material', variant.material);
  add(rows, 'Load Capacity', variant.load_capacity);
  add(rows, 'Weight', variant.weight);
  add(rows, 'Colours', variant.colours);
  add(rows, 'Shape', variant.shape);
  add(rows, 'Inner Size (L × W × H)', joinMm(variant.inner_length, variant.inner_width, variant.inner_height));
  add(rows, 'Series Code', series.product_code);
  add(rows, 'Price', variant.price);
  return rows;
}

export async function generateMetadata({
  params
}: { params: Promise<{ category: string; series: string; size: string; version: string }> }): Promise<Metadata> {
  const { category, series, size, version } = await params;
  const ctx = await getProductDetail(category, series, size, version);
  if (!ctx) return {};
  const { category: cat, series: s, size: sz, variant } = ctx;
  const fullName = `${variant.display_name} — ${formatSize(s, sz.height)}`;
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

  const { category: cat, series: s, size: sz, variant, siblingSizes, siblingVariants } = ctx;
  const features = (variant.description ? [variant.description] : []).concat(s.features || []);
  const applications = normalizeApplications(s.applications);
  const specs = specsFor(ctx);
  const fullSize = formatSize(s, sz.height);
  const footprint = formatFootprint(s);

  const siblingSizeHref = (sib: { size_key: string; variants: { href: string }[] }) =>
    sib.variants[0]?.href ?? `${s.href}#size-${sib.size_key}`;

  const galleryImages =
    variant.images.length > 0
      ? variant.images
      : variant.card_image
        ? [{ src: variant.card_image, alt: `${variant.display_name} — ${cat.name}` }]
        : [];

  const quickFacts = [
    { tag: 'Size', value: joinMm(s.base_length, s.base_width, sz.height) },
    { tag: 'Height', value: `${sz.height} mm` },
    { tag: 'Material', value: variant.material },
    { tag: 'Load', value: variant.load_capacity },
    { tag: 'Weight', value: variant.weight },
    { tag: 'Colours', value: variant.colours }
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
    image: galleryImages[0]?.src || `${SITE_URL}/images/vp-logo.png`,
    additionalProperty: specs.map((row) => ({
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
            <p className="breadcrumb">
              <a href="/">Home</a> / <a href="/products">Products</a> /{' '}
              <a href={cat.href}>{cat.name}</a> /{' '}
              <a href={s.href}>{s.name}</a> /{' '}
              {fullSize} / {variant.display_name}
            </p>
            <BackButton href={`${s.href}#size-${sz.size_key}`} />
          </div>
          <h1 className="display-800">{variant.display_name}</h1>
          {fullSize && <p className="page-hero__dims">{fullSize}</p>}
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--white)' }}>
            Model Code: <strong>{variant.model_code}</strong> · Series: <strong>{s.name}</strong>
          </p>
        </div>
      </section>

      {/* ===== PRODUCT DETAIL ===== */}
      <section className="section" id="product-detail">
        <div className="container">
          <div className="sr-layout reveal">
            <SeriesRail
              category={cat}
              activeSeriesKey={s.series_key}
              activeSizeKey={sz.size_key}
              sizeHref={(series, size) => size.variants[0]?.href ?? `${series.href}#size-${size.size_key}`}
            />
            <div className="sr-layout__main">
              <div className="cat-detail">
                <div className="cat-detail__media-wrap reveal">
              <VariantGallery images={galleryImages} name={variant.display_name} />
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
              <div className="cat-detail__types">
                <span className="cat-detail__types-label">Other sizes in this series:</span>
                <span className="cat-detail__chip cat-detail__chip--current" aria-current="true">{fullSize}</span>
                {siblingSizes.map((sib) => (
                  <a key={sib.size_key} href={siblingSizeHref(sib)} className="cat-detail__chip">
                    {formatSize(s, sib.height)}
                  </a>
                ))}
              </div>
              <a href="#quote" className="btn btn-primary">Request a Quote</a>
            </div>
          </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SPECIFICATIONS ===== */}
      {specs.length > 0 && (
        <section className="section-warm" id="specs">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Specifications</p>
              <h2 className="display-700">{variant.display_name} technical specs</h2>
              <p>Key dimensions and properties for the {variant.model_code} model.</p>
            </div>
            <div className="specs-table-wrap reveal">
              <table className="specs-table">
                <thead>
                  <tr>
                    <th>Specification</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.card_image} alt={`${v.display_name} — ${v.model_code}`} width="480" height="300" loading="lazy" decoding="async" />
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