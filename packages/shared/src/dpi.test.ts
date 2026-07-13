import { describe, expect, it } from 'vitest';
import { CELL_MM, evaluatePlacement, minPx, dpiForAxis } from './dpi';

describe('dpi math (ТЗ §3)', () => {
  it('minPx matches the ТЗ reference numbers for A4 grid-3x4 cells', () => {
    expect(minPx(60)).toBe(709);
    expect(minPx(70)).toBe(827);
  });

  it('minPx scales with target dpi', () => {
    expect(minPx(25.4, 300)).toBe(300);
    expect(minPx(25.4, 150)).toBe(150);
  });

  it('dpiForAxis is px per inch of placement', () => {
    expect(Math.round(dpiForAxis(709, 60))).toBe(300);
  });

  it('flags a sufficiently large image as not low-res at its cell', () => {
    const r = evaluatePlacement({ width: 709, height: 827 }, CELL_MM['grid-3x4']!);
    expect(r.dpiAtPlacement).toBe(300);
    expect(r.lowRes).toBe(false);
  });

  it('flags a small image as low-res', () => {
    const r = evaluatePlacement({ width: 400, height: 300 }, CELL_MM['grid-3x4']!);
    expect(r.lowRes).toBe(true);
    expect(r.dpiAtPlacement).toBeLessThan(300);
  });

  it('uses the limiting axis (object-fit: cover)', () => {
    // wide but short image in a tall cell → height limits the dpi
    const r = evaluatePlacement({ width: 5000, height: 200 }, CELL_MM['grid-3x4']!);
    expect(r.dpiAtPlacement).toBe(Math.floor(dpiForAxis(200, 70)));
  });
});
