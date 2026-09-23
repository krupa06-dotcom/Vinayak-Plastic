'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface RangeCardData {
  index: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  href: string;
  sizeNames: string[];
  count: number;
  subCount: number;
}

export interface ProductCardData {
  name: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  description?: string | null;
  image?: string | null;
  sizesLabel: string;
  href: string;
  search: string;
}

type ProductListFilterProps = {
  rangeCards: RangeCardData[];
  productCards: ProductCardData[];
};

// Live search + category filter over the full product range. Ports the
// original `[is:inline]` script: ?q= pre-populates the search, ?subproduct= /
// ?category= deep-link straight to a card, and results are shown/hidden in
// place. Pure progressive enhancement — the grid is server-rendered.
export default function ProductListFilter({ rangeCards, productCards }: ProductListFilterProps) {
  const [term, setTerm] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  // Deep links and ?q= arrive after first paint, once per mount.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim();

    const highlight = (el: HTMLElement | null) => {
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('is-highlighted');
      window.setTimeout(() => el.classList.remove('is-highlighted'), 1800);
    };

    const scrollToSectionAnd = (target: HTMLElement | null) => {
      const section = document.getElementById('products-section') || document.getElementById('categories-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => highlight(target), 420);
    };

    const subLink = document.querySelector<HTMLElement>('[data-sub="' + (params.get('subproduct') || '') + '"]');
    const catLink = document.querySelector<HTMLElement>('[data-cat="' + (params.get('category') || '') + '"]');

    if (!q) {
      if (subLink) scrollToSectionAnd(subLink);
      else if (catLink) scrollToSectionAnd(catLink);
    }

    if (q) {
      setTerm(q);
      const catsSection = document.getElementById('categories-section');
      if (catsSection) catsSection.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  const visibleCount = useMemo(() => {
    const t = term.trim().toLowerCase();
    return productCards.filter((c) => {
      const matchCat = !activeCat || c.categorySlug === activeCat;
      const matchTerm = !t || c.search.indexOf(t) !== -1;
      return matchCat && matchTerm;
    }).length;
  }, [term, activeCat, productCards]);

  const searching = Boolean(term.trim() || activeCat);
  const showGrid = productCards.length > 0;
  const noResultsVisible = showGrid && searching && visibleCount === 0;

  const clear = () => {
    setTerm('');
    setActiveCat('');
  };

  const toggleCat = (slug: string) => {
    setActiveCat((cur) => (cur === slug ? '' : slug));
  };

  return (
    <div>
      {/* ===== CATEGORY INDEX ===== */}
      <section className="section" id="categories-section">
        <div className="container">
          <header className="pl-head reveal">
            <p className="sec-index">Product Categories</p>
            <h2 className="display-700">Browse by product range</h2>
            <p>Every family, from compact crates to industrial pallets — pick a range to see the sizes, colours and products inside.</p>
          </header>

          {rangeCards.length > 0 ? (
            <div className="pl-cat-list">
              {rangeCards.map((card) => (
                <a key={card.slug} href={card.href} className="pl-cat reveal" data-cat={card.slug} aria-label={`Browse ${card.name}`}>
                  <div className="pl-cat__index" aria-hidden="true">{card.index}</div>
                  <div className="pl-cat__img">
                    {card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.image} alt={`${card.name} — Vinayak Plastics`} width="480" height="360" loading="lazy" decoding="async" />
                    ) : (
                      <span className="pl-cat__img-empty">{card.name}</span>
                    )}
                  </div>
                  <div className="pl-cat__body">
                    <h3>{card.name}</h3>
                    {card.description && <p>{card.description}</p>}
                    <div className="pl-cat__meta">
                      <span className="pl-chip">{card.count ? `${card.count} · ${card.count === 1 ? 'model' : 'models'}` : 'Range'}</span>
                      {card.subCount > 0 && <span className="pl-chip">{card.subCount} product{card.subCount === 1 ? '' : 's'}</span>}
                      {card.sizeNames.slice(0, 3).filter(Boolean).map((name) => (
                        <span key={name} className="pl-chip pl-chip-outline">{name}</span>
                      ))}
                      {card.sizeNames.length > 3 && <span className="pl-chip pl-chip-outline">+{card.sizeNames.length - 3} more</span>}
                    </div>
                    <span className="pl-cat__cta">Explore Range <span aria-hidden="true">→</span></span>
                  </div>
                  <span className="pl-cat__arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                  </span>
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

      {/* ===== ALL PRODUCTS ===== */}
      <section className="section section-warm" id="products-section">
        <div className="container">
          <header className="pl-head pl-head--left reveal">
            <p className="sec-index">All Products</p>
            <h2 className="display-700">Every product in one place</h2>
            <p>Search the full range or filter by category — each product shows its available sizes and colours.</p>
          </header>

          <div className="pl-filter reveal">
            <div className="pl-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
              <input
                type="search"
                id="pl-search-input"
                placeholder="Search products…"
                aria-label="Search products"
                autoComplete="off"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <button type="button" id="pl-search-clear" aria-label="Clear search" hidden={!searching} onClick={clear} style={{ display: searching ? '' : 'none' }}>&times;</button>
            </div>
            <div className="pl-chips" id="pl-chips" role="group" aria-label="Filter by category">
              {rangeCards.map((card) => (
                <button
                  key={card.slug}
                  type="button"
                  className={activeCat === card.slug ? 'pl-chip-btn is-active' : 'pl-chip-btn'}
                  data-cat={card.slug}
                  onClick={() => toggleCat(card.slug)}
                >{card.name}</button>
              ))}
            </div>
          </div>

          <div className="pl-results-info" id="pl-results-info" hidden={!searching} aria-live="polite">
            {searching && `Showing ${visibleCount} ${visibleCount === 1 ? 'product' : 'products'}${term.trim() ? ` for "${term.trim()}"` : ''}${activeCat ? ` in ${activeCat}` : ''}`}
          </div>

          {showGrid ? (
            <div className="pl-grid reveal" id="pl-grid" ref={gridRef}>
              {productCards.map((card) => {
                const t = term.trim().toLowerCase();
                const show = (!activeCat || card.categorySlug === activeCat) && (!t || card.search.indexOf(t) !== -1);
                return (
                  <a
                    key={card.slug}
                    href={card.href}
                    className="pl-card"
                    data-sub={card.slug}
                    data-cat={card.categorySlug}
                    data-search={card.search}
                    hidden={!show}
                    style={show ? undefined : { display: 'none' }}
                  >
                    <div className="pl-card__img">
                      {card.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.image} alt={`${card.name} — ${card.categoryName}`} width="480" height="360" loading="lazy" decoding="async" />
                      ) : (
                        <span className="pl-card__placeholder">{card.name}</span>
                      )}
                    </div>
                    <div className="pl-card__body">
                      <span className="pl-card__parent">{card.categoryName}</span>
                      <h3>{card.name}</h3>
                      {card.description && <p>{card.description}</p>}
                      <div className="pl-card__meta">
                        <span className="pl-card__count">{card.sizesLabel}</span>
                        <span className="pl-card__cta">View Details <span aria-hidden="true">→</span></span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="pl-empty reveal">
              <h3>Product types coming soon</h3>
              <p>We are adding detailed product breakdowns. Please check back or <a href="/contact">contact us</a> for the full range.</p>
            </div>
          )}

          <div className="pl-empty" id="pl-no-results" hidden={!noResultsVisible}>
            <h3>No matching products</h3>
            <p id="pl-no-results-text">
              {activeCat && !term.trim()
                ? 'No products in this range yet. Choose another category or ask us directly.'
                : 'No products match your search. Try a different term or clear the filters.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}