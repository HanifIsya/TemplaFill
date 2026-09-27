import type { MetadataRoute } from 'next';
import { SITE_URL, ALLOWED_BOTS } from '../lib/seo';

/**
 * robots.txt — allows the public app, blocks API paths, and points crawlers at
 * the sitemap. Google Search Console reads this on verification.
 *
 * Note: CSS/JS assets under `/_next/` are intentionally NOT blocked so
 * Googlebot can render the page and evaluate the metadata correctly.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/uploads/'],
      },
      ...ALLOWED_BOTS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: new URL(SITE_URL).host,
  };
}
