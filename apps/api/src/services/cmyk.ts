import type { Env } from '../types.js';
import type { SizeMm } from '@wasser/shared';

/**
 * Send an RGB PDF to the Ghostscript container for CMYK conversion (ТЗ §7).
 * The container stamps TrimBox/BleedBox from the media geometry and returns a
 * print-ready DeviceCMYK PDF. Throws if the container binding isn't configured
 * or the conversion fails.
 */
export async function convertToCmyk(
  env: Env,
  rgbPdf: Uint8Array,
  media: SizeMm,
  bleedMm: number,
): Promise<Uint8Array> {
  if (!env.GS_CONTAINER) {
    throw new Error('CMYK container (GS_CONTAINER) is not configured');
  }
  const qs = new URLSearchParams({
    mediaWmm: String(media.widthMm),
    mediaHmm: String(media.heightMm),
    bleedMm: String(bleedMm),
  });
  const res = await env.GS_CONTAINER.fetch(`http://gs/convert?${qs.toString()}`, {
    method: 'POST',
    headers: { 'content-type': 'application/pdf' },
    body: rgbPdf,
  });
  if (!res.ok) {
    throw new Error(`CMYK conversion failed (${res.status}): ${await res.text()}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
