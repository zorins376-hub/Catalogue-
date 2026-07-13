/**
 * Read image dimensions straight from the file header — no decoding (ТЗ §3).
 * Supports JPEG, PNG and WebP (VP8 / VP8L / VP8X). Everything the catalog
 * accepts on upload goes through here so product_images.width/height are exact.
 */

export interface ImageMeta {
  mime: string;
  width: number;
  height: number;
}

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isAcceptedImageMime(mime: string): boolean {
  return ACCEPTED.has(mime.toLowerCase());
}

/** File extension for an accepted image mime (used in the R2 key). */
export function extForMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

/** Returns dimensions + detected mime, or null if the format is unrecognised. */
export function readImageMeta(buf: Uint8Array): ImageMeta | null {
  return readPng(buf) ?? readJpeg(buf) ?? readWebp(buf);
}

/* ------------------------------- PNG ------------------------------- */

function readPng(buf: Uint8Array): ImageMeta | null {
  // signature: 89 50 4E 47 0D 0A 1A 0A, then IHDR at byte 16 (width) / 20 (height)
  if (buf.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (!width || !height) return null;
  return { mime: 'image/png', width, height };
}

/* ------------------------------- JPEG ------------------------------ */

function readJpeg(buf: Uint8Array): ImageMeta | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null; // SOI
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++; // skip padding / fill bytes until next marker
      continue;
    }
    const marker = buf[offset + 1]!;
    // Start-of-Frame markers carry dimensions (skip DHT/DAC/RST/SOS).
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      // [FF][SOF][len:2][precision:1][height:2][width:2]
      const height = view.getUint16(offset + 5, false);
      const width = view.getUint16(offset + 7, false);
      if (!width || !height) return null;
      return { mime: 'image/jpeg', width, height };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2; // standalone markers, no length
      continue;
    }
    const segLen = view.getUint16(offset + 2, false);
    if (segLen < 2) return null;
    offset += 2 + segLen;
  }
  return null;
}

/* ------------------------------- WebP ------------------------------ */

function readWebp(buf: Uint8Array): ImageMeta | null {
  if (buf.length < 30) return null;
  // "RIFF"...."WEBP"
  if (
    buf[0] !== 0x52 || buf[1] !== 0x49 || buf[2] !== 0x46 || buf[3] !== 0x46 ||
    buf[8] !== 0x57 || buf[9] !== 0x45 || buf[10] !== 0x42 || buf[11] !== 0x50
  ) {
    return null;
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const fourcc = String.fromCharCode(buf[12]!, buf[13]!, buf[14]!, buf[15]!);

  if (fourcc === 'VP8 ') {
    // lossy: dimensions after the 3-byte start code at chunk offset 20+3
    const width = view.getUint16(26, true) & 0x3fff;
    const height = view.getUint16(28, true) & 0x3fff;
    if (!width || !height) return null;
    return { mime: 'image/webp', width, height };
  }
  if (fourcc === 'VP8L') {
    // lossless: 14-bit width/height packed after the 0x2f signature byte at 20
    if (buf[20] !== 0x2f) return null;
    const b0 = buf[21]!, b1 = buf[22]!, b2 = buf[23]!, b3 = buf[24]!;
    const bits = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { mime: 'image/webp', width, height };
  }
  if (fourcc === 'VP8X') {
    // extended: canvas size = 24-bit little-endian (value + 1) at offset 24 / 27
    const width = 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16));
    const height = 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16));
    return { mime: 'image/webp', width, height };
  }
  return null;
}
