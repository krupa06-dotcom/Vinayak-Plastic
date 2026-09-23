import type { Metadata } from 'next';
import '@/styles/products.css';
import '@/styles/catalogue.css';
import BackButton from '@/components/BackButton';
import ProductListFilter from '@/components/ProductListFilter';
import { CONTACT } from '@/lib/contact';
import { getHierarchyData } from '@/lib/hierarchy';

export const metadata: Metadata = {
  title: { absolute: 'Products | Vinayak Plastics — Plastic Crates, Pallets & Waste Bins' },
  description:
    'Explore Vinayak Plastics product range — plastic crates, plastic pallets, waste bins / dustbins and hand pallet trucks. HDPE & PP industrial-grade material handling equipment.'
};

export default async function ProductsPage() {
  const hierarchy = await getHierarchyData();

  // Category cards — the main ranges, numbered like a catalogue index.
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

  // Product cards — every actual product (series size / model) across all categories.
  const productCards = hierarchy.variants.map((v) => ({
    name: v.display_name,
    slug: `${v.category_slug}-${v.series_key}-${v.size_key}-${v.version_key}`,
    categoryName: v.category_name,
    categorySlug: v.category_slug,
    description: v.description,
    image: v.card_image,
    sizesLabel: `${v.series_key} · ${v.size_label} high`,
    href: v.href
  }));

  const productsSearch = hierarchy.variants.map((v) => v.search);

  return (
    <main id="main">
      {/* ===== PAGE HERO ===== */}
      <section className="page-hero">
        <div className="container">
          <div className="hero-top">
            <p className="breadcrumb"><a href="/">Home</a> / Products</p>
            <BackButton href="/" />
          </div>
          <h1 className="display-800">Our Product Range</h1>
          <p>Industrial-grade material handling and packaging equipment for warehouses, dairy, municipal, and commercial buyers.</p>
        </div>
      </section>

      <ProductListFilter
        rangeCards={rangeCards}
        productCards={productCards.map((c, i) => ({ ...c, search: productsSearch[i] }))}
      />

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