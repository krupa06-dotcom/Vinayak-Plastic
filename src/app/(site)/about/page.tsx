import type { Metadata } from 'next';
import '@/styles/about.css';
import BackButton from '@/components/BackButton';
import SafeImage from '@/components/SafeImage';
import warehouseInterior from '@/assets/images/warehouse-interior.webp';
import { getCatalogueData, getSiteSetting, getSiteImage, resolveFirstImage } from '@/lib/db';

export const metadata: Metadata = {
  title: { absolute: 'About Vinayak Plastics | Material Handling & Packaging' },
  description:
    'About Vinayak Plastics — material handling and packaging supplier — plastic crates, pallets, waste bins and hand pallet trucks — serving warehouses, dairy and municipal buyers across India.'
};

export const revalidate = 3600;

const DEFAULT_ABOUT_DESCRIPTION =
  'Vinayak Plastics is a Vadodara-based material handling and packaging supplier, working directly with procurement teams since 2020. We keep supply practical — the right product, the right specification, and a dispatch timeline you can plan around.';

/** Template copy contains bracketed placeholders like "[Company Name]". */
function isTemplateCopy(text: string): boolean {
  return /\[[^\]]+\]/.test(text);
}

export default async function AboutPage() {
  const catalogue = await getCatalogueData();
  const warehouseImage = await getSiteImage('warehouse');

  const aboutSetting = await getSiteSetting('about') as Record<string, unknown> | null;
  const storedDescription = (aboutSetting?.description as string | undefined)?.trim();
  const aboutDescription =
    storedDescription && !isTemplateCopy(storedDescription)
      ? storedDescription
      : DEFAULT_ABOUT_DESCRIPTION;

  // Highlights are derived from the live catalogue so the numbers stay accurate.
  const categoryCount = catalogue.categories.length;
  const rangeCount = catalogue.subCategories.length;
  const modelCount = catalogue.categories.reduce(
    (sum, category) => sum + category.variants_count + category.variants.length,
    0
  );

  const stats = [
    { num: '2020', label: 'Established' },
    { num: String(categoryCount), label: 'Product Categories' },
    { num: String(rangeCount), label: 'Product Ranges' },
    { num: `${modelCount}`, label: 'Models & Sizes' }
  ];

  const values = [
    {
      label: 'Quality Products',
      text: 'Molded from HDPE and PP grades — impact resistant, UV stabilized, and selected for daily industrial use.',
      icon: (
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </>
      )
    },
    {
      label: 'Business-Focused Solutions',
      text: 'Sizes, colors, and load ratings matched to your racking, contract, or tender specifications.',
      icon: (
        <>
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </>
      )
    },
    {
      label: 'Reliable Supply',
      text: 'Stock and sourcing coordinated around your dispatch dates, with timelines confirmed before you commit.',
      icon: (
        <>
          <path d="M1 5h13v10H1z" />
          <path d="M14 8h4l3 3v4h-7z" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </>
      )
    },
    {
      label: 'Customer Support',
      text: 'One point of contact for pricing, spec sheets, order status, and repeat requirements.',
      icon: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
    { step: '01', title: 'Enquire', text: 'Call or WhatsApp with your product, quantity, and delivery location.' },
    { step: '02', title: 'Get a Quote', text: 'Receive pricing, dimensions, and a confirmed dispatch date in writing.' },
    { step: '03', title: 'Product Supply', text: 'We confirm stock or sourcing and dispatch to your location across India.' },
    { step: '04', title: 'Support', text: 'Ongoing help with repeat orders, replacements, and new requirements.' }
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
          <p className="about-hero__sub">Durable material handling and packaging products for warehouses, dairy plants, and municipal operations across India.</p>
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
              <SafeImage
                src={warehouseImage || warehouseInterior.src}
                fallbackSrc={warehouseInterior.src}
                alt="Spacious warehouse with organized storage and material handling"
                width={1125}
                height={750}
                loading="lazy"
              />
            </div>
            <div className="about-who__body reveal">
              <p className="sec-index">Who We Are</p>
              <h2 className="about-who__title">Reliable supply for <span className="text-orange">industrial operations</span></h2>
              <p className="about-who__text">{aboutDescription}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMPANY HIGHLIGHTS ===== */}
      <section className="about-stats-band" aria-label="Company highlights">
        <div className="container">
          <h2 className="sr-only">Company Highlights</h2>
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

      {/* ===== WHAT WE STAND FOR ===== */}
      <section className="about-values">
        <div className="container-sm">
          <div className="section-header reveal">
            <p className="sec-index">What We Stand For</p>
            <h2 className="display-700">The Vinayak standard</h2>
            <p>What guides every enquiry, order, and dispatch.</p>
          </div>
          <div className="about-values__grid">
            {values.map((v) => (
              <article className="about-value reveal" key={v.label}>
                <div className="about-value__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{v.icon}</svg>
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
            <p className="sec-index">Our Product Range</p>
            <h2 className="display-700">Everything for material handling, <span className="text-orange">under one roof</span></h2>
            <p>Core categories with the sizes and models warehouses, dairy plants, and municipal buyers ask for.</p>
          </div>
          <div className="about-range__grid">
            {products.map((p) => (
              <a href={p.href} className="about-range__card reveal" key={p.name}>
                <div className="about-range__img">
                  {p.img ? (
                    <SafeImage src={p.img} alt={p.alt} width={600} height={450} loading="lazy" decoding="async" />
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

      {/* ===== FINAL CTA ===== */}
      <section className="cta-banner" aria-label="Contact Vinayak Plastics">
        <div className="container reveal">
          <h2 className="display-700">Discuss Your Requirements</h2>
          <p>Tell us the product, quantity, and delivery location. We'll take it from there.</p>
          <div className="cta-buttons">
            <a href="/contact" className="btn btn-primary">Contact Us</a>
            <a href="/products" className="btn btn-secondary">Explore Products</a>
          </div>
        </div>
      </section>
    </main>
  );
}