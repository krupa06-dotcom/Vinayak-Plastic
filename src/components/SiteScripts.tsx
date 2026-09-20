'use client';

import { useEffect } from 'react';

// Site-wide DOM enhancement: mobile nav toggle + scroll reveal. Mirrors the
// inline script that was previously bundled with every public page.
export default function SiteScripts() {
  useEffect(() => {
    // Mobile nav toggle
    const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
    const navLinks = document.querySelector<HTMLElement>('.nav-links');

    if (toggle && navLinks) {
      const onToggleClick = () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true' ? false : true;
        toggle.setAttribute('aria-expanded', expanded.toString());
        navLinks.classList.toggle('nav-open');
      };
      toggle.addEventListener('click', onToggleClick);

      const onLinkClick = () => {
        navLinks.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      };
      navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', onLinkClick);
      });
      return () => {
        toggle.removeEventListener('click', onToggleClick);
        navLinks.querySelectorAll('a').forEach((link) => {
          link.removeEventListener('click', onLinkClick);
        });
      };
    }
  }, []);

  useEffect(() => {
    // Scroll reveal with IntersectionObserver
    const reveals = document.querySelectorAll<HTMLElement>('.reveal');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );

      reveals.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    } else {
      // Fallback for older browsers
      reveals.forEach((el) => el.classList.add('visible'));
    }
  }, []);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
        el.classList.add('visible');
        el.style.transition = 'none';
      });
    }
  }, []);

  return null;
}