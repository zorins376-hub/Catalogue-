import { describe, expect, it } from 'vitest';
import { gridDims } from './templates';

describe('gridDims', () => {
  it('derives cols/rows from the grid template code', () => {
    expect(gridDims('grid-2x3')).toEqual({ cols: 2, rows: 3 });
    expect(gridDims('grid-3x4')).toEqual({ cols: 3, rows: 4 });
  });

  it('falls back to 3x4 for non-grid codes', () => {
    expect(gridDims('cover')).toEqual({ cols: 3, rows: 4 });
    expect(gridDims('collection-hero')).toEqual({ cols: 3, rows: 4 });
  });
});
