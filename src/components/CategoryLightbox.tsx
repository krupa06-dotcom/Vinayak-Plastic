'use client';

import { useEffect } from 'react';

// Model catalogue lightbox: clicking a thumbnail in the spec sheet opens the
// full-size model image in a modal, and whole spec-table rows navigate to the
// model's detail page. Pure progressive enhancement over the server-rendered
// markup (buttons carry data-* attributes that this component wires up).
export default function CategoryLightbox() {
  useEffect(() => {
    const overlay = document.querySelector<HTMLElement>('.lightbox');
    if (!overlay) return;

    const imgEl = overlay.querySelector<HTMLImageElement>('#lightbox-img');
    const figEl = overlay.querySelector<HTMLElement>('#lightbox-fig');
    const nameEl = overlay.querySelector<HTMLElement>('#lightbox-name');
    const closeBtn = overlay.querySelector<HTMLButtonElement>('.lightbox__close');
    let lastFocused: Element | null = null;

    function open(src: string, name: string, fig: string) {
      lastFocused = document.activeElement;
      if (imgEl) {
        imgEl.src = src;
        imgEl.alt = name;
      }
      if (nameEl) nameEl.textContent = name;
      if (figEl) figEl.textContent = fig;
      overlay!.classList.add('lightbox--open');
      document.body.style.overflow = 'hidden';
      closeBtn?.focus();
    }

    function close() {
      overlay!.classList.remove('lightbox--open');
      document.body.style.overflow = '';
      if (lastFocused && lastFocused instanceof HTMLElement) lastFocused.focus();
    }

    const thumbButtons = document.querySelectorAll<HTMLElement>('[data-lightbox-src]');
    thumbButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        open(
          btn.getAttribute('data-lightbox-src') || '',
          btn.getAttribute('data-lightbox-name') || 'Model',
          btn.getAttribute('data-lightbox-fig') || ''
        );
      });
    });

    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-lightbox-close]')) close();
    });

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlay.classList.contains('lightbox--open')) close();
    };
    document.addEventListener('keydown', onKeydown);

    document.querySelectorAll<HTMLElement>('.spec-row[data-spec-href]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) return;
        const href = row.getAttribute('data-spec-href');
        if (href) window.location.href = href;
      });
    });

    return () => {
      thumbButtons.forEach((btn) => btn.removeEventListener('click', btn.onclick as never));
      document.removeEventListener('keydown', onKeydown);
    };
  }, []);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Model image preview">
      <div className="lightbox__backdrop" data-lightbox-close></div>
      <figure className="lightbox__panel">
        <button type="button" className="lightbox__close" data-lightbox-close aria-label="Close preview">&times;</button>
        <div className="lightbox__imgwrap">
          <img id="lightbox-img" src="" alt="" />
        </div>
        <figcaption className="lightbox__foot">
          <span className="lightbox__fig" id="lightbox-fig">FIG/01</span>
          <span className="lightbox__name" id="lightbox-name"></span>
        </figcaption>
      </figure>
    </div>
  );
}