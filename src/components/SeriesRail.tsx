import { formatFootprint } from '@/lib/hierarchy';
import type { HierarchyCategory, HierarchySeries, HierarchySize } from '@/lib/hierarchy';

type SeriesRailProps = {
  category: HierarchyCategory;
  activeSeriesKey: string;
  activeSizeKey?: string;
  sizeHref?: (series: HierarchySeries, size: HierarchySize) => string;
};

function defaultSizeHref(series: HierarchySeries, size: HierarchySize): string {
  return `${series.href}#size-${size.size_key}`;
}

// Sticky in-page sidebar listing every series (footprint) in the category, with
// the heights of the active series as quick links. Mirrors the header nav in
// page context so visitors can jump between footprints without scrolling up.
export default function SeriesRail({ category, activeSeriesKey, activeSizeKey, sizeHref }: SeriesRailProps) {
  const buildHref = sizeHref ?? defaultSizeHref;

  return (
    <aside className="sr-rail" aria-label={`${category.name} series`}>
      <p className="sr-rail__label">Browse {category.name}</p>
      <nav className="sr-rail__nav">
        {category.series.map((s) => {
          const isActive = s.series_key === activeSeriesKey;
          const footprint = formatFootprint(s);
          return (
            <div key={s.series_key} className={isActive ? 'sr-rail__item is-active' : 'sr-rail__item'}>
              <a href={s.href} className="sr-rail__link" aria-current={isActive ? 'page' : undefined}>
                <span className="sr-rail__fp">{footprint}</span>
                <span className="sr-rail__meta">
                  {s.heights_count} {s.heights_count === 1 ? 'height' : 'heights'}
                </span>
              </a>
              {isActive && s.sizes.length > 0 && (
                <ul className="sr-rail__sizes">
                  {s.sizes.map((sz) => (
                    <li key={sz.size_key}>
                      <a
                        href={buildHref(s, sz)}
                        className={sz.size_key === activeSizeKey ? 'is-current' : undefined}
                        aria-current={sz.size_key === activeSizeKey ? 'true' : undefined}
                      >
                        {sz.height} mm
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}