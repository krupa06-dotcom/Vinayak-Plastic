import type { Metadata } from 'next';
import '@/styles/products.css';
import BackButton from '@/components/BackButton';
import ProductListFilter from '@/components/ProductListFilter';
import { CONTACT } from '@/lib/contact';
import { getCatalogueData, resolveFirstImage } from '@/lib/db';

export const metadata: Metadata = {
  title: { absolute: 'Products | Vinayak Plastics — Plastic Crates, Pallets & Waste Bins' },
  description:
    'Explore Vinayak Plastics product range — plastic crates, plastic pallets, waste bins / dustbins and hand pallet trucks. HDPE & PP industrial-grade material handling equipment.'
};

function sizeLabel(count: number, colors = 0): string {
  const parts: string[] = [];
  parts.push(count > 0
    ? `${count} ${count === 1 ? 'size / model' : 'sizes / models'}`
    : 'range on request');
  if (colors > 1) parts.push(`${colors} colour${colors === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function colorCount(variants: Array<{ color: string | null }>): number {
  return new Set(variants.map((v) => (v.color || '').trim()).filter(Boolean)).size;
}

export default async function ProductsPage() {
  const catalogue = await getCatalogueData();
  const { categories, subCategories } = catalogue;

  // Category cards — the main ranges, numbered like a catalogue index.
  const rangeCards = categories.map((cat, i) => ({
    index: String(i + 1).padStart(2, '0'),
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    image: resolveFirstImage(cat.image_url, cat.images[0]?.image_url),
    sizeNames: cat.variants.map((v) => v.name || '').filter(Boolean),
    count: cat.variants.length,
    subCount: cat.sub_categories.length,
    href: `/categories/${cat.slug}`
  }));

  // Category main images — used as a last-resort fallback for product cards.
  const categoryImageBySlug = new Map(categories.map((cat) => [cat.slug, cat.image_url]));

  // Product cards — every actual product across all categories.
  const productCards = subCategories.map((sub) => ({
    name: sub.name,
    slug: sub.slug,
    categoryName: sub.category_name,
    categorySlug: sub.category_slug,
    description: sub.short_description || sub.description,
    image: resolveFirstImage(sub.image_url, sub.images[0]?.image_url, categoryImageBySlug.get(sub.category_slug)),
    sizesLabel: sizeLabel(sub.variants.length, colorCount(sub.variants)),
    href: `/categories/${sub.category_slug}/${sub.slug}`
  }));

  const productSearch = productCards.map((p) =>
    `${p.name} ${p.categoryName} ${p.description || ''}`.toLowerCase()
  );

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
        productCards={productCards.map((c, i) => ({ ...c, search: productSearch[i] }))}
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