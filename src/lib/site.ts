// Central URL helper. Paths are root-relative so the site works from the
// site root (Vercel / custom domain).

export const SITE_URL = 'https://vinayak-plastic.vercel.app';

/** Prefix a root-relative path with the configured base path. */
export function path(p: string): string {
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}