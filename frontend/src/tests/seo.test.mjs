import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// SEO / discoverability suite — guarantees the Search Console prerequisites
// stay in place: metadata, canonical, robots, sitemap, JSON-LD, and the
// Google site-verification hook. See docs/7-operations/SEO.md
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '../app');
const LIB_DIR = path.resolve(__dirname, '../lib');

const seoSrc = fs.readFileSync(path.join(LIB_DIR, 'seo.ts'), 'utf8');
const layoutSrc = fs.readFileSync(path.join(APP_DIR, 'layout.tsx'), 'utf8');
const structuredDataSrc = fs.readFileSync(
  path.resolve(__dirname, '../components/StructuredData.tsx'),
  'utf8',
);

function readAppFile(name) {
  const file = path.join(APP_DIR, name);
  assert.ok(fs.existsSync(file), `missing app file: ${name}`);
  return fs.readFileSync(file, 'utf8');
}

// Mirrors lib/seo.ts constants (DOM-free, no TS toolchain needed).
function seoString(key) {
  const re = new RegExp(`${key}[\\s\\S]*?['"]([^'"]+)['"]`);
  const m = seoSrc.match(re);
  assert.ok(m, `lib/seo.ts is missing ${key}`);
  return m[1];
}

test('S1 — canonical site URL is https and has no trailing slash', () => {
  const url = seoString('SITE_URL');
  assert.ok(url.startsWith('https://'), `SITE_URL must be https, got ${url}`);
  assert.ok(!url.endsWith('/'), 'SITE_URL must not end with a slash');
  assert.match(url, /^https:\/\/[a-z0-9.-]+$/i, 'SITE_URL must be an origin');
});

test('S2 — layout declares metadataBase + canonical + Googlebot directives', () => {
  assert.ok(layoutSrc.includes('metadataBase'), 'layout must set metadataBase');
  assert.ok(layoutSrc.includes("canonical: '/'"), 'layout must set a canonical path');
  assert.ok(layoutSrc.includes('googleBot'), 'layout must configure googleBot');
  assert.ok(layoutSrc.includes("'max-image-preview': 'large'"), 'large image previews');
  assert.ok(layoutSrc.includes("'max-snippet': -1"), 'unlimited snippet length');
});

test('S3 — Google Search Console verification hook is present', () => {
  assert.ok(
    seoSrc.includes('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION'),
    'lib/seo.ts must read the NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION token',
  );
  assert.ok(
    layoutSrc.includes('verification: { google: GOOGLE_SITE_VERIFICATION }'),
    'layout must emit the google-site-verification meta tag when configured',
  );
});

test('S4 — robots.ts allows crawling and points at the sitemap', () => {
  const src = readAppFile('robots.ts');
  assert.ok(src.includes('MetadataRoute.Robots'), 'must use MetadataRoute.Robots');
  assert.ok(src.includes("allow: '/'"), 'must allow the public app');
  assert.ok(src.includes("'/api/'"), 'must disallow API routes');
  assert.ok(src.includes('sitemap:'), 'must advertise the sitemap');
});

test('S5 — sitemap.ts lists the landing route with priority 1', () => {
  const src = readAppFile('sitemap.ts');
  assert.ok(src.includes('MetadataRoute.Sitemap'), 'must use MetadataRoute.Sitemap');
  const seoRoutes = fs.readFileSync(path.join(LIB_DIR, 'seo.ts'), 'utf8');
  assert.ok(seoRoutes.includes("path: '/'"), 'seo.ts must list the root route');
  assert.ok(seoRoutes.includes('priority: 1.0'), 'root route must have priority 1');
});

test('S6 — social card images exist for Open Graph and Twitter', () => {
  const og = readAppFile('opengraph-image.tsx');
  const twitter = readAppFile('twitter-image.tsx');
  for (const [name, src] of [
    ['opengraph-image.tsx', og],
    ['twitter-image.tsx', twitter],
  ]) {
    assert.ok(src.includes('renderSocialImage'), `${name} must render the shared card`);
    assert.ok(src.includes('1200') || src.includes('OG_SIZE'), `${name} must use the OG size`);
  }
  const ogLib = fs.readFileSync(path.join(LIB_DIR, 'ogImage.tsx'), 'utf8');
  assert.ok(ogLib.includes('width: 1200'), 'card width must be 1200');
  assert.ok(ogLib.includes('height: 630'), 'card height must be 630');
});

test('S7 — JSON-LD structured data describes the WebApplication', () => {
  assert.ok(structuredDataSrc.includes("'@context': 'https://schema.org'"), 'JSON-LD context');
  assert.ok(structuredDataSrc.includes("'@type': 'WebApplication'"), 'WebApplication node');
  assert.ok(structuredDataSrc.includes("'@type': 'WebSite'"), 'WebSite node');
  assert.ok(structuredDataSrc.includes('isAccessibleForFree: true'), 'free-to-use claim');
  assert.ok(structuredDataSrc.includes('offers'), 'offer node for the free tier');
  assert.ok(
    layoutSrc.includes('<StructuredData />'),
    'layout must render the JSON-LD component',
  );
});

test('S8 — metadata has title template, description, keywords, and locale', () => {
  assert.ok(layoutSrc.includes('template: `%s | ${SITE_NAME}`'), 'title template');
  assert.ok(layoutSrc.includes('SITE_DESCRIPTION'), 'description from lib/seo.ts');
  assert.ok(layoutSrc.includes('keywords: SITE_KEYWORDS'), 'keywords from lib/seo.ts');
  assert.ok(layoutSrc.includes("locale: 'en_US'"), 'Open Graph locale');
  assert.ok(layoutSrc.includes("card: 'summary_large_image'"), 'Twitter card type');
  assert.ok(seoSrc.includes('PDF data extraction'), 'keyword list must be populated');
});

test('S9 — manifest declares name, colors, and start URL', () => {
  const src = readAppFile('manifest.ts');
  assert.ok(src.includes('MetadataRoute.Manifest'), 'must use MetadataRoute.Manifest');
  assert.ok(src.includes("start_url: '/'"), 'start URL');
  assert.ok(src.includes('theme_color'), 'theme color for browser surfaces');
  assert.ok(src.includes('description: SITE_DESCRIPTION'), 'manifest description');
});
