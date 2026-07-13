import { describe, expect, it } from 'vitest';
import {
  PAGE_FORMATS,
  fullBleedCellMm,
  gridCellMm,
  mediaBox,
  trimSize,
} from './formats';

describe('formats (ТЗ §5/§8 Q1)', () => {
  it('exposes all supported formats', () => {
    expect(PAGE_FORMATS).toEqual(['A4', 'A5', 'A3', 'square']);
  });

  it('A4 trim is 210×297 portrait and swaps in landscape', () => {
    expect(trimSize('A4', 'portrait')).toEqual({ widthMm: 210, heightMm: 297 });
    expect(trimSize('A4', 'landscape')).toEqual({ widthMm: 297, heightMm: 210 });
  });

  it('square ignores orientation', () => {
    expect(trimSize('square', 'landscape')).toEqual({ widthMm: 210, heightMm: 210 });
  });

  it('media box adds bleed on every side', () => {
    expect(mediaBox('A4', 'portrait', 3)).toEqual({ widthMm: 216, heightMm: 303 });
    expect(mediaBox('A5', 'portrait', 3)).toEqual({ widthMm: 154, heightMm: 216 });
  });

  it('grid cell shrinks with format and columns', () => {
    const a4 = gridCellMm('A4', 'portrait', 5, 3);
    expect(a4.widthMm).toBeCloseTo(60.67, 1);
    const a5 = gridCellMm('A5', 'portrait', 5, 3);
    expect(a5.widthMm).toBeLessThan(a4.widthMm); // A5 cells are smaller
    // media height is 4:3 of the width
    expect(a4.heightMm).toBeCloseTo(a4.widthMm * 0.75, 5);
  });

  it('full-bleed cell equals the media box', () => {
    expect(fullBleedCellMm('A4', 'portrait', 3)).toEqual({ widthMm: 216, heightMm: 303 });
  });
});
