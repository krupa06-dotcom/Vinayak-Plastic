import { getCatalogueData, variantSlug } from '@/lib/db';
import Header from '@/components/Header';
import type { SearchItem } from '@/components/NavSearch';

const POPULAR_SEARCHES = [
  'Plastic Crates',
  'Waste Bins',
  'Plastic Pallets',
  'Hand Pallet Trucks',
  'Standard Crates',
  'Standard Trucks'
];

async function getSearchItems(): Promise<SearchItem[]> {
  const catalogue = await getCatalogueData();

  return [
    ...catalogue.categories.map((cat) => ({
      label: cat.name,
      hint: 'Category',
      href: `/categories/${cat.slug}`,
      k: `${cat.name} ${cat.description || ''}`.toLowerCase(),
      group: 0
    })),
    ...catalogue.subCategories.map((sub) => ({
      label: sub.name,
      hint: sub.category_name || 'Product Type',
      href: sub.category_slug ? `/categories/${sub.category_slug}/${sub.slug}` : '/products',
      k: `${sub.name} ${sub.category_name || ''} ${sub.short_description || ''} ${sub.description || ''}`.toLowerCase(),
      group: 1
    })),
    ...catalogue.categories.flatMap((cat) =>
      cat.variants.map((v) => ({
        label: v.name || v.size || '',
        hint: `${cat.name} · Size / Model`,
        href: `/categories/${cat.slug}/variant/${variantSlug(v.name || v.size || 'size')}`,
        k: `${v.name} ${v.size} ${v.color} ${v.material} ${cat.name}`.toLowerCase(),
        group: 2
      }))
    )
  ];
}

export default async function HeaderWrapper() {
  const searchItems = await getSearchItems();
  return <Header searchItems={searchItems} />;
}