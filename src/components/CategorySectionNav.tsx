'use client';

import { useEffect, useRef, useState } from 'react';

export interface SectionNavItem {
  id: string;
  label: string;
}

type CategorySectionNavProps = {
  sections: SectionNavItem[];
};

// Sticky in-page jump bar: lets visitors hop between the overview, model
// catalogue, products and quote sections of a category page without scrolling.
// The active link tracks the section currently in view. Pure enhancement — the
// anchors still work as plain #hash links when JS is unavailable.
export default function CategorySectionNav({ sections }: CategorySectionNavProps) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (sections.length === 0) return;
    let ticking = false;

    const update = () => {
      ticking = false;
      const nav = document.querySelector('.cat-nav');
      if (!nav) return;
      const navBottom = nav.getBoundingClientRect().bottom;
      let current = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= navBottom + 6) current = s.id;
      }
      if (current !== activeRef.current) setActive(current);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sections]);

  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (sections.length === 0) return null;

  return (
    <nav className="cat-nav" aria-label="On this page">
      <div className="container cat-nav__inner">
        <span className="cat-nav__label">On this page</span>
        <div className="cat-nav__links">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={active === s.id ? 'is-active' : ''}
              aria-current={active === s.id ? 'true' : undefined}
              onClick={(e) => goTo(e, s.id)}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}