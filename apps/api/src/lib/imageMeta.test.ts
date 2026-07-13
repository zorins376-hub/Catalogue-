import { describe, expect, it } from 'vitest';
import { extForMime, isAcceptedImageMime, readImageMeta } from './imageMeta';

function png(w: number, h: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, w, false);
  dv.setUint32(20, h, false);
  return b;
}

function jpegSof0(w: number, h: number): Uint8Array {
  // SOI + tiny APP0 + SOF0 carrying height/width
  const b = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08];
  b.push((h >> 8) & 0xff, h & 0xff, (w >> 8) & 0xff, w & 0xff, 0x03);
  return new Uint8Array(b);
}

function webpVp8x(w: number, h: number): Uint8Array {
  const b = new Uint8Array(30);
  const ascii = (s: string, off: number) => {
    for (let i = 0; i < s.length; i++) b[off + i] = s.charCodeAt(i);
  };
  ascii('RIFF', 0);
  ascii('WEBP', 8);
  ascii('VP8X', 12);
  const wm = w - 1;
  const hm = h - 1;
  b[24] = wm & 0xff;
  b[25] = (wm >> 8) & 0xff;
  b[26] = (wm >> 16) & 0xff;
  b[27] = hm & 0xff;
  b[28] = (hm >> 8) & 0xff;
  b[29] = (hm >> 16) & 0xff;
  return b;
}

describe('imageMeta header parser (ТЗ §3)', () => {
  it('reads PNG dimensions', () => {
    expect(readImageMeta(png(800, 600))).toEqual({ mime: 'image/png', width: 800, height: 600 });
  });

  it('reads baseline JPEG dimensions from SOF0', () => {
    expect(readImageMeta(jpegSof0(1200, 1600))).toEqual({
      mime: 'image/jpeg',
      width: 1200,
      height: 1600,
    });
  });

  it('reads extended WebP (VP8X) canvas size', () => {
    expect(readImageMeta(webpVp8x(1234, 567))).toEqual({
      mime: 'image/webp',
      width: 1234,
      height: 567,
    });
  });

  it('returns null for unrecognised data', () => {
    expect(readImageMeta(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull();
  });

  it('accepts only the three supported mimes and maps extensions', () => {
    expect(isAcceptedImageMime('image/jpeg')).toBe(true);
    expect(isAcceptedImageMime('image/gif')).toBe(false);
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('image/png')).toBe('png');
    expect(extForMime('image/webp')).toBe('webp');
  });
});
