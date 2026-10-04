'use client';

import { usePathname } from 'next/navigation';
import type { SearchItem } from '@/components/NavSearch';
import HeaderMobileMenu from '@/components/HeaderMobileMenu';

type HeaderClientProps = {
  searchItems: SearchItem[];
  logoUrl: string | null;
};

export default function HeaderClient({ searchItems, logoUrl }: HeaderClientProps) {
  const pathname = usePathname();
  const isProducts = pathname.startsWith('/products');

  return (
    <HeaderMobileMenu 
      currentPage={pathname} 
      searchItems={searchItems} 
      isProducts={isProducts}
      logoUrl={logoUrl}
    />
  );
}