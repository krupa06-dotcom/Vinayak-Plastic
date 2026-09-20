'use client';

import { useEffect, useRef } from 'react';

export interface SearchItem {
  label: string;
  hint: string;
  href: string;
  k: string;
  group: number;
}

type NavSearchProps = {
  items: SearchItem[];
  popular: string[];
};

// Live search suggestions derived from the real catalogue. Pure progressive
// enhancement on top of the plain server-rendered form: typing "pallet"
// surfaces "Plastic Pallets" on top and every suggestion navigates straight
// to an actual category / product-type page.
export default function NavSearch({ items, popular }: NavSearchProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const input = form.querySelector<HTMLInputElement>('#nav-search-input');
    const submit = form.querySelector<HTMLButtonElement>('#nav-search-submit');
    const panel = panelRef.current;
    const label = panel?.querySelector<HTMLSpanElement>('#search-suggestions-label');
    const list = panel?.querySelector<HTMLUListElement>('#search-suggestions-list');
    const empty = panel?.querySelector<HTMLParagraphElement>('#search-suggestions-empty');
    if (!input || !submit || !panel || !label || !list || !empty) return;

    let visibleLinks: HTMLAnchorElement[] = [];
    let activeIndex = -1;

    function escapeHtml(str: string): string {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    const esc = escapeHtml;

    function highlight(text: string, q: string): string {
      if (!q) return escapeHtml(text);
      const i = text.toLowerCase().indexOf(q.toLowerCase());
      if (i < 0) return escapeHtml(text);
      return (
        esc(text.slice(0, i)) +
        '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' +
        esc(text.slice(i + q.length))
      );
    }

    function score(item: SearchItem, lq: string): number {
      const labelLower = item.label.toLowerCase();
      const exact = labelLower === lq;
      const idx = labelLower.indexOf(lq);
      let s: number;
      if (exact) s = 100;
      else if (idx === 0) s = 90;
      else if (idx > 0) s = 80 - Math.min(idx, 20);
      else {
        const kw = item.k.indexOf(lq);
        if (kw < 0) return -1;
        s = 40 - Math.min(kw, 15);
      }
      return s + (item.group === 0 ? 10 : 0);
    }

    function render(arr: SearchItem[], q: string) {
      list!.innerHTML = '';
      visibleLinks = [];
      empty!.hidden = true;
      label!.textContent = q ? 'Suggestions' : 'Popular Searches';
      arr.forEach((item) => {
        const a = document.createElement('a');
        a.className = 'search-suggestion';
        a.href = item.href;
        a.innerHTML =
          '<span class="search-suggestion__label">' + highlight(item.label, q) + '</span>' +
          '<span class="search-suggestion__hint">' + escapeHtml(item.hint) + '</span>';
        list!.appendChild(a);
        visibleLinks.push(a);
      });
    }

    function buildPopular() {
      const out: SearchItem[] = [];
      popular.forEach((term) => {
        let match: SearchItem | null = null;
        for (let i = 0; i < items.length; i++) {
          if (items[i].label.toLowerCase() === term.toLowerCase()) {
            match = items[i];
            break;
          }
        }
        out.push(match || {
          label: term,
          hint: 'Search',
          href: form!.action + '?q=' + encodeURIComponent(term),
          k: term.toLowerCase(),
          group: 1
        });
      });
      render(out, '');
    }

    function refresh() {
      const q = input!.value.trim();
      if (!q) {
        buildPopular();
        return;
      }

      const lq = q.toLowerCase();
      const matches = items.filter((it) => score(it, lq) > -1);
      matches.sort((a, b) => {
        const d = score(b, lq) - score(a, lq);
        if (d !== 0) return d;
        if (a.group !== b.group) return a.group - b.group;
        return a.label.length - b.label.length;
      });

      if (matches.length) {
        render(matches.slice(0, 7), q);
      } else {
        list!.innerHTML = '';
        visibleLinks = [];
        label!.textContent = 'Suggestions';
        empty!.hidden = false;
      }
    }

    function showPanel() {
      panel!.hidden = false;
    }
    function hidePanel() {
      panel!.hidden = true;
      setActive(-1);
    }

    function setActive(i: number) {
      if (activeIndex >= 0 && visibleLinks[activeIndex]) {
        visibleLinks[activeIndex].classList.remove('is-active');
      }
      activeIndex = i;
      if (i >= 0 && visibleLinks[i]) {
        visibleLinks[i].classList.add('is-active');
      }
    }

    submit.addEventListener('click', (e) => {
      if (!input!.value.trim()) {
        e.preventDefault();
        buildPopular();
        showPanel();
        input!.focus();
      } else {
        hidePanel();
      }
    });

    input.addEventListener('focus', () => {
      refresh();
      showPanel();
    });
    input.addEventListener('input', () => {
      refresh();
      showPanel();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hidePanel();
        input!.blur();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(activeIndex < visibleLinks.length - 1 ? activeIndex + 1 : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(activeIndex > 0 ? activeIndex - 1 : visibleLinks.length - 1);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const target = visibleLinks[activeIndex];
        if (target) window.location.href = target.href;
      }
    });

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target as Node) && !form.contains(e.target as Node)) hidePanel();
    });
  }, [items, popular]);

  return (
    <div className="nav-search">
      <form className="search-form" id="nav-search-form" role="search" action="/products" method="get" ref={formRef}>
        <input
          type="search"
          name="q"
          id="nav-search-input"
          placeholder="Search products..."
          aria-label="Search products"
          autoComplete="off"
        />
        <button type="submit" id="nav-search-submit" aria-label="Submit search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
        </button>
      </form>
      <div className="search-suggestions" id="search-suggestions" ref={panelRef} hidden>
        <span className="search-suggestions__label" id="search-suggestions-label">Popular Searches</span>
        <ul className="search-suggestions__list" id="search-suggestions-list"></ul>
        <p className="search-suggestions__empty" id="search-suggestions-empty" hidden>No matching products found</p>
      </div>
    </div>
  );
}