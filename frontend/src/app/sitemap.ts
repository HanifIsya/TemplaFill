import type { MetadataRoute } from 'next';
import { SITE_URL, INDEXABLE_ROUTES } from '../lib/seo';

/**
 * sitemap.xml — one entry per publicly indexable route.
 * The app is a single-page workflow, so only the landing route is listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
