'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SafeImage from '@/components/SafeImage';
import { colourSwatch, isSameColour } from '@/lib/colorGallery';

export interface GalleryImage {
  src: string;
  alt: string;
  color?: string | null;
}

export interface VariantGalleryProps {
  images: GalleryImage[];
  colours?: string[];
  name: string;
  modelCode?: string;
}

function initialSelection(images: GalleryImage[], colours: string[]) {
  if (!images.length) return { colour: null as string | null, index: -1 };
  if (!colours.length) return { colour: null as string | null, index: 0 };

  // Start on the first photo that is explicitly tied to one of this product's
  // colours so the main image, active swatch and active thumbnail agree.
  const imageIndex = images.findIndex((image) =>
    colours.some((colour) => isSameColour(colour, image.color))
  );
  if (imageIndex !== -1) {
    const matched = colours.find((colour) => isSameColour(colour, images[imageIndex].color));
    return { colour: matched ?? colours[0], index: imageIndex };
  }

  // A one-colour product is unambiguous even if older records were saved
  // without colour-tagged photos.
  if (colours.length === 1) return { colour: colours[0], index: 0 };

  // Do not pretend the first photo belongs to a colour when no mapping exists.
  return { colour: null, index: 0 };
}

export default function VariantGallery({
  images,
  colours = [],
  name,
  modelCode
}: VariantGalleryProps) {
  const initial = initialSelection(images, colours);
  const [activeColour, setActiveColour] = useState<string | null>(initial.colour);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(initial.index);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);

  // Switch to a selected colour
  const selectColour = useCallback(
    (colour: string) => {
      setActiveColour(colour);
      const matchIdx = images.findIndex((img) => isSameColour(img.color, colour));
      if (matchIdx !== -1) {
        setActiveImageIndex(matchIdx);
        // Scroll thumbnail into view
        const thumbBtn = thumbsRef.current?.children[matchIdx] as HTMLElement | undefined;
        thumbBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        // No photo uploaded for this colour -> show graceful fallback
        setActiveImageIndex(-1);
      }

      // Notify other parts of page (e.g. specs or enquiry prefill)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vp:colour-changed', { detail: colour }));
      }
    },
    [images]
  );

  // Switch to a clicked thumbnail
  const selectThumbnail = useCallback(
    (index: number) => {
      if (index < 0 || index >= images.length) return;
      setActiveImageIndex(index);

      const img = images[index];
      // If thumbnail has an associated colour, update active colour to match
      if (img.color && colours.length > 0) {
        const matched = colours.find((colour) => isSameColour(colour, img.color));
        if (matched) {
          setActiveColour(matched);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('vp:colour-changed', { detail: matched }));
          }
        }
      }
      // If thumbnail has no associated colour (e.g. general detail shot),
      // we deliberately DO NOT reset the active colour selection.
    },
    [images, colours]
  );

  // Listen for colour selections triggered from external elements (e.g. right-side chips)
  useEffect(() => {
    const onExternalColour = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const matched = colours.find((colour) => isSameColour(colour, customEvent.detail));
      if (matched) selectColour(matched);
    };
    const onDocClick = (e: MouseEvent) => {
      const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-colour-chip]');
      if (!chip) return;
      const c = chip.getAttribute('data-colour-chip');
      if (c) selectColour(c);
    };
    window.addEventListener('vp:select-colour', onExternalColour);
    document.addEventListener('click', onDocClick);
    return () => {
      window.removeEventListener('vp:select-colour', onExternalColour);
      document.removeEventListener('click', onDocClick);
    };
  }, [colours, selectColour]);

  // Synchronize active styling on all colour chips in the document
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-colour-chip]').forEach((el) => {
      const c = el.getAttribute('data-colour-chip');
      if (c && isSameColour(c, activeColour)) {
        el.classList.add('is-active');
        el.setAttribute('aria-pressed', 'true');
      } else {
        el.classList.remove('is-active');
        el.setAttribute('aria-pressed', 'false');
      }
    });
  }, [activeColour]);

  // Handle lightbox keyboard shortcuts and body scroll lock
  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isLightboxOpen]);

  if (!images || images.length === 0) {
    return (
      <div className="cat-detail__media">
        <div className="cat-detail__placeholder">{name}</div>
      </div>
    );
  }

  const currentImage: GalleryImage | null =
    activeImageIndex >= 0 && activeImageIndex < images.length ? images[activeImageIndex] : null;

  return (
    <div className="cat-detail__media">
      {/* ===== 1. MAIN LARGE PRODUCT IMAGE ===== */}
      <div className="pd-main-wrap">
        {currentImage ? (
          <button
            type="button"
            className="pd-main-btn"
            onClick={() => setIsLightboxOpen(true)}
            aria-label={`Enlarge photo of ${name}${currentImage.color ? ` in ${currentImage.color}` : ''}`}
            title="Click to enlarge"
          >
            <SafeImage
              key={currentImage.src}
              className="pd-main-img pd-img-swap"
              src={currentImage.src}
              alt={currentImage.alt || name}
              loading="eager"
              decoding="async"
            />
            <span className="pd-main-zoom-hint" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              Enlarge
            </span>
          </button>
        ) : (
          /* Graceful fallback when a colour is selected but has no uploaded image */
          <div className="pd-no-image-fallback" role="status" aria-live="polite">
            <div className="pd-no-image-badge">
              <span
                className="pd-colours__swatch"
                style={{ background: colourSwatch(activeColour || '') }}
                aria-hidden="true"
              />
              <span>{activeColour}</span>
            </div>
            <div className="pd-no-image-text">No photo available in {activeColour}</div>
            <p className="pd-no-image-hint">
              {modelCode ? `Model ${modelCode}` : name} is available in {activeColour}. Request batch pricing or technical specifications below.
            </p>
            <a href="#quote" className="btn btn-secondary btn-sm">Enquire for {activeColour}</a>
          </div>
        )}
      </div>

      {/* ===== 2. COLOUR-SELECTION SWATCHES (NEAR IMAGE) ===== */}
      {colours.length > 0 && (
        <div className="pd-gallery-colours" aria-label="Available product colours">
          <span className="pd-gallery-colours__label">
            Colour:{' '}
            <strong className="pd-gallery-colours__current">
              {activeColour || 'Select a colour'}
            </strong>
          </span>
          <div className="pd-gallery-swatches" role="radiogroup" aria-label="Product colour choices">
            {colours.map((colour) => {
              const isActive = isSameColour(activeColour, colour);
              const hasPhoto = images.some((img) => isSameColour(img.color, colour));

              return (
                <button
                  key={colour}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`pd-gallery-swatch-btn ${isActive ? 'is-active' : ''} ${!hasPhoto ? 'is-unphotographed' : ''}`}
                  onClick={() => selectColour(colour)}
                  title={`${colour}${hasPhoto ? '' : ' (photo unavailable)'}`}
                  aria-label={`Select ${colour} colour${hasPhoto ? '' : ', photo unavailable'}`}
                >
                  <span
                    className="pd-gallery-swatch-dot"
                    style={{ backgroundColor: colourSwatch(colour) }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== 3. HORIZONTAL THUMBNAIL GALLERY ===== */}
      {images.length > 1 && (
        <div
          className="pd-thumbs"
          ref={thumbsRef}
          role="group"
          aria-label="Product gallery thumbnails"
        >
          {images.map((img, i) => {
            const isActive = i === activeImageIndex;
            return (
              <button
                key={i}
                type="button"
                className={`pd-thumb ${isActive ? 'is-active' : ''}`}
                onClick={() => selectThumbnail(i)}
                aria-label={`View image ${i + 1}${img.color ? ` (${img.color})` : ''}`}
                aria-current={isActive ? 'true' : undefined}
              >
                <SafeImage src={img.src} alt="" loading="lazy" decoding="async" />
                {img.color && (
                  <span
                    className="pd-thumb-dot"
                    style={{ backgroundColor: colourSwatch(img.color) }}
                    title={img.color}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ===== 4. ENLARGED LIGHTBOX VIEW ===== */}
      {isLightboxOpen && currentImage && (
        <div
          className="lightbox lightbox--open"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged product image"
        >
          <div
            className="lightbox__backdrop"
            onClick={() => setIsLightboxOpen(false)}
            aria-hidden="true"
          />
          <div className="lightbox__panel">
            <button
              type="button"
              className="lightbox__close"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close enlarged preview"
            >
              ✕
            </button>
            <div className="lightbox__imgwrap">
              <SafeImage
                src={currentImage.src}
                alt={currentImage.alt || name}
                loading="eager"
              />
            </div>
            <div className="lightbox__foot">
              <span className="lightbox__fig">VINAYAK PLASTICS</span>
              <span className="lightbox__name">
                {name} {currentImage.color ? `· ${currentImage.color}` : ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
