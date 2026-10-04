import { unstable_cache } from 'next/cache';

export const CACHE_TAGS = {
  hierarchy: 'hierarchy',
  settings: 'settings'
} as const;

export const REVALIDATE_SECONDS = 3600;

export function cached<T>(
  keyParts: string[],
  tags: string[],
  fetcher: () => Promise<T>
): () => Promise<T> {
  return unstable_cache(fetcher, keyParts, { tags, revalidate: REVALIDATE_SECONDS });
}