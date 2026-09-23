'use client';

import { useMemo, useState } from 'react';
import CategoryLightbox from '@/components/CategoryLightbox';

export interface CatalogueModelRow {
  id: string;
  name: string;
  href: string;
  /** Resolved thumbnail image, if any. */
  img: string | null;
  fig: string;
  /** CSS colour for the swatch chip; empty when unknown. */
  hexCss: string;
  /** Display values for each spec column. */
  cols: {
    name: string;
    size: string;
    color: string;
    capacity: string;
    material: string;
  };
  /** Lowercased aggregated text used by the live search. */
  search: string;
}

export interface ColourFacet {
  label: string;
  hex: string;
}

export type SpecColumn = keyof CatalogueModelRow['cols'];

const COLUMN_ORDER: SpecColumn[] = ['name', 'size', 'color', 'capacity', 'material'];

const COLUMN_LABELS: Record<SpecColumn, string> = {
  name: 'Model',
  size: 'Size (L × W × H)',
  color: 'Colour',
  capacity: 'Capacity / Load',
  material: 'Material'
};

type CategoryModelCatalogueProps = {
  models: CatalogueModelRow[];
  /** Columns actually present in the data, in display order. */
  columns: SpecColumn[];
  colours: ColourFacet[];
  materials: string[];
};

// Live quick-filter over the model catalogue: free-text search plus colour and
// material facet chips, with an "N of M" result count. The table is
// server-rendered first (progressive enhancement) and rows are hidden in place
// once the visitor filters. Deep-miss state is explicit (".cat-empty") so users
// always know why the grid shrank — unlike a silent empty grid.
export default function CategoryModelCatalogue({
  models,
  columns,
  colours,
  materials
}: CategoryModelCatalogueProps) {
  const [term, setTerm] = useState('');
  const [colourSel, setColourSel] = useState<ReadonlySet<string>>(new Set());
  const [materialSel, setMaterialSel] = useState<ReadonlySet<string>>(new Set());

  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    return models.filter((m) => {
      if (t && m.search.indexOf(t) === -1) return false;
      if (colourSel.size && !colourSel.has(m.cols.color)) return false;
      if (materialSel.size && !materialSel.has(m.cols.material)) return false;
      return true;
    });
  }, [models, term, colourSel, materialSel]);

  const visibleIds = useMemo(() => new Set(visible.map((m) => m.id)), [visible]);
  const filtering = Boolean(term.trim() || colourSel.size || materialSel.size);
  const toggle = (set: ReadonlySet<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const clear = () => {
    setTerm('');
    setColourSel(new Set());
    setMaterialSel(new Set());
  };

  return (
    <div>
      <header className="section-header reveal">
        <p className="sec-index">Model Catalogue</p>
        <h2 className="display-700">Available sizes &amp; models</h2>
        <p>
          Search or filter the list below — click any model image to view it enlarged, or click a
          model name to open its full detail page.
        </p>
      </header>

      <div className="cat-toolbar reveal">
        <div className="cat-toolbar__search">
          <div className="cat-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <input
              type="search"
              placeholder="Search models…"
              aria-label="Search models"
              autoComplete="off"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <div className="cat-results" aria-live="polite">
            {filtering
              ? `Showing ${visible.length} of ${models.length} ${models.length === 1 ? 'model' : 'models'}`
              : `${models.length} ${models.length === 1 ? 'model' : 'models'} available`}
            {filtering && (
              <button type="button" className="cat-clear" onClick={clear}>
                Reset
              </button>
            )}
          </div>
        </div>

        {colours.length > 0 && (
          <div className="cat-facets" role="group" aria-label="Filter by colour">
            <span className="cat-facets__label">Colour</span>
            {colours.map((c) => (
              <button
                key={c.label}
                type="button"
                className={colourSel.has(c.label) ? 'cat-facet is-active' : 'cat-facet'}
                aria-pressed={colourSel.has(c.label)}
                onClick={() => setColourSel((cur) => toggle(cur, c.label))}
              >
                <span className="cat-swatch" style={{ '--sw': c.hex || '#cccccc' } as React.CSSProperties} aria-hidden="true"></span>
                {c.label}
              </button>
            ))}
          </div>
        )}

        {materials.length > 0 && (
          <div className="cat-facets" role="group" aria-label="Filter by material">
            <span className="cat-facets__label">Material</span>
            {materials.map((m) => (
              <button
                key={m}
                type="button"
                className={materialSel.has(m) ? 'cat-facet is-active' : 'cat-facet'}
                aria-pressed={materialSel.has(m)}
                onClick={() => setMaterialSel((cur) => toggle(cur, m))}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="specs-table-wrap reveal">
          <table className="specs-table spec-table-models">
            <thead>
              <tr>
                {columns.map((k) => (
                  <th key={k}>{COLUMN_LABELS[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const show = visibleIds.has(m.id);
                return (
                  <tr className="spec-row" data-spec-href={m.href} key={m.id} hidden={!show} style={show ? undefined : { display: 'none' }}>
                    {columns.map((k) => (
                      <td className={k === 'name' ? 'spec-td-model' : ''} key={k}>
                        {k === 'name' ? (
                          <div className="spec-model">
                            {m.img && (
                              <button
                                type="button"
                                className="spec-model__thumb-btn"
                                data-lightbox-src={m.img}
                                data-lightbox-name={m.name}
                                data-lightbox-fig={m.fig}
                                aria-label={`Preview ${m.name} image`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img className="spec-model__thumb" src={m.img} alt="" width="108" height="84" loading="lazy" decoding="async" />
                              </button>
                            )}
                            <a href={m.href} className="specs-model spec-model__link">{m.cols.name}</a>
                          </div>
                        ) : k === 'color' ? (
                          <span className="spec-swatch" style={{ '--chip': m.hexCss || '#cccccc' } as React.CSSProperties}>{m.cols.color}</span>
                        ) : (
                          m.cols[k]
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cat-empty reveal">
          <h3>No models match your filters</h3>
          <p>Try a different search term or clear the colour / material filters to widen the list.</p>
          <button type="button" className="btn btn-secondary" onClick={clear}>Clear Filters</button>
        </div>
      )}

      <CategoryLightbox />

      <div className="reveal" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--steel)', textAlign: 'center' }}>
        <p>Note: Specifications are indicative and may vary by batch. Contact us for detailed technical drawings.</p>
      </div>
    </div>
  );
}