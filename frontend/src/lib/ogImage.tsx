import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from './seo';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const OG_CONTENT_TYPE = 'image/png';

/**
 * Shared Open Graph / Twitter card renderer (1200×630).
 * Uses flexbox only — the subset Satori supports.
 */
export function renderSocialImage() {
  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0B0F17',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#60A5FA',
              marginBottom: 28,
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 700,
              color: '#F8FAFC',
              marginBottom: 24,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 34,
              color: '#CBD5E1',
              lineHeight: 1.4,
              maxWidth: 980,
            }}
          >
            Extract structured data from source PDFs and fill Word, Excel &amp;
            PowerPoint templates automatically — powered by RAG.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid #1E3A8A',
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', fontSize: 26, color: '#94A3B8' }}>
            PDF → DOCX · XLSX · PPTX
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#60A5FA' }}>
            {host}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
