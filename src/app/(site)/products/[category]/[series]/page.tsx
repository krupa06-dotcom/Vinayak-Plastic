import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/category.css';
import '@/styles/subcategory.css';
import '@/styles/catalogue.css';
import BackButton from '@/components/BackButton';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import SeriesRail from '@/components/SeriesRail';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
import {
  formatFootprint,
  formatSize,
  getHierarchySeriesPaths,
  getSeriesByKey,
  normalizeApplications
} from '@/lib/hierarchy';

export const dynamicParams = false;

export const generateStaticParams = getHierarchySeriesPaths;

export async function generateMetadata({
  params
}: { params: Promise<{ category: string; series: string }> }): Promise<Metadata> {
  const { category, series } = await params;
  const ctx = await getSeriesByKey(category, series);
  if (!ctx) return {};
  const text = ctx.series.short_description || ctx.series.description || `Explore the ${ctx.series.name} series from Vinayak Plastics.`;
  return {
    title: { absolute: `${ctx.series.name} | Vinayak Plastics` },
    description: text.slice(0, 160),
    alternates: { canonical: ctx.series.href },
    openGraph: {
      title: `${ctx.series.name} | Vinayak Plastics`,
      description: text.slice(0, 160),
      url: ctx.series.href,
      images: ctx.series.image
        ? [{ url: ctx.series.image, alt: `${ctx.series.name} — ${ctx.series.category_name}` }]
        : undefined
    }
  };
}

export default async function SeriesPage({
  params
}: { params: Promise<{ category: string; series: string }> }) {
  const { category, series } = await params;
  const ctx = await getSeriesByKey(category, series);
  if (!ctx) notFound();

  const { category: cat, series: s } = ctx;
  const features = (s.features || []).filter(Boolean);
  const applications = normalizeApplications(s.applications);
  const description = s.short_description || s.description;

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb">
              <a href="/">Home</a> / <a href="/products">Products</a> /{' '}
              <a href={cat.href}>{cat.name}</a> / {s.name}
            </p>
            <BackButton href={cat.href} />
          </div>
          <h1 className="display-800">{s.name}</h1>
          {description && <p>{description}</p>}
        </div>
      </section>

      {/* ===== SERIES SPEC TABLE ===== */}
      <section className="section" id="series-specs">
        <div className="container">
          <div className="sr-layout">
            <SeriesRail category={cat} activeSeriesKey={s.series_key} />
            <div className="sr-layout__main">
              <header className="section-header reveal" style={{ textAlign: 'left' }}>
                <p className="sec-index">Series Specification</p>
                <h2 className="display-700">
                  {s.name} — complete size range
                </h2>
                <p>
                  All standard heights for the {formatFootprint(s) || s.name} footprint with model codes,
                  external dimensions and load capacity at a glance.
                </p>
              </header>

              {s.sizes.length > 0 ? (
                <div className="st-catalog reveal">
                  {s.sizes.flatMap((sz) =>
                    sz.variants.map((v) => (
                      <a key={`${sz.size_key}-${v.version_key}`} href={v.href} className="px-version">
                        <div className="px-version__img">
                          {v.card_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={v.card_image} alt={`${v.display_name} — ${v.model_code}`} width="480" height="300" loading="lazy" decoding="async" />
                          ) : (
                            <span className="px-version__placeholder">{v.model_code}</span>
                          )}
                        </div>
                        <div className="px-version__body">
                          <span className="px-version__code">{v.model_code}</span>
                          <h3 className="px-version__name">{v.display_name}</h3>
                          <span className="px-version__dims">
                            {v.outer_length ?? s.base_length} × {v.outer_width ?? s.base_width} × {v.outer_height ?? sz.height} mm
                          </span>
                          {v.load_capacity && <span className="st-catalog__load">{v.load_capacity}</span>}
                          {v.version_code && v.version_code !== v.display_name && (
                            <span className="st-catalog__ver">{v.version_code}</span>
                          )}
                          <div className="px-version__foot">
                            <span className="px-version__cta">View Details <span aria-hidden="true">→</span></span>
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              ) : (
                <div className="empty-state reveal">
                  <h3>No sizes available yet</h3>
                  <p>
                    We are finalising the dimensions for this series. <a href="/contact">Contact us</a> to
                    check availability.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES & APPLICATIONS ===== */}
      {(features.length > 0 || applications.length > 0) && (
        <section className="section-warm" id="features">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">Features &amp; Applications</p>
              <h2 className="display-700">Why choose {s.name}</h2>
              <p>Key product features and the sectors where this series is used every day.</p>
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

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label="Get a quote">
        <div className="container reveal">
          <h2 className="display-700">Need {s.name.toLowerCase()} specs or pricing?</h2>
          <p>Call or WhatsApp us directly for detailed dimensions, material grades, and dispatch timelines.</p>
          <div className="cta-buttons">
            <a href={CONTACT.phoneHref} className="btn btn-primary">Call {CONTACT.phoneDisplay}</a>
            <a href={CONTACT.whatsappHref} className="btn btn-secondary" target="_blank" rel="noopener">WhatsApp Us</a>
          </div>
        </div>
      </section>

      <BreadcrumbSchema
        crumbs={[
          { name: 'Home', item: `${SITE_URL}/` },
          { name: 'Products', item: `${SITE_URL}/products` },
          { name: cat.name, item: `${SITE_URL}${cat.href}` },
          { name: s.name }
        ]}
      />
    </main>
  );
}