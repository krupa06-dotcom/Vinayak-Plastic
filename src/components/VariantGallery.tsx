'use client';

import { useEffect, useRef } from 'react';

export interface GalleryImage {
  src: string;
  alt: string;
}

type VariantGalleryProps = {
  images: GalleryImage[];
  name: string;
};

// Model-image gallery for the variant page: thumbnail switcher for the main
// image plus a zoom lightbox on click. Progressive enhancement — the first
// thumb's image is always server-rendered so the page works without JS.
export default function VariantGallery({ images, name }: VariantGalleryProps) {
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const mainEl = media.querySelector<HTMLImageElement>('.pd-main-img');
    if (!mainEl) return;

    const thumbs = Array.from(media.querySelectorAll<HTMLButtonElement>('.pd-thumb'));
    thumbs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const src = btn.getAttribute('data-src');
        if (src) mainEl.setAttribute('src', src);
        thumbs.forEach((t) => t.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    // Click main image to open the enlarged preview.
    const root = media.getRootNode() as Document | ShadowRoot;
    const overlay = root.querySelector<HTMLElement>('.lightbox');
    if (!overlay) return;

    const imgEl = overlay.querySelector<HTMLImageElement>('#lightbox-img');
    const closeBtn = overlay.querySelector<HTMLButtonElement>('.lightbox__close');
    let lastFocused: Element | null = null;

    const open = (src: string) => {
      lastFocused = document.activeElement;
      if (imgEl) {
        imgEl.src = src;
        imgEl.alt = mainEl.alt || '';
      }
      overlay.classList.add('lightbox--open');
      document.body.style.overflow = 'hidden';
      closeBtn?.focus();
    };

    const close = () => {
      overlay.classList.remove('lightbox--open');
      document.body.style.overflow = '';
      if (lastFocused && lastFocused instanceof HTMLElement) lastFocused.focus();
    };

    const onMainClick = () => open(mainEl.getAttribute('src') || '');
    mainEl.addEventListener('click', onMainClick);

    const onOverlayClick = (e: Event) => {
      if ((e.target as HTMLElement).closest('[data-lightbox-close]')) close();
    };
    overlay.addEventListener('click', onOverlayClick);

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlay.classList.contains('lightbox--open')) close();
    };
    document.addEventListener('keydown', onKeydown);

    return () => {
      thumbs.forEach((t) => t.removeEventListener('click', t.onclick as never));
      mainEl.removeEventListener('click', onMainClick);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
    };
  }, []);

  if (!images.length) {
    return (
      <div className="cat-detail__media">
        <div className="cat-detail__placeholder">{name}</div>
      </div>
    );
  }

  return (
    <div className="cat-detail__media" ref={mediaRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="pd-main-img"
        src={images[0].src}
        alt={images[0].alt || name}
        loading="eager"
        decoding="async"
      />
      {images.length > 1 && (
        <div className="pd-thumbs" role="group" aria-label="Size images">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              className={i === 0 ? 'pd-thumb is-active' : 'pd-thumb'}
              data-src={img.src}
              aria-label={`View image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}