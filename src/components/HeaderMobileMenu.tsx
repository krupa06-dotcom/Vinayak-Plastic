'use client';

import { useState, useEffect } from 'react';
import vpLogo from '@/assets/images/vp-logo.webp';
import { CONTACT } from '@/lib/contact';
import NavSearch from '@/components/NavSearch';
import type { SearchItem } from '@/components/NavSearch';

type HeaderMobileMenuProps = {
  currentPage: string;
  searchItems: SearchItem[];
  isProducts: boolean;
};

function isActive(templatePath: string, currentPage: string): boolean {
  if (templatePath === '/' && currentPage === '/') return true;
  if (templatePath !== '/' && currentPage.startsWith(templatePath)) return true;
  return false;
}

export default function HeaderMobileMenu({ currentPage, searchItems, isProducts }: HeaderMobileMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <>
      <div className={`nav-overlay ${isMenuOpen ? 'is-visible' : ''}`} onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
      <nav
        className={`site-nav${isProducts ? ' nav-products' : ''} ${isScrolled ? 'is-scrolled' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container">
          <a href="/" className="nav-logo">
            <img src={vpLogo.src} alt="Vinayak Plastics" className="logo-img" width={120} height={92} loading="eager" decoding="sync" />
            <span className="logo-text">Vinayak Plastics</span>
          </a>

          <a href="/contact" className="nav-cta nav-cta-mobile">Get a Quote</a>

          <button
            className="nav-toggle"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-controls="nav-links"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`nav-inner ${isMenuOpen ? 'is-open' : ''}`}>
            <div className="nav-links" id="nav-links" role="navigation">
              <a href="/" className={isActive('/', currentPage) ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Home</a>
              <a href="/about" className={isActive('/about', currentPage) ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>About Us</a>
              <a href="/products" className={isActive('/products', currentPage) ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Products</a>
              <a href="/contact" className={isActive('/contact', currentPage) ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Contact</a>
            </div>
          </div>

          <NavSearch items={searchItems} popular={['Plastic Crates', 'Waste Bins', 'Plastic Pallets', 'Hand Pallet Trucks', 'Standard Crates', 'Standard Trucks']} />

          <div className="nav-right">
            <a href={CONTACT.phoneHref} className="nav-phone" aria-label="Call us">{CONTACT.phoneDisplay}</a>
            <a href="/contact" className="nav-cta">Get a Quote</a>
          </div>
        </div>
      </nav>
    </>
  );
}