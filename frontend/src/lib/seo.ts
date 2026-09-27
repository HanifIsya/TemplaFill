/**
 * Single source of truth for all SEO / discoverability metadata.
 *
 * Used by:
 *  - app/layout.tsx            (title, description, canonical, OG, Twitter, robots, verification)
 *  - app/robots.ts             (robots.txt)
 *  - app/sitemap.ts            (sitemap.xml)
 *  - app/manifest.ts           (web app manifest)
 *  - app/opengraph-image.tsx   (social card, 1200×630)
 *  - components/StructuredData.tsx (JSON-LD)
 *
 * Google Search Console registration: see docs/7-operations/SEO.md
 */

/** Canonical production origin — override with NEXT_PUBLIC_SITE_URL (no trailing slash). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://templa-fill.vercel.app'
).replace(/\/+$/, '');

export const SITE_NAME = 'TemplaFill';

export const SITE_TITLE =
  'TemplaFill | AI PDF Data Extraction into Word, Excel & PowerPoint Templates';

export const SITE_TAGLINE = 'Extract. Map. Fill.';

export const SITE_DESCRIPTION =
  'TemplaFill extracts structured data from source PDF documents and automatically fills it into your Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) templates using Retrieval-Augmented Generation (RAG) and Google Gemini 3.6 Flash, plus a Google-free DeepSeek account tier. Free to use, no sign-up required.';

export const SITE_KEYWORDS = [
  'PDF data extraction',
  'extract data from PDF',
  'fill Word template from PDF',
  'docx template automation',
  'xlsx template filler',
  'pptx template filler',
  'document automation',
  'template population',
  'RAG document extraction',
  'AI PDF to template',
  'contract data extraction',
  'invoice data extraction',
  'document field mapping',
  'Google Gemini document AI',
];

/** Google Search Console HTML-tag verification token (content of `google-site-verification`). */
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

/** Set true when a Search Console verification token is present, so tests/docs stay honest. */
export const HAS_GOOGLE_VERIFICATION = Boolean(GOOGLE_SITE_VERIFICATION);

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** Routes that are publicly indexable (everything else is a client-side workflow state). */
export const INDEXABLE_ROUTES: Array<{
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
];

/** Search-engine bots allowed to crawl the public app. */
export const ALLOWED_BOTS = [
  'Googlebot',
  'Googlebot-Image',
  'Bingbot',
  'Slurp',
  'DuckDuckBot',
  'Applebot',
  'Baiduspider',
  'YandexBot',
];
