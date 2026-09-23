import type { Metadata } from 'next';
import '@/styles/about.css';
import BackButton from '@/components/BackButton';
import warehouseInterior from '@/assets/images/warehouse-interior.webp';
import { CONTACT } from '@/lib/contact';
import { getCatalogueData, getSiteSetting, resolveFirstImage } from '@/lib/db';

export const metadata: Metadata = {
  title: { absolute: 'About Vinayak Plastics | Material Handling & Packaging' },
  description:
    'About Vinayak Plastics — business house supplying material handling & packaging products — plastic crates, pallets, waste bins and hand pallet trucks — to warehouses, dairy and municipal buyers across India.'
};

export const dynamicParams = false;

export default async function AboutPage() {
  const catalogue = await getCatalogueData();

  const aboutSetting = await getSiteSetting('about') as Record<string, unknown> | null;
  const aboutDescription =
    (aboutSetting?.description as string | undefined) ||
    'Vinayak Plastics is a business house engaged in the supply of all types of material handling and packaging products. We specialize in plastic crates, pallets, waste bins, hand pallet trucks, ice boxes, storage bins, and racking systems serving warehouses, dairy distributors, municipal corporations, and commercial buyers across India.';
  const mission = (aboutSetting?.mission as string | null) ?? null;
  const vision = (aboutSetting?.vision as string | null) ?? null;
  const whyChooseUs: string[] = Array.isArray(aboutSetting?.why_choose_us)
    ? (aboutSetting.why_choose_us as unknown[]).filter((x): x is string =>
        typeof x === 'string' && Boolean(x.trim())
      )
    : [];

  const stats = [
    { num: '25+', label: 'Years in Business' },
    { num: '500+', label: 'Clients Served' },
    { num: '6+', label: 'Product Categories' },
    { num: 'Pan-India', label: 'Dispatch Network' }
  ];

  const values = [
    {
      label: 'Quality Materials',
      text: 'Products molded from HDPE and PP grades — impact resistant, UV stabilized, and built for long service life in demanding industrial environments.'
    },
    {
      label: 'Direct & Transparent',
      text: 'No distributor layers, no automated systems. Every enquiry is handled by a person who knows the product, specification, and dispatch timelines.'
    },
    {
      label: 'Custom Capability',
      text: 'We work with buyers to deliver specific sizes, colors, and load-bearing requirements to match warehouse racking and contract specifications.'
    },
    {
      label: 'Pan-India Reach',
      text: 'From a single enquiry to dispatch — pricing, spec sheets, and timelines coordinated in one call, serving buyers across the country.'
    }
  ];

  // Product range cards use images managed by the admin in the database
  // (categories.image_url / category_images). No project-folder photos.
  const aboutRanges = ['plastic-crates', 'plastic-pallets', 'waste-bins', 'hand-pallet-trucks'];
  const products = aboutRanges.map((slug) => {
    const cat = catalogue.categories.find((c) => c.slug === slug);
    const image = resolveFirstImage(cat?.image_url, cat?.images[0]?.image_url);
    return {
      img: image,
      alt: cat ? `${cat.name} — Vinayak Plastics` : '',
      name: cat?.name ?? slug.replace(/-/g, ' '),
      href: cat ? `/products/${cat.slug}` : '/products'
    };
  });

  const process = [
    { step: '01', title: 'Enquire', text: 'Call or WhatsApp with your product, quantity, and specification requirements.' },
    { step: '02', title: 'Quote', text: 'Receive pricing, dimension sheets, and dispatch timelines directly from our team.' },
    { step: '03', title: 'Supply', text: 'We coordinate manufacture or sourcing and dispatch to your location across India.' },
    { step: '04', title: 'Support', text: 'Ongoing support for repeat orders, service, and custom product development.' }
  ];

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="about-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / About Us</p>
            <BackButton href="/" />
          </div>
          <h1 className="about-hero__title">Industrial materials, handled <span className="text-orange">right.</span></h1>
          <p className="about-hero__sub">Vinayak Plastics supplies material handling and packaging products that keep warehouses, dairy plants, and municipalities running — durable, dependable, and backed by direct service.</p>
          <div className="about-hero__actions">
            <a href="/products" className="btn btn-primary">Explore Our Products</a>
            <a href="/contact" className="btn btn-outline-light">Get a Quote</a>
          </div>
        </div>
      </section>

      {/* ===== WHO WE ARE ===== */}
      <section className="about-who">
        <div className="container">
          <div className="about-who__grid">
            <div className="about-who__media reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={warehouseInterior.src} alt="Spacious warehouse with organized storage and material handling equipment" width={1125} height={750} loading="lazy" />
            </div>
            <div className="about-who__body reveal">
              <p className="sec-index">Who We Are</p>
              <h2 className="about-who__title">A business house built on <span className="text-orange">reliable supply</span></h2>
              <p className="about-who__text">{aboutDescription}</p>
              {mission && (
                <p className="about-who__text"><strong style={{ display: 'block', fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--deep-navy)', marginBottom: 4, fontSize: '.95rem' }}>Our Mission</strong>{mission}</p>
              )}
              {vision && (
                <p className="about-who__text"><strong style={{ display: 'block', fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--deep-navy)', marginBottom: 4, fontSize: '.95rem' }}>Our Vision</strong>{vision}</p>
              )}
              {whyChooseUs.length > 0 && (
                <ul className="about-who__list">
                  {whyChooseUs.map((point, i) => (
                    <li className="about-who__point" key={i}>{point}</li>
                  ))}
                </ul>
              )}
              <a href="/products" className="btn btn-ghost">See Our Full Product Range</a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="about-stats-band">
        <div className="container">
          <div className="about-stats-grid">
            {stats.map((s) => (
              <div className="about-stat reveal" key={s.label}>
                <div className="about-stat__num">{s.num}</div>
                <div className="about-stat__label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VALUES ===== */}
      <section className="about-values">
        <div className="container-sm">
          <div className="section-header reveal">
            <p className="sec-index">What We Stand For</p>
            <h2 className="display-700">The Vinayak difference</h2>
            <p>Four principles guide how we work — from the first enquiry to every repeat order.</p>
          </div>
          <div className="about-values__grid">
            {values.map((v) => (
              <article className="about-value reveal" key={v.label}>
                <div className="about-value__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h3 className="about-value__label">{v.label}</h3>
                <p className="about-value__text">{v.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCT RANGE ===== */}
      <section className="about-range">
        <div className="container">
          <div className="section-header reveal">
            <p className="sec-index">Our Range</p>
            <h2 className="display-700">Everything for material handling, <span className="text-orange">under one roof</span></h2>
            <p>From plastic crates for dairy and bakery storage to industrial pallets for warehouse racking — we cover the full spectrum of material handling needs.</p>
          </div>
          <div className="about-range__grid">
            {products.map((p) => (
              <a href={p.href} className="about-range__card reveal" key={p.name}>
                <div className="about-range__img">
                  {p.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.img} alt={p.alt} width={600} height={450} loading="lazy" decoding="async" />
                  ) : (
                    <span className="about-range__placeholder">{p.name}</span>
                  )}
                </div>
                <div className="about-range__body">
                  <h3>{p.name}</h3>
                  <span>View Range <span aria-hidden="true">→</span></span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROCESS ===== */}
      <section className="about-process">
        <div className="container">
          <div className="section-header reveal">
            <p className="sec-index">How We Work</p>
            <h2 className="display-700">A simple, direct process</h2>
            <p>From enquiry to dispatch — no layers, no delays, no automated runaround.</p>
          </div>
          <div className="about-process__grid">
            {process.map((p, i) => (
              <div className="about-step reveal" key={p.step}>
                <div className="about-step__num">{p.step}</div>
                <h3 className="about-step__title">{p.title}</h3>
                <p className="about-step__text">{p.text}</p>
                {i < process.length - 1 && <div className="about-step__arrow" aria-hidden="true">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label="Get in touch">
        <div className="container reveal">
          <h2 className="display-700">Discuss Your Requirements</h2>
          <p>Call or WhatsApp us for pricing, product specifications, and dispatch timelines.</p>
          <div className="cta-buttons">
            <a href={CONTACT.phoneHref} className="btn btn-primary">Call {CONTACT.phoneDisplay}</a>
            <a href={CONTACT.whatsappHref} className="btn btn-secondary" target="_blank" rel="noopener">WhatsApp Us</a>
          </div>
        </div>
      </section>
    </main>
  );
}