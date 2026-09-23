import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/category.css';
import '@/styles/subcategory.css';
import '@/styles/catalogue.css';
import BackButton from '@/components/BackButton';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import SeriesConfigurator, { type ConfigSize } from '@/components/SeriesConfigurator';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
import {
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
  const siblings = cat.series.filter((x) => x.series_key !== s.series_key);

  const sizes: ConfigSize[] = s.sizes.map((sz) => ({
    sizeKey: sz.size_key,
    label: sz.label,
    height: sz.height,
    versions: sz.variants.map((v) => ({
      versionKey: v.version_key,
      displayName: v.display_name,
      modelCode: v.model_code,
      image: v.card_image,
      description: v.description,
      href: v.href
    }))
  }));

  const stats = [
    { value: String(s.heights_count), label: s.heights_count === 1 ? 'Height' : 'Heights' },
    { value: String(s.models_count), label: s.models_count === 1 ? 'Model' : 'Models' }
  ];

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

      {/* ===== SERIES INTRO ===== */}
      {s.heights_count > 0 && (
        <section className="section" id="series-intro">
          <div className="container">
            <div className="cat-detail">
              <div className="cat-detail__media-wrap reveal">
                <div className="cat-detail__media">
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.image}
                      alt={`${s.name} — ${cat.name}`}
                      width="800"
                      height="600"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <span className="cat-detail__placeholder">{s.name}</span>
                  )}
                </div>
              </div>
              <div className="cat-detail__body reveal">
                <span className="sec-index">Series · {cat.name}</span>
                <h2 className="display-700">{s.name}</h2>
                <p>{s.description || description || `${s.name} from the ${cat.name} range, manufactured in industrial-grade polymer.`}</p>
                {stats.length > 0 && (
                  <div className="cat-detail__stats">
                    {stats.map((stat) => (
                      <div className="cat-detail__stat" key={stat.label}>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="cat-detail__types">
                  <span className="cat-detail__types-label">Footprint:</span>
                  <span className="cat-detail__chip">{s.series_key} mm</span>
                  {s.product_code && (
                    <span className="cat-detail__chip">{s.product_code}</span>
                  )}
                </div>
                <a href="#config" className="btn btn-primary">Choose Height &amp; Version</a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== HEIGHT CHOOSER + VERSIONS ===== */}
      <section className="section-warm" id="config">
        <div className="container">
          <header className="section-header reveal">
            <p className="sec-index">Available Heights</p>
            <h2 className="display-700">Choose a height, then pick your model</h2>
            <p>Switch between heights to see the models available at each size — every selection is live, no filters needed.</p>
          </header>
          {sizes.length > 0 ? (
            <SeriesConfigurator sizes={sizes} />
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

      {/* ===== OTHER SERIES IN THIS RANGE ===== */}
      {siblings.length > 0 && (
        <section className="section section-warm" id="other-series">
          <div className="container">
            <div className="section-header reveal">
              <p className="sec-index">More from this range</p>
              <h2 className="display-700">Other {cat.name} series</h2>
              <p>Other footprints within the {cat.name.toLowerCase()} family.</p>
            </div>
            <div className="sc-grid reveal">
              {siblings.map((x) => (
                <a href={x.href} className="sc-card" key={x.series_key}>
                  <div className="sc-card__img sc-card__img--light">
                    {x.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={x.image} alt={`${x.name} — ${cat.name}`} width="480" height="300" loading="lazy" decoding="async" />
                    ) : (
                      <span className="sc-card__placeholder">{x.name}</span>
                    )}
                  </div>
                  <div className="sc-card__body">
                    <h3>{x.name}</h3>
                    <div className="sc-card__meta">
                      <span className="sc-card__count">{x.series_key}</span>
                      <span className="sc-card__cta">View Series <span aria-hidden="true">→</span></span>
                    </div>
                  </div>
                </a>
              ))}
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