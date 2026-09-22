import type { Metadata } from 'next';
import '@/styles/home.css';
import Hero from '@/components/Hero';
import warehouseInterior from '@/assets/images/warehouse-interior.webp';
import { CONTACT } from '@/lib/contact';
import { getCatalogueData, getSiteSetting, resolveFirstImage } from '@/lib/db';

export const metadata: Metadata = {
  title: { absolute: 'Vinayak Plastics — Material Handling & Packaging Products' },
  description:
    'Vinayak Plastics manufactures and supplies plastic crates, plastic pallets, waste bins / dustbins and hand pallet trucks. Industrial-grade HDPE & PP material handling equipment across India.'
};

export const dynamicParams = false;

export default async function HomePage() {
  const catalogue = await getCatalogueData();

  const homepageSetting = await getSiteSetting('homepage') as Record<string, string> | null;
  const featuredTagline =
    homepageSetting?.featured_tagline ||
    'HDPE and PP material handling and packaging equipment for warehouses, dairy distributors, and municipal buyers across India.';

  // "What We Make": 6 cards, all data from the database — the first 4 are the
  // categories (by display order) and the last 2 are the top products
  // (sub-categories flagged as featured in the admin panel). Images are the
  // admin-controlled DB image URLs (sub_categories.image_url / categories.image_url).
  const activeCategories = catalogue.categories
    .filter((c) => c.is_active !== false)
    .sort((a, b) => a.display_order - b.display_order);

  const categoryCards = activeCategories.slice(0, 4).map((cat) => ({
    name: cat.name,
    desc: cat.description ?? '',
    slug: `/categories/${cat.slug}`,
    alt: cat.name,
    image: resolveFirstImage(cat.image_url, cat.images[0]?.image_url)
  }));

  // Category main images — fallback for product cards that have no own image.
  const categoryImageBySlug = new Map(activeCategories.map((cat) => [cat.slug, cat.image_url]));

  const categoryNames = new Set(categoryCards.map((c) => c.name.toLowerCase()).filter(Boolean));

  const topProducts = catalogue.subCategories
    .filter((s) => s.is_active !== false && s.is_featured && s.category_slug && !categoryNames.has((s.name || '').toLowerCase()))
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 2)
    .map((p) => ({
      name: p.name,
      desc: p.short_description ?? p.description ?? '',
      slug: `/categories/${p.category_slug}/${p.slug}`,
      alt: p.name,
      image: resolveFirstImage(p.image_url, p.images[0]?.image_url, categoryImageBySlug.get(p.category_slug))
    }));

  // Top up to 2 products with the earliest sub-categories when the admin has not
  // flagged enough products as featured, so the section still fills to six cards.
  if (topProducts.length < 2) {
    const used = new Set([...categoryCards.map((c) => c.slug), ...topProducts.map((p) => p.slug)]);
    for (const s of catalogue.subCategories) {
      if (topProducts.length >= 2) break;
      const slug = s.category_slug ? `/categories/${s.category_slug}/${s.slug}` : '';
      if (!slug || used.has(slug) || s.is_active === false) continue;
      used.add(slug);
      topProducts.push({
        name: s.name,
        desc: s.short_description ?? s.description ?? '',
        slug,
        alt: s.name,
        image: resolveFirstImage(s.image_url, s.images[0]?.image_url, categoryImageBySlug.get(s.category_slug))
      });
    }
  }

  const products = [...categoryCards, ...topProducts];

  const applications = [
    { name: 'Warehousing', desc: 'Storage, racking and internal material movement — crates, pallets and pallet trucks.', icon: 'warehouse' },
    { name: 'Manufacturing', desc: 'Work-in-process handling, parts storage and finished-goods staging.', icon: 'factory' },
    { name: 'Logistics', desc: 'Palletized freight, cross-docking and last-mile delivery equipment.', icon: 'truck' },
    { name: 'Municipal', desc: 'Dairy transport, cold-storage crates and commercial waste-collection bins.', icon: 'building' }
  ];

  const reasons = [
    { label: 'HDPE / PP Construction', text: 'Molded from HDPE and PP copolymer for impact resistance, UV stability and long service life in demanding industrial environments.' },
    { label: 'Custom Sizing & Colour', text: 'Production to specific size and colour requirements for warehouse rack fit, branding or municipal contract specifications.' },
    { label: 'Complete Product Range', text: 'One source for crates, pallets, waste bins and hand pallet trucks — serving warehouses, dairy and municipal buyers.' },
    { label: 'Pan-India Dispatch', text: 'Direct enquiry to dispatch — pricing, spec sheets and timelines handled in a single call, with no distributor layers.' }
  ];

  return (
    <main id="main">
      <Hero />

      {/* TRUST BAR */}
      <section className="trustbar" aria-label="Company highlights">
        <div className="container">
          <div className="trustbar__grid">
            <div className="trustbar__item">
              <span className="trustbar__num">25+</span>
              <span className="trustbar__label">Years in Business</span>
            </div>
            <div className="trustbar__divider" aria-hidden="true"></div>
            <div className="trustbar__item">
              <span className="trustbar__num">500+</span>
              <span className="trustbar__label">Clients Served</span>
            </div>
            <div className="trustbar__divider" aria-hidden="true"></div>
            <div className="trustbar__item">
              <span className="trustbar__num">4</span>
              <span className="trustbar__label">Product Categories</span>
            </div>
            <div className="trustbar__divider" aria-hidden="true"></div>
            <div className="trustbar__item">
              <span className="trustbar__num">Pan-India</span>
              <span className="trustbar__label">Delivery Network</span>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-home" id="about" aria-label="About Vinayak Plastics">
        <div className="container">
          <div className="about-home__grid">
            <div className="about-home__media reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={warehouseInterior.src} alt="Spacious warehouse with organized storage and material handling" width={1125} height={750} loading="lazy" />
            </div>
            <div className="about-home__body reveal">
              <p className="sec-index">About Us</p>
              <h2 className="about-home__title">Trusted manufacturer &amp; supplier of <span className="text-orange">industrial plastic products</span></h2>
              <p className="about-home__text">Vinayak Plastics is a business house engaged in the manufacture and supply of all types of material handling and packaging products. From plastic crates and pallets to waste bins and hand pallet trucks — we serve warehouses, dairy distributors, municipal buyers and manufacturing facilities across India.</p>
              <p className="about-home__text">Our commitment to quality materials, competitive pricing and direct-to-buyer service has made us a trusted partner for businesses that depend on reliable equipment every day.</p>
              <a href="/about" className="btn btn-ghost">Learn More About Us</a>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="products-home" id="products" aria-label="Our Products">
        <div className="container">
          <header className="products-home__head reveal">
            <p className="sec-index">What We Make</p>
            <h2 className="products-home__title">Industrial products built for <span className="text-orange">everyday operations.</span></h2>
            <p className="products-home__sub">{featuredTagline}</p>
          </header>

          <div className="products-home__grid">
            {products.map((p) => {
              const dbImg = p.image;
              return (
                <article className="ph-card reveal" key={p.slug}>
                  <a href={p.slug} className="ph-card__link">
                    <div className="ph-card__img">
                      {dbImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dbImg} alt={p.alt} width={600} height={450} loading="lazy" decoding="async" />
                      ) : (
                        <span className="ph-card__placeholder">{p.name}</span>
                      )}
                    </div>
                    <div className="ph-card__body">
                      <h3 className="ph-card__name">{p.name}</h3>
                      <p className="ph-card__desc">{p.desc}</p>
                      <span className="ph-card__cta">View Details <span aria-hidden="true">→</span></span>
                    </div>
                  </a>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* APPLICATIONS */}
      <section className="apps-home" id="applications" aria-label="Applications">
        <div className="container">
          <header className="apps-home__head reveal">
            <p className="sec-index">Applications</p>
            <h2 className="apps-home__title">Where Vinayak products <span className="text-orange">do the work.</span></h2>
          </header>

          <div className="apps-home__grid">
            {applications.map((a) => (
              <article className="ap-card reveal" key={a.name}>
                <div className="ap-card__icon" aria-hidden="true">
                  {a.icon === 'warehouse' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/><path d="M3 21h18"/></svg>
                  )}
                  {a.icon === 'factory' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"/><path d="M5 20V8l5 4V8l5 4V4h3v16"/></svg>
                  )}
                  {a.icon === 'truck' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  )}
                  {a.icon === 'building' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01"/></svg>
                  )}
                </div>
                <h3 className="ap-card__name">{a.name}</h3>
                <p className="ap-card__desc">{a.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="why-home" id="why-us" aria-label="Why choose Vinayak Plastics">
        <div className="container">
          <div className="why-home__grid">
            <div className="why-home__intro reveal">
              <p className="sec-index">Why Vinayak?</p>
              <h2 className="why-home__title">Reliable plastic solutions for demanding <span className="text-orange">industrial environments.</span></h2>
              <p className="why-home__sub">A business house engaged in the supply of all types of material handling and packaging products — direct enquiry, no layers.</p>
              <a href="/contact" className="btn btn-primary">Get a Quote</a>
            </div>

            <div className="why-home__features">
              {reasons.map((r) => (
                <article className="wf-card reveal" key={r.label}>
                  <div className="wf-card__check" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  </div>
                  <div>
                    <h3 className="wf-card__label">{r.label}</h3>
                    <p className="wf-card__text">{r.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-banner" aria-label="Get a quote">
        <div className="container reveal">
          <h2 className="display-700">Need the right product<br/>for your <span className="text-orange">operation?</span></h2>
          <p>Let&apos;s discuss your requirement — product, quantity, dimensions and dispatch timeline. Call or WhatsApp us directly.</p>
          <div className="cta-buttons">
            <a href="/contact" className="btn btn-primary">Get a Quote</a>
            <a href={CONTACT.whatsappHref} className="btn btn-secondary" target="_blank" rel="noopener">WhatsApp Us</a>
            <a href={CONTACT.phoneHref} className="btn btn-outline-light">Call {CONTACT.phoneDisplay}</a>
          </div>
        </div>
      </section>
    </main>
  );
}