import vpLogo from '@/assets/images/vp-logo.webp';
import { CONTACT } from '@/lib/contact';
import { getCatalogueData, variantSlug } from '@/lib/db';
import NavSearch from '@/components/NavSearch';
import type { SearchItem } from '@/components/NavSearch';

type HeaderProps = {
  currentPage?: string;
};

const POPULAR_SEARCHES = [
  'Plastic Crates',
  'Waste Bins',
  'Plastic Pallets',
  'Hand Pallet Trucks',
  'Standard Crates',
  'Standard Trucks'
];

// Helper function to determine if a link is active
function isActive(templatePath: string, currentPage: string): boolean {
  if (templatePath === '/' && currentPage === '/') return true;
  if (templatePath !== '/' && currentPage.startsWith(templatePath)) return true;
  return false;
}

export default async function Header({ currentPage = '' }: HeaderProps) {
  // Search is part of the catalogue experience: widen it on the Products page.
  const isProducts = currentPage.startsWith('/products');

  // Live search suggestions are derived from the real catalogue.
  const catalogue = await getCatalogueData();

  const searchItems: SearchItem[] = [
    ...catalogue.categories.map((cat) => ({
      label: cat.name,
      hint: 'Category',
      href: `/categories/${cat.slug}`,
      k: `${cat.name} ${cat.description || ''}`.toLowerCase(),
      group: 0
    })),
    ...catalogue.subCategories.map((sub) => ({
      label: sub.name,
      hint: sub.category_name || 'Product Type',
      href: sub.category_slug ? `/categories/${sub.category_slug}/${sub.slug}` : '/products',
      k: `${sub.name} ${sub.category_name || ''} ${sub.short_description || ''} ${sub.description || ''}`.toLowerCase(),
      group: 1
    })),
    ...catalogue.categories.flatMap((cat) =>
      cat.variants.map((v) => ({
        label: v.name || v.size || '',
        hint: `${cat.name} · Size / Model`,
        href: `/categories/${cat.slug}/variant/${variantSlug(v.name || v.size || 'size')}`,
        k: `${v.name} ${v.size} ${v.color} ${v.material} ${cat.name}`.toLowerCase(),
        group: 2
      }))
    )
  ];

  return (
    <nav
      className={`site-nav${isProducts ? ' nav-products' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container">
        <a href="/" className="nav-logo">
          <img src={vpLogo.src} alt="Vinayak Plastics" className="logo-img" width={120} height={92} loading="eager" decoding="sync" />
          <span className="logo-text">Vinayak Plastics</span>
        </a>

        <button className="nav-toggle" aria-label="Toggle menu" aria-controls="nav-links" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="nav-inner">
          <div className="nav-links" id="nav-links">
            <a href="/" className={isActive('/', currentPage) ? 'active' : ''}>Home</a>
            <a href="/about" className={isActive('/about', currentPage) ? 'active' : ''}>About Us</a>
            <a href="/products" className={isActive('/products', currentPage) ? 'active' : ''}>Products</a>
            <a href="/contact" className={isActive('/contact', currentPage) ? 'active' : ''}>Contact</a>
          </div>
          <div className="nav-right">
            <NavSearch items={searchItems} popular={POPULAR_SEARCHES} />
            <a href={CONTACT.phoneHref} className="nav-phone" aria-label="Call us">{CONTACT.phoneDisplay}</a>
            <a href="/contact" className="nav-cta">Get a Quote</a>
          </div>
        </div>
      </div>
    </nav>
  );
}