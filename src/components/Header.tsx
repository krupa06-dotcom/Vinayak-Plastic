'use client';

import { usePathname } from 'next/navigation';
import vpLogo from '@/assets/images/vp-logo.webp';
import { CONTACT } from '@/lib/contact';
import { variantSlug } from '@/lib/db';
import NavSearch from '@/components/NavSearch';
import type { SearchItem } from '@/components/NavSearch';
import HeaderMobileMenu from '@/components/HeaderMobileMenu';

type HeaderProps = {
  searchItems: SearchItem[];
};

function isActive(templatePath: string, currentPage: string): boolean {
  if (templatePath === '/' && currentPage === '/') return true;
  if (templatePath !== '/' && currentPage.startsWith(templatePath)) return true;
  return false;
}

export default function Header({ searchItems }: HeaderProps) {
  const pathname = usePathname();
  const isProducts = pathname.startsWith('/products');

  return (
    <HeaderMobileMenu currentPage={pathname} searchItems={searchItems} isProducts={isProducts} />
  );
}