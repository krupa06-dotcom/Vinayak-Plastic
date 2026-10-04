import { getLogoUrl } from '@/lib/db';
import type { SearchItem } from '@/components/NavSearch';
import HeaderClient from '@/components/HeaderClient';

type HeaderProps = {
  searchItems: SearchItem[];
};

export default async function Header({ searchItems }: HeaderProps) {
  const logoUrl = await getLogoUrl();
  
  return (
    <HeaderClient searchItems={searchItems} logoUrl={logoUrl} />
  );
}