import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_DESCRIPTION, SITE_TAGLINE } from '../lib/seo';

/**
 * Web app manifest — name, icons, and colors used by browsers and some
 * search surfaces. Kept intentionally minimal (single-page tool).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0F17',
    theme_color: '#0B0F17',
    categories: ['productivity', 'business', 'utilities'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
