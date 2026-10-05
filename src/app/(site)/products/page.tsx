import type { Metadata } from 'next';
import '@/styles/products.css';
import '@/styles/catalogue.css';
import BackButton from '@/components/BackButton';
import ProductListFilter, { type ProductTypeCardData } from '@/components/ProductListFilter';
import { CONTACT } from '@/lib/contact';
import { formatFootprint, formatVariantSize, getHierarchyData } from '@/lib/hierarchy';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Products | Vinayak Plastics — Plastic Crates, Pallets & Waste Bins' },
  description:
    'Explore Vinayak Plastics product range — plastic crates, plastic pallets, waste bins / dustbins and hand pallet trucks. HDPE & PP industrial-grade material handling equipment.'
};

export default async function ProductsPage() {
  const hierarchy = await getHierarchyData();

  // Primary navigation — the four large premium category cards.
  const categoryCards = hierarchy.categories.map((cat, i) => ({
    index: String(i + 1).padStart(2, '0'),
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    image: cat.image,
    models: cat.models_count,
    series: cat.series.length,
    sizes: cat.series.slice(0, 2).map((s) => s.series_key),
    href: `/products/${cat.slug}`
  }));

  // Category filter chips
  const rangeCards = hierarchy.categories.map((cat, i) => ({
    index: String(i + 1).padStart(2, '0'),
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    image: cat.image,
    sizeNames: cat.series.slice(0, 3).map((s) => s.series_key),
    count: cat.models_count,
    subCount: cat.series.length,
    href: `/products/${cat.slug}`
  }));

  // Product Types collection with their relative models
  const productTypes: ProductTypeCardData[] = hierarchy.categories.flatMap((cat) => {
    const list: ProductTypeCardData[] = [];

    if (cat.sub_categories && cat.sub_categories.length > 0) {
      for (const sub of cat.sub_categories) {
        if (sub.series.length > 0) {
          list.push({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            categoryName: cat.name,
            categorySlug: cat.slug,
            description: sub.description || cat.description,
            image: sub.image || sub.series[0]?.image || cat.image,
            seriesCount: sub.series.length,
            modelsCount: sub.models_count,
            href: `/products/${cat.slug}?type=${sub.slug}#type-${sub.slug}`,
            series: sub.series.map((s) => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
              seriesKey: s.series_key,
              footprint: formatFootprint(s),
              image: s.image,
              description: s.short_description || s.description,
              modelsCount: s.models_count,
              heightsCount: s.heights_count,
              href: s.href,
              variants: s.sizes.flatMap((sz) =>
                sz.variants.map((v) => ({
                  id: v.id,
                  displayName: v.display_name,
                  modelCode: v.model_code,
                  versionName: v.version_name,
                  sizeLabel: sz.label,
                  dimensions: formatVariantSize(s, sz.height, v),
                  capacity: v.load_capacity,
                  material: v.material,
                  image: v.card_image,
                  href: v.href,
                  search: v.search
                }))
              )
            }))
          });
        }
      }
    }

    // Direct series (if category has series without a subcategory)
    const directSeries = cat.series.filter((s) => !s.sub_category_id);
    if (directSeries.length > 0) {
      const hasSubs = cat.sub_categories && cat.sub_categories.some((sc) => sc.series.length > 0);
      const typeName = hasSubs ? `${cat.name} (Direct / Standard)` : cat.name;
      const typeSlug = hasSubs ? `${cat.slug}-direct` : cat.slug;
      list.push({
        id: `cat-direct-${cat.id}`,
        name: typeName,
        slug: typeSlug,
        categoryName: cat.name,
        categorySlug: cat.slug,
        description: cat.description,
        image: directSeries[0]?.image || cat.image,
        seriesCount: directSeries.length,
        modelsCount: directSeries.reduce((n, s) => n + s.models_count, 0),
        href: `/products/${cat.slug}#direct-series`,
        series: directSeries.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          seriesKey: s.series_key,
          footprint: formatFootprint(s),
          image: s.image,
          description: s.short_description || s.description,
          modelsCount: s.models_count,
          heightsCount: s.heights_count,
          href: s.href,
          variants: s.sizes.flatMap((sz) =>
            sz.variants.map((v) => ({
              id: v.id,
              displayName: v.display_name,
              modelCode: v.model_code,
              versionName: v.version_name,
              sizeLabel: sz.label,
              dimensions: formatVariantSize(s, sz.height, v),
              capacity: v.load_capacity,
              material: v.material,
              image: v.card_image,
              href: v.href,
              search: v.search
            }))
          )
        }))
      });
    }

    return list;
  });

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / Products</p>
            <BackButton href="/" />
          </div>
          <h1 className="display-800">Our Products</h1>
          <p>Industrial material handling and packaging solutions for warehouses, logistics, dairy, commercial and industrial applications.</p>
        </div>
      </section>

      {/* ===== EXPLORE OUR PRODUCT RANGES ===== */}
      <section className="section" id="plx-ranges">
        <div className="container">
          <header className="plx-head reveal">
            <p className="sec-index">Catalogue</p>
            <h2 className="display-700">Explore Our Product Ranges</h2>
            <p>Pick a range to walk through its series, sizes and construction types — every model, built to order.</p>
          </header>

          {categoryCards.length > 0 ? (
            <div className="plx-cat-list">
              {categoryCards.map((card) => (
                <a key={card.slug} href={card.href} className="plx-cat reveal" aria-label={`Explore ${card.name}`}>
                  <div className="plx-cat__media">
                    {card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.image} alt={`${card.name} — Vinayak Plastics`} width="640" height="420" loading="lazy" decoding="async" />
                    ) : (
                      <span className="plx-cat__placeholder" aria-hidden="true">{card.name}</span>
                    )}
                  </div>
                  <div className="plx-cat__body">
                    <div className="plx-cat__topline">
                      <span className="plx-cat__index" aria-hidden="true">{card.index}</span>
                      <span className="plx-cat__tag">Product Range</span>
                    </div>
                    <h2 className="plx-cat__name">{card.name}</h2>
                    {card.description && <p className="plx-cat__desc">{card.description}</p>}
                    <div className="plx-cat__meta">
                      <span className="pl-chip">{card.models} {card.models === 1 ? 'model' : 'models'}</span>
                      <span className="pl-chip">{card.series} {card.series === 1 ? 'series' : 'series'}</span>
                      {card.sizes.slice(0, 2).filter(Boolean).map((name) => (
                        <span key={name} className="pl-chip pl-chip-outline">{name}</span>
                      ))}
                    </div>
                    <span className="plx-cat__cta">Explore {card.name} <span aria-hidden="true">→</span></span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="pl-empty reveal">
              <h3>Product catalogue coming soon</h3>
              <p>We are currently updating our product listings. Please check back shortly or <a href="/contact">contact us</a> directly for product information.</p>
            </div>
          )}
        </div>
      </section>

      {/* ===== ALL PRODUCTS DRILLDOWN: PRODUCT TYPES → SERIES → RELATIVE PRODUCTS ===== */}
      <ProductListFilter rangeCards={rangeCards} productTypes={productTypes} showRangeIndex={false} />

      {/* ===== CTA ===== */}
      <section className="cta-banner" aria-label="Get a quote">
        <div className="container reveal">
          <h2 className="display-700">Need Product Specs or Pricing?</h2>
          <p>Call or WhatsApp us directly for detailed dimensions, material grades, and dispatch timelines.</p>
          <div className="cta-buttons">
            <a href={CONTACT.phoneHref} className="btn btn-primary">Call {CONTACT.phoneDisplay}</a>
            <a href={CONTACT.whatsappHref} className="btn btn-secondary" target="_blank" rel="noopener">WhatsApp Us</a>
          </div>
        </div>
      </section>
    </main>
  );
}