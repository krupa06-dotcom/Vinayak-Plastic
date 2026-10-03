import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/catalogue.css';
import BackButton from '@/components/BackButton';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
import {
  formatFootprint,
  getHierarchyCategoryPaths,
  getCategoryBySlug,
  type HierarchySeries
} from '@/lib/hierarchy';

export const dynamicParams = false;

export const generateStaticParams = getHierarchyCategoryPaths;

export async function generateMetadata({
  params
}: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return {};
  const description = cat.description || `Explore our ${cat.name} range from Vinayak Plastics.`;
  return {
    title: { absolute: `${cat.name} | Vinayak Plastics` },
    description: description.slice(0, 160),
    alternates: { canonical: cat.href },
    openGraph: {
      title: `${cat.name} | Vinayak Plastics`,
      description: description.slice(0, 160),
      url: cat.href,
      images: cat.image ? [{ url: cat.image, alt: `${cat.name} — Vinayak Plastics` }] : undefined
    }
  };
}

function SeriesCard({
  series,
  index,
  label,
  contextName
}: {
  series: HierarchySeries;
  index: number;
  label: string;
  contextName: string;
}) {
  const footprint = formatFootprint(series);
  return (
    <a href={series.href} className="px-series">
      <div className="px-series__media">
        {series.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={series.image}
            alt={`${series.name} — ${contextName}`}
            width="560"
            height="400"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="px-series__placeholder">{footprint || series.name}</span>
        )}
      </div>
      <div className="px-series__body">
        <div className="px-series__topline">
          <span className="px-series__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span className="px-series__label">{label}</span>
        </div>
        <div className="px-series__title">
          {footprint && <span className="px-series__dims">{footprint}</span>}
          <span className="px-series__name">{series.name}</span>
        </div>
        {(series.short_description || series.description) && (
          <p className="px-series__desc">{series.short_description || series.description}</p>
        )}
        <span className="px-series__cta">Explore Series <span aria-hidden="true">→</span></span>
      </div>
    </a>
  );
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  // Series sitting directly on the category (no product type assigned).
  const directSeries = cat.series.filter((s) => !s.sub_category_id);
  const directModels = directSeries.reduce((n, s) => n + s.models_count, 0);

  // For static export, show all product types
  const visibleTypes = cat.sub_categories.filter((sc) => sc.series.length > 0);

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className={`page-hero${cat.image ? ' page-hero--split' : ''}`}>
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb">
              <a href="/">Home</a> / <a href="/products">Products</a> / {cat.name}
            </p>
            <BackButton href="/products" />
          </div>
          <div className="page-hero__grid">
            <div className="page-hero__text">
              <h1 className="display-800">{cat.name}</h1>
              {cat.description && <p>{cat.description}</p>}
            </div>
            {cat.image && (
              <div className="page-hero__media" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cat.image} alt="" width="560" height="360" decoding="async" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== SERIES LIST & PRODUCT TYPES ===== */}
      <section className="section" id="series">
        <div className="container">
          <header className="section-header reveal">
            <p className="sec-index">Catalogue Hierarchy</p>
            <h2 className="display-700">Choose your {cat.name.toLowerCase()} series</h2>
            <p>Each series covers a single footprint — pick one to walk through the available heights and construction types.</p>
          </header>

          {visibleTypes.length > 0 || directSeries.length > 0 ? (
            <div className="cat-subcategories-wrap">
              {visibleTypes.map((subCat) => (
                <div key={subCat.id} id={`type-${subCat.slug}`} className="cat-subtype-section" style={{ marginBottom: 48, scrollMarginTop: 90 }}>
                  <div className="reveal" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--orange, #e8630c)', fontWeight: 700 }} aria-hidden="true">&#8627;</span>
                      <h3 className="display-600" style={{ margin: 0 }}>{subCat.name}</h3>
                      <span className="pl-chip pl-chip-outline">{subCat.series.length} series</span>
                      <span className="pl-chip">{subCat.models_count} {subCat.models_count === 1 ? 'model' : 'models'}</span>
                    </div>
                    {subCat.description && (
                      <p style={{ margin: '6px 0 0', color: 'var(--color-muted, #5b6472)', fontSize: '0.95rem' }}>{subCat.description}</p>
                    )}
                  </div>

                  <div className="px-series-grid reveal">
                    {subCat.series.map((s, i) => (
                      <SeriesCard
                        key={s.series_key}
                        series={s}
                        index={i}
                        label={subCat.name}
                        contextName={subCat.name}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {directSeries.length > 0 && (
                <div id="direct-series" className="cat-subtype-section" style={{ marginBottom: 48, scrollMarginTop: 90 }}>
                  <div className="reveal" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--orange, #e8630c)', fontWeight: 700 }} aria-hidden="true">&#8627;</span>
                      <span className="pl-chip pl-chip-outline">{directSeries.length} series</span>
                      <span className="pl-chip">{directModels} {directModels === 1 ? 'model' : 'models'}</span>
                    </div>
                  </div>

                  <div className="px-series-grid reveal">
                    {directSeries.map((s, i) => (
                      <SeriesCard
                        key={s.series_key}
                        series={s}
                        index={i}
                        label={`${cat.name} Series`}
                        contextName={cat.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state reveal">
              <h3>{cat.name} — series coming soon</h3>
              <p>
                We are currently updating this range. Please check back shortly or{' '}
                <a href="/contact">contact us</a> for the latest availability.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label="Get a quote">
        <div className="container reveal">
          <h2 className="display-700">Need {cat.name.toLowerCase()} specs or pricing?</h2>
          <p>Call or WhatsApp us directly for dimensions, material grades, and dispatch timelines.</p>
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
          { name: cat.name }
        ]}
      />
    </main>
  );
}