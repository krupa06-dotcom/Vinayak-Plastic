// Central URL helper. Paths stay relative so the site works both under the
// current GitHub Pages base (/Vinayak-Plastic) and on a future custom domain
// (where `base` would be '/'), with no further code changes.

export const SITE_URL = 'https://krupa06-dotcom.github.io';
export const BASE_PATH = '/Vinayak-Plastic';

/** Prefix a root-relative path with the configured base path. */
export function path(p: string): string {
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.startsWith(BASE_PATH)) return p;
  return `${BASE_PATH}${p}`;
}

/** Build an absolute URL for a root-relative page path (for canons/sitemap). */
export function absoluteUrl(p: string, trailingSlash = true): string {
  const withBase = path(p);
  const slash = trailingSlash && withBase.length > 1 && !withBase.endsWith('/') ? `${withBase}/` : withBase;
  return new URL(slash, SITE_URL).toString();
}