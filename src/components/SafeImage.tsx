'use client';

import { useEffect, useState, type ComponentPropsWithoutRef, type ReactEventHandler } from 'react';

const DEFAULT_FALLBACK = '/images/products/placeholder.svg';

type SafeImageProps = Omit<ComponentPropsWithoutRef<'img'>, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

/**
 * Renders an image and swaps to a branded placeholder if the source fails.
 * Public product images are data-driven (Supabase paths, local overrides), so
 * a deleted or mistyped file should never leave a broken image icon on a page.
 */
export default function SafeImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  onError,
  ...props
}: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setFailed(false);
  }, [src, fallbackSrc]);

  const handleError: ReactEventHandler<HTMLImageElement> = (event) => {
    onError?.(event);
    if (!failed && currentSrc !== fallbackSrc) {
      setFailed(true);
      setCurrentSrc(fallbackSrc);
    }
  };

  return <img {...props} src={currentSrc} onError={handleError} />;
}
