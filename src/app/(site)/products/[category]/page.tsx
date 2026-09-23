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
  getCategoryBySlug
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

export default async function CategoryPage({
  params
}: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

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

      {/* ===== SERIES LIST ===== */}
      <section className="section" id="series">
        <div className="container">
          <header className="section-header reveal">
            <p className="sec-index">Series in this range</p>
            <h2 className="display-700">Choose your {cat.name.toLowerCase()} series</h2>
            <p>Each series covers a single footprint — pick one to walk through the available heights and construction types.</p>
          </header>

          {cat.series.length > 0 ? (
            <div className="px-series-grid reveal">
              {cat.series.map((s, i) => {
                const footprint = formatFootprint(s);
                return (
                  <a href={s.href} className="px-series" key={s.series_key}>
                    <div className="px-series__media">
                      {s.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.image}
                          alt={`${s.name} — ${cat.name}`}
                          width="560"
                          height="400"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="px-series__placeholder">{footprint || s.name}</span>
                      )}
                    </div>
                    <div className="px-series__body">
                      <div className="px-series__topline">
                        <span className="px-series__index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                        <span className="px-series__label">{cat.name} Series</span>
                      </div>
                      <div className="px-series__title">
                        {footprint && <span className="px-series__dims">{footprint}</span>}
                        <span className="px-series__name">{s.name}</span>
                      </div>
                      {(s.short_description || s.description) && (
                        <p className="px-series__desc">{s.short_description || s.description}</p>
                      )}
                      <div className="px-series__meta">
                        <span className="pl-chip">{s.heights_count} {s.heights_count === 1 ? 'size' : 'sizes'}</span>
                        <span className="pl-chip">{s.models_count} {s.models_count === 1 ? 'model' : 'models'}</span>
                        {s.sizes.slice(0, 4).map((sz) => (
                          <span key={sz.size_key} className="pl-chip pl-chip-outline">{sz.height} mm</span>
                        ))}
                      </div>
                      <span className="px-series__cta">Explore Series <span aria-hidden="true">→</span></span>
                    </div>
                  </a>
                );
              })}
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