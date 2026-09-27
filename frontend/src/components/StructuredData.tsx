import React from 'react';
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
} from '../lib/seo';

/**
 * JSON-LD structured data (schema.org) — helps Google understand the app for
 * rich results and sitelinks. Rendered server-side in the root layout.
 */
export function StructuredData() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#webapp`,
        name: SITE_NAME,
        alternateName: `${SITE_NAME} — ${SITE_TAGLINE}`,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Document Automation',
        operatingSystem: 'Any (web browser)',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        image: `${SITE_URL}/opengraph-image`,
        inLanguage: 'en',
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description:
            'Free tier: 5 extraction jobs per day per network, powered by Google Gemini.',
        },
        featureList: [
          'Extract structured fields from source PDF documents',
          'Fill DOCX, XLSX, and PPTX templates automatically',
          'Five placeholder syntaxes ({{field}}, <<field>>, [field], {field}, __field__)',
          'Retrieval-Augmented Generation (RAG) extraction with source citations',
          'Preserves original template formatting, styles, and formulas',
          'Free tier on Google Gemini; Google-free account tier on DeepSeek',
          'Zero persistent storage — 24-hour auto-purge',
        ],
        author: {
          '@type': 'Person',
          name: 'Hanif Isya',
          url: 'https://github.com/HanifIsya',
        },
        sameAs: ['https://github.com/HanifIsya/TemplaFill'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_URL}/#webapp` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
