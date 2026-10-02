'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface RelativeProduct {
  id: string;
  displayName: string;
  modelCode: string;
  versionName: string | null;
  sizeLabel: string;
  dimensions: string;
  capacity: string | null;
  material: string | null;
  image: string | null;
  href: string;
  search: string;
}

export interface TypeSeries {
  id: string;
  name: string;
  slug: string;
  seriesKey: string;
  footprint: string;
  image: string | null;
  description: string | null;
  modelsCount: number;
  heightsCount: number;
  href: string;
  variants: RelativeProduct[];
}

export interface ProductTypeCardData {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  description: string | null;
  image: string | null;
  seriesCount: number;
  modelsCount: number;
  series: TypeSeries[];
}

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
  productTypes?: ProductTypeCardData[];
  productCards?: ProductCardData[];
  showRangeIndex?: boolean;
};

export default function ProductListFilter({
  rangeCards,
  productTypes = [],
  showRangeIndex = false
}: ProductListFilterProps) {
  const [term, setTerm] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');

  const explorerRef = useRef<HTMLDivElement>(null);

  // Set initial selected product type and series
  useEffect(() => {
    if (productTypes.length > 0 && !selectedTypeId) {
      const first = productTypes[0];
      setSelectedTypeId(first.id);
      if (first.series.length > 0) {
        setSelectedSeriesId(first.series[0].id);
      }
    }
  }, [productTypes, selectedTypeId]);

  // Handle URL deep-links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = (params.get('category') || '').trim();
    const q = (params.get('q') || '').trim();

    if (cat) {
      setActiveCat(cat);
      const matchedType = productTypes.find((pt) => pt.categorySlug === cat);
      if (matchedType) {
        setSelectedTypeId(matchedType.id);
        if (matchedType.series.length > 0) {
          setSelectedSeriesId(matchedType.series[0].id);
        }
      }
    }
    if (q) setTerm(q);
  }, [productTypes]);

  // Filter product types by active category and search term
  const filteredTypes = useMemo(() => {
    const t = term.trim().toLowerCase();
    return productTypes.filter((pt) => {
      const matchCat = !activeCat || pt.categorySlug === activeCat;
      if (!matchCat) return false;
      if (!t) return true;

      const typeMatch =
        pt.name.toLowerCase().includes(t) ||
        pt.categoryName.toLowerCase().includes(t) ||
        (pt.description || '').toLowerCase().includes(t);
      const seriesMatch = pt.series.some(
        (s) =>
          s.name.toLowerCase().includes(t) ||
          s.footprint.toLowerCase().includes(t) ||
          s.variants.some((v) => v.search.includes(t))
      );
      return typeMatch || seriesMatch;
    });
  }, [productTypes, activeCat, term]);

  // Currently selected product type
  const activeType = useMemo(() => {
    return (
      productTypes.find((pt) => pt.id === selectedTypeId) ||
      filteredTypes[0] ||
      productTypes[0] ||
      null
    );
  }, [productTypes, filteredTypes, selectedTypeId]);

  // Currently active series inside selected product type
  const activeSeries = useMemo(() => {
    if (!activeType || activeType.series.length === 0) return null;
    return (
      activeType.series.find((s) => s.id === selectedSeriesId) ||
      activeType.series[0]
    );
  }, [activeType, selectedSeriesId]);

  const onSelectType = (pt: ProductTypeCardData) => {
    setSelectedTypeId(pt.id);
    if (pt.series.length > 0) {
      setSelectedSeriesId(pt.series[0].id);
    } else {
      setSelectedSeriesId('');
    }
    // Smooth scroll down to the series & relative products explorer
    setTimeout(() => {
      explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const clear = () => {
    setTerm('');
    setActiveCat('');
  };

  const toggleCat = (slug: string) => {
    setActiveCat((cur) => {
      const next = cur === slug ? '' : slug;
      if (next) {
        const firstMatching = productTypes.find((pt) => pt.categorySlug === next);
        if (firstMatching) {
          setSelectedTypeId(firstMatching.id);
          if (firstMatching.series.length > 0) {
            setSelectedSeriesId(firstMatching.series[0].id);
          }
        }
      }
      return next;
    });
  };

  return (
    <div>
      {/* ===== ALL PRODUCTS & DRILLDOWN EXPLORER ===== */}
      <section className="section section-warm" id="products-section">
        <div className="container">
          <header className="pl-head pl-head--left reveal">
            <p className="sec-index">All Products</p>
            <h2 className="display-700">Every product in one place</h2>
            <p>
              Explore all types of products — click any product type to reveal its footprint size series and relative product models.
            </p>
          </header>

          {/* ===== SEARCH & CATEGORY FILTER CHIPS ===== */}
          <div className="pl-filter reveal">
            <div className="pl-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="M21 21l-4.35-4.35"></path>
              </svg>
              <input
                type="search"
                id="pl-search-input"
                placeholder="Search product types, footprints, model codes…"
                aria-label="Search products"
                autoComplete="off"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <button
                type="button"
                id="pl-search-clear"
                aria-label="Clear search"
                hidden={!term && !activeCat}
                onClick={clear}
                style={{ display: term || activeCat ? '' : 'none' }}
              >
                &times;
              </button>
            </div>
            <div className="pl-chips" id="pl-chips" role="group" aria-label="Filter by category">
              <button
                type="button"
                className={!activeCat ? 'pl-chip-btn is-active' : 'pl-chip-btn'}
                onClick={() => setActiveCat('')}
              >
                All Categories ({productTypes.length} Types)
              </button>
              {rangeCards.map((card) => (
                <button
                  key={card.slug}
                  type="button"
                  className={activeCat === card.slug ? 'pl-chip-btn is-active' : 'pl-chip-btn'}
                  data-cat={card.slug}
                  onClick={() => toggleCat(card.slug)}
                >
                  {card.name}
                </button>
              ))}
            </div>
          </div>

           {/* ===== STEP 1: PRODUCT TYPES GRID ===== */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--steel, #5b6472)', margin: '0 0 16px', fontFamily: 'var(--font-mono)' }}>
              1. Select a Product Type
            </h3>
          </div>

          {filteredTypes.length > 0 ? (
            <div className="pl-grid reveal" style={{ marginBottom: 40 }}>
              {filteredTypes.map((pt) => {
                const isSelected = activeType?.id === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => onSelectType(pt)}
                    className={`pl-card ${isSelected ? 'is-selected-type' : ''}`}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      outline: 'none',
                      border: isSelected ? '2px solid var(--orange, #e8630c)' : '1px solid rgba(18, 42, 78, 0.08)',
                      borderTop: isSelected ? '4px solid var(--orange, #e8630c)' : '3px solid var(--orange, #e8630c)',
                      boxShadow: isSelected ? '0 12px 30px rgba(232, 99, 12, 0.16)' : undefined,
                      transform: isSelected ? 'translateY(-3px)' : undefined
                    }}
                  >
                    <div className="pl-card__img" style={{ background: '#f6f3ec', position: 'relative' }}>
                      {pt.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pt.image} alt={`${pt.name} — ${pt.categoryName}`} width="480" height="360" loading="lazy" decoding="async" />
                      ) : (
                        <span className="pl-card__placeholder">{pt.name}</span>
                      )}
                      {isSelected && (
                        <span style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'var(--orange, #e8630c)',
                          color: '#fff',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          padding: '3px 8px',
                          borderRadius: '100px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}>
                          Selected ✓
                        </span>
                      )}
                    </div>
                    <div className="pl-card__body">
                      <span className="pl-card__parent">{pt.categoryName}</span>
                      <h3 style={{ margin: '4px 0 6px', fontSize: '1.25rem' }}>{pt.name}</h3>
                      {pt.description && <p style={{ fontSize: '0.86rem', margin: '0 0 12px' }}>{pt.description}</p>}
                       <div className="pl-card__meta" style={{ marginTop: 'auto' }}>
                         <span className="pl-chip pl-chip-ok" style={{ background: 'rgba(232, 99, 12, 0.1)', color: 'var(--orange-deep, #c84e08)' }}>
                           {pt.seriesCount} {pt.seriesCount === 1 ? 'Size Series' : 'Size Series'}
                         </span>
                         <span className="pl-chip pl-chip-outline">
                           {pt.modelsCount} {pt.modelsCount === 1 ? 'Model' : 'Models'}
                         </span>
                       </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="pl-empty reveal" style={{ padding: '36px 20px', background: '#fff', borderRadius: 8, textAlign: 'center', marginBottom: 40 }}>
              <h3>No matching product types</h3>
              <p>Try searching with another keyword or selecting All Categories.</p>
              <button type="button" className="btn btn-secondary" onClick={clear} style={{ marginTop: 12 }}>
                Clear Filters
              </button>
            </div>
          )}


        </div>
      </section>
    </div>
  );
}