import { extForMime } from '../lib/imageMeta.js';

/** R2 key for an original image: img/{tenantId}/{productId}/{imageId}.{ext} (ТЗ §6). */
export function imageKey(
  tenantId: number,
  productId: string,
  imageId: string,
  mime: string,
): string {
  return `img/${tenantId}/${productId}/${imageId}.${extForMime(mime)}`;
}

/** R2 key for a rendered PDF: pdf/{projectId}/{exportId}-{kind}.pdf (ТЗ §6). */
export function pdfKey(projectId: string, exportId: string, kind: string): string {
  return `pdf/${projectId}/${exportId}-${kind}.pdf`;
}

/**
 * Public URL through the Worker's /img/ route. `w` requests an on-the-fly
 * preview via Cloudflare Image Resizing (originals are never re-compressed).
 */
export function imageUrl(baseUrl: string, r2Key: string, w?: number): string {
  // r2Key already starts with "img/", so it maps 1:1 onto the /img/* route.
  const base = baseUrl.replace(/\/$/, '');
  const url = `${base}/${r2Key}`;
  return w ? `${url}?w=${w}` : url;
}

export async function putObject(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer | Uint8Array,
  mime: string,
): Promise<void> {
  await bucket.put(key, body, { httpMetadata: { contentType: mime } });
}
