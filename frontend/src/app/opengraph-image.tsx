import { renderSocialImage, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from '../lib/ogImage';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Open Graph image for the landing route (file-based metadata convention).
 * Generated at build time; the URL is hashed and injected into og:image.
 */
export default function Image() {
  return renderSocialImage();
}
