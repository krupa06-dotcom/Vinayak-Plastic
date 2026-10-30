'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import SafeImage from '@/components/SafeImage';

export interface MegaNavModel {
  href: string;
  image: string | null;
  modelCode: string;
  name: string;
  dimensions: string;
}

export interface MegaNavSize {
  key: string;
  label: string;
  href: string;
  models: MegaNavModel[];
}

type SizeMegaNavProps = {
  categoryName: string;
  activeKey: string;
  sizes: MegaNavSize[];
};

/**
 * Horizontal footprint/size navigation for the product detail page. Hovering
 * (or focusing/tapping) a size opens a floating panel with every model in that
 * size. The panel is absolutely positioned so it overlays the page instead of
 * pushing the product content down.
 */
export default function SizeMegaNav({ categoryName, activeKey, sizes }: SizeMegaNavProps) {
  const initialKey = sizes.some((s) => s.key === activeKey) ? activeKey : (sizes[0]?.key ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [displayKey, setDisplayKey] = useState(initialKey);
  const [focusKey, setFocusKey] = useState(initialKey);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = useId();
  const titleId = useId();

  const displaySize = sizes.find((s) => s.key === displayKey) ?? sizes[0];

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!displaySize) return null;

  const preview = (key: string) => {
    setDisplayKey(key);
    setIsOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      setIsOpen(false);
      const index = sizes.findIndex((s) => s.key === focusKey);
      tabRefs.current[index]?.focus();
      return;
    }

    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (!(event.target as HTMLElement).closest('.size-mega__tab')) return;

    event.preventDefault();
    const current = Math.max(
      0,
      sizes.findIndex((s) => s.key === focusKey)
    );
    let next = current;
    if (event.key === 'ArrowLeft') next = (current - 1 + sizes.length) % sizes.length;
    if (event.key === 'ArrowRight') next = (current + 1) % sizes.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = sizes.length - 1;

    const nextKey = sizes[next].key;
    setFocusKey(nextKey);
    preview(nextKey);
    tabRefs.current[next]?.focus();
  };

  const modelCount = displaySize.models.length;

  return (
    <div
      ref={rootRef}
      className={isOpen ? 'size-mega is-open' : 'size-mega'}
      onPointerLeave={(event) => {
        // Touch taps also emit pointerleave; keep the menu open until the user
        // taps elsewhere (handled by the document pointerdown listener).
        if (event.pointerType !== 'touch') setIsOpen(false);
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !event.currentTarget.contains(next)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <nav className="size-mega__nav" aria-label={`${categoryName} sizes`}>
        <div className="size-mega__bar">
          {sizes.map((size, index) => {
            const isActive = size.key === displaySize.key && isOpen;
            const isCurrent = size.key === activeKey;
            return (
              <button
                key={size.key}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                tabIndex={size.key === focusKey ? 0 : -1}
                className={`size-mega__tab${isActive ? ' is-active' : ''}`}
                aria-expanded={isActive}
                aria-controls={panelId}
                onMouseEnter={() => preview(size.key)}
                onFocus={() => {
                  setFocusKey(size.key);
                  preview(size.key);
                }}
                onClick={() => preview(size.key)}
              >
                <span className="size-mega__label">{size.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        id={panelId}
        role="region"
        aria-labelledby={titleId}
        aria-hidden={!isOpen}
        className={isOpen ? 'size-mega__panel is-open' : 'size-mega__panel'}
        onMouseEnter={() => setIsOpen(true)}
      >
        <div className="size-mega__head">
          <h3 id={titleId} className="size-mega__title">
            Available Models in {displaySize.label}
          </h3>
        </div>

        {modelCount > 0 ? (
          <div className="size-mega__body">
            <div className="size-mega__grid">
              {displaySize.models.map((model) => (
                <a
                  key={model.href}
                  href={model.href}
                  className="size-mega__card"
                  aria-label={`View ${model.name} (${model.modelCode})`}
                >
                  <span className="size-mega__card-img">
                    {model.image ? (
                      <SafeImage
                        src={model.image}
                        alt={`${model.name} — ${model.modelCode}`}
                        width="96"
                        height="80"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="size-mega__card-placeholder" aria-hidden="true">
                        {model.modelCode}
                      </span>
                    )}
                  </span>
                  <span className="size-mega__card-body">
                    <span className="size-mega__code">Model {model.modelCode}</span>
                    <span className="size-mega__dims">{model.dimensions}</span>
                    <span className="size-mega__cta">
                      View Product →
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="size-mega__empty">
            <p>No models available in this size yet.</p>
            <a href="/contact">Contact us for availability</a>
          </div>
        )}
      </div>
    </div>
  );
}
