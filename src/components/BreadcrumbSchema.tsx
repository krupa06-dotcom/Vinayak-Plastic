/**
 * BreadcrumbList JSON-LD helper for the catalogue pages.
 * `item` is optional on the final (current) page.
 */
export interface Crumb {
  name: string;
  item?: string;
}

export default function BreadcrumbSchema({ crumbs }: { crumbs: Crumb[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.item ? { item: c.item } : {})
    }))
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}