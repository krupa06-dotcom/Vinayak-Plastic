import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/catalogue.css';
import BackButton from '@/components/BackButton';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import { CONTACT } from '@/lib/contact';
import { SITE_URL } from '@/lib/site';
import {
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

function seriesMeta(heights: number, models: number): string {
  const parts: string[] = [];
  if (heights > 0) parts.push(`${heights} ${heights === 1 ? 'height' : 'heights'}`);
  if (models > 0) parts.push(`${models} ${models === 1 ? 'model' : 'models'}`);
  return parts.join(' · ') || 'Range on request';
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
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb">
              <a href="/">Home</a> / <a href="/products">Products</a> / {cat.name}
            </p>
            <BackButton href="/products" />
          </div>
          <h1 className="display-800">{cat.name}</h1>
          {cat.description && <p>{cat.description}</p>}
        </div>
      </section>

      {/* ===== SERIES LIST ===== */}
      <section className="section" id="series">
        <div className="container">
          <header className="section-header reveal">
            <p className="sec-index">Series in this range</p>
            <h2 className="display-700">Choose a {cat.name} series</h2>
            <p>Each series covers a footprint — pick one to see the available heights and models inside.</p>
          </header>

          {cat.series.length > 0 ? (
            <div className="sc-grid reveal">
              {cat.series.map((s) => (
                <a href={s.href} className="sc-card" key={s.series_key}>
                  <div className="sc-card__img sc-card__img--light">
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.image}
                        alt={`${s.name} — ${cat.name}`}
                        width="480"
                        height="300"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="sc-card__placeholder">{s.name}</span>
                    )}
                  </div>
                  <div className="sc-card__body">
                    <h3>{s.name}</h3>
                    {(s.short_description || s.description) && (
                      <p>{s.short_description || s.description}</p>
                    )}
                    <div className="sc-card__meta">
                      <span className="sc-card__count">{seriesMeta(s.heights_count, s.models_count)}</span>
                      <span className="sc-card__cta">View Series <span aria-hidden="true">→</span></span>
                    </div>
                  </div>
                </a>
              ))}
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