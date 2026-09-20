'use client';

import { useEffect, useRef } from 'react';

export interface HeroSlide {
  img: string;
  alt: string;
  tag: string;
  title: string;
  sub: string;
}

const SLIDE_COUNT = 4;

// The hero carousel is a progressive enhancement over the static slide markup:
// the first slide is always server-rendered so the page works without JS, and
// this component only wires up the slideshow (autoplay, arrows, dots, swipe).
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const imgSlides = Array.prototype.slice.call(root.querySelectorAll('.hero__slide')) as HTMLElement[];
    const textSlides = Array.prototype.slice.call(root.querySelectorAll('.hero__slide-text')) as HTMLElement[];
    const dots = Array.prototype.slice.call(root.querySelectorAll('.hero__dot')) as HTMLButtonElement[];
    const counter = root.querySelector<HTMLSpanElement>('.hero__counter-cur');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let current = 0;
    const delay = 3000;
    let timer: number | null = null;

    function go(next: number) {
      const t = (next + imgSlides.length) % imgSlides.length;
      if (t === current) return;

      imgSlides.forEach((s, i) => {
        s.classList.toggle('is-active', i === t);
        s.setAttribute('aria-hidden', i === t ? 'false' : 'true');
      });
      textSlides.forEach((s, i) => {
        s.classList.toggle('is-active', i === t);
      });
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === t);
        d.setAttribute('aria-selected', i === t ? 'true' : 'false');
      });

      current = t;
      if (counter) counter.textContent = String(current + 1).padStart(2, '0');
      restartTimer();
    }

    function restartTimer() {
      if (reduced) return;
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
      timer = window.setInterval(() => go(current + 1), delay);
    }

    function stop() {
      root!.classList.add('is-paused');
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      root!.classList.remove('is-paused');
      if (!reduced && !timer) {
        timer = window.setInterval(() => go(current + 1), delay);
      }
    }

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        go(parseInt(dot.getAttribute('data-slide') || '0', 10));
      });
    });

    const prevBtn = root.querySelector<HTMLButtonElement>('[data-prev]');
    const nextBtn = root.querySelector<HTMLButtonElement>('[data-next]');
    prevBtn?.addEventListener('click', () => go(current - 1));
    nextBtn?.addEventListener('click', () => go(current + 1));

    // Manual swipe / drag — horizontal drag across the hero moves the slide.
    let dragStart: number | null = null;
    root.addEventListener('pointerdown', (e) => {
      dragStart = e.clientX;
      root.classList.add('is-dragging');
    });
    root.addEventListener('pointerup', (e) => {
      if (dragStart === null) return;
      const dx = e.clientX - dragStart;
      dragStart = null;
      root.classList.remove('is-dragging');
      if (Math.abs(dx) < 40) return;
      if (dx < 0) go(current + 1);
      else go(current - 1);
    });
    root.addEventListener('pointercancel', () => {
      dragStart = null;
      root.classList.remove('is-dragging');
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', () => {
      if (!root.contains(document.activeElement)) start();
    });
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', (e) => {
      if (!root.contains(e.relatedTarget as Node)) start();
    });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(current + 1);
      else if (e.key === 'ArrowLeft') go(current - 1);
    });

    if (!reduced) {
      timer = window.setInterval(() => go(current + 1), delay);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return (
    <section
      className="hero"
      id="hero"
      aria-roledescription="carousel"
      aria-label="Vinayak Plastics overview"
      ref={rootRef}
    >
      <h1 className="sr-only">Vinayak Plastics — Engineered Plastic Products for Industry</h1>

      <div className="hero__slides">
        {slides.map((s, i) => (
          <article
            key={i}
            className={i === 0 ? 'hero__slide is-active' : 'hero__slide'}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDE_COUNT}: ${s.tag}`}
            aria-hidden={i !== 0}
          >
            <div className="hero__img-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="hero__img"
                src={s.img}
                alt={s.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
            <div className="hero__shade" aria-hidden="true"></div>
            <div className="container hero__container">
              <div className="hero__content">
                <div className={i === 0 ? 'hero__slide-text is-active' : 'hero__slide-text'} data-text={i}>
                  <span className="hero__tag">{s.tag}</span>
                  <h2 className="hero__title">{s.title}</h2>
                  <p className="hero__sub">{s.sub}</p>
                  <div className="hero__actions">
                    <a href="/products" className="btn btn-primary">Explore Products</a>
                    <a href="/contact" className="btn btn-secondary">Get a Quote</a>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="hero__arrow hero__arrow--prev" data-prev aria-label="Previous slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>
      </button>
      <button type="button" className="hero__arrow hero__arrow--next" data-next aria-label="Next slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
      </button>

      <div className="hero__bottom">
        <div className="hero__dots" role="tablist" aria-label="Slide navigation">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              className={i === 0 ? 'hero__dot is-active' : 'hero__dot'}
              role="tab"
              aria-selected={i === 0}
              aria-label={s.tag}
              data-slide={i}
            >
              <span className="hero__dot-fill"></span>
            </button>
          ))}
        </div>
        <div className="hero__counter" aria-hidden="true">
          <span className="hero__counter-cur">01</span>
          <span className="hero__counter-sep">/</span>
          <span className="hero__counter-total">04</span>
        </div>
      </div>
    </section>
  );
}