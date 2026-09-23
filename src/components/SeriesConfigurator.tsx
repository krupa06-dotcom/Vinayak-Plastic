'use client';

import { useEffect, useState } from 'react';

export interface ConfigSizeVariant {
  versionKey: string;
  displayName: string;
  modelCode: string;
  image: string | null;
  description: string | null;
  href: string;
}

export interface ConfigSize {
  sizeKey: string;
  label: string;
  height: number;
  versions: ConfigSizeVariant[];
}

type SeriesConfiguratorProps = {
  sizes: ConfigSize[];
};

/**
 * Height chooser + version picker for a series. Every size's versions are
 * server-rendered (all present in the DOM for SEO); the chooser toggles the
 * active panel. Selected state uses a check mark + border (not colour only)
 * and supports deep links like #size-600x400x200.
 */
export default function SeriesConfigurator({ sizes }: SeriesConfiguratorProps) {
  const [activeKey, setActiveKey] = useState(sizes[0]?.sizeKey ?? '');

  useEffect(() => {
    const fromHash = () => {
      const m = /#size-(.+)$/.exec(window.location.hash);
      if (m && sizes.some((s) => s.sizeKey === m[1])) {
        setActiveKey(m[1]);
      }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [sizes]);

  const active = sizes.find((s) => s.sizeKey === activeKey) ?? sizes[0];

  return (
    <div className="hx-config">
      <div className="hx-heights" role="tablist" aria-label="Choose a height">
        {sizes.map((s) => {
          const isActive = s.sizeKey === (active?.sizeKey ?? '');
          return (
            <button
              key={s.sizeKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`hx-panel-${s.sizeKey}`}
              className={isActive ? 'hx-height is-active' : 'hx-height'}
              onClick={() => setActiveKey(s.sizeKey)}
            >
              <span className="hx-height__check" aria-hidden="true">
                {isActive ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                ) : null}
              </span>
              <span className="hx-height__val">{s.height} mm</span>
              <span className="hx-height__meta">
                {s.versions.length} {s.versions.length === 1 ? 'model' : 'models'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="hx-panels">
        {sizes.map((s) => {
          const isActive = s.sizeKey === (active?.sizeKey ?? '');
          return (
            <div
              key={s.sizeKey}
              id={`hx-panel-${s.sizeKey}`}
              role="tabpanel"
              className={isActive ? 'hx-panel is-active' : 'hx-panel'}
              hidden={!isActive}
            >
              <p className="hx-panel__heading">
                {s.height} mm high
                <span className="hx-panel__dim">— available versions</span>
              </p>
              {s.versions.length > 0 ? (
                <div className="hx-version-grid">
                  {s.versions.map((v) => (
                    <a key={v.versionKey} href={v.href} className="hx-version">
                      <div className="hx-version__img">
                        {v.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.image} alt={`${v.displayName} — ${v.modelCode}`} width="480" height="300" loading="lazy" decoding="async" />
                        ) : (
                          <span className="hx-version__placeholder">{v.displayName}</span>
                        )}
                      </div>
                      <div className="hx-version__body">
                        <span className="hx-version__parent">{v.modelCode}</span>
                        <h3>{v.displayName}</h3>
                        {v.description && <p>{v.description}</p>}
                        <div className="hx-version__meta">
                          <span className="hx-version__cta">View Details <span aria-hidden="true">→</span></span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No versions at this height yet</h3>
                  <p>
                    This height is coming soon. Choose another height above or{' '}
                    <a href="/contact">contact us</a> to check availability.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}