import type { MetadataRoute } from 'next';
import { getHierarchyData } from '@/lib/hierarchy';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hierarchy = await getHierarchyData();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 }
  ];

  const categoryRoutes: MetadataRoute.Sitemap = hierarchy.categories.map((category) => ({
    url: `${SITE_URL}${category.href}`,
    changeFrequency: 'weekly',
    priority: 0.8
  }));

  const seriesRoutes: MetadataRoute.Sitemap = hierarchy.series.map((series) => ({
    url: `${SITE_URL}${series.href}`,
    changeFrequency: 'weekly',
    priority: 0.7
  }));

  const modelRoutes: MetadataRoute.Sitemap = hierarchy.variants.map((variant) => ({
    url: `${SITE_URL}${variant.href}`,
    changeFrequency: 'monthly',
    priority: 0.6
  }));

  return [...staticRoutes, ...categoryRoutes, ...seriesRoutes, ...modelRoutes];
}
