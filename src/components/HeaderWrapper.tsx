import { getHierarchyData } from '@/lib/hierarchy';
import Header from '@/components/Header';
import type { SearchItem } from '@/components/NavSearch';

const POPULAR_SEARCHES = [
  'Plastic Crates',
  'Waste Bins',
  'Plastic Pallets',
  'Hand Pallet Trucks',
  '600 × 400 Series',
  '1200 × 1000 Series'
];

async function getSearchItems(): Promise<SearchItem[]> {
  const hierarchy = await getHierarchyData();

  return [
    ...hierarchy.categories.map((cat) => ({
      label: cat.name,
      hint: 'Category',
      href: cat.href,
      k: `${cat.name} ${cat.description || ''}`.toLowerCase(),
      group: 0
    })),
    ...hierarchy.series.map((s) => ({
      label: s.name,
      hint: `${s.category_name} · Series`,
      href: s.href,
      k: `${s.name} ${s.category_name || ''} ${s.short_description || ''} ${s.description || ''}`.toLowerCase(),
      group: 1
    })),
    ...hierarchy.variants.map((v) => ({
      label: v.display_name,
      hint: `${v.category_name} · ${v.series_name}`,
      href: v.href,
      k: `${v.display_name} ${v.model_code} ${v.category_name} ${v.series_name}`.toLowerCase(),
      group: 2
    }))
  ];
}

export default async function HeaderWrapper() {
  const searchItems = await getSearchItems();
  return <Header searchItems={searchItems} />;
}