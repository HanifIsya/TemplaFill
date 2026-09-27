import { renderSocialImage, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from '../lib/ogImage';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Twitter/X card image (file-based metadata convention).
 * Same 1200×630 artwork as the Open Graph image.
 */
export default function Image() {
  return renderSocialImage();
}
