/**
 * Page formats + geometry (ТЗ §5, extended for multi-format per open-question 1).
 *
 * The catalog now supports several trim sizes and both orientations. Everything
 * downstream — the @page size, the content box, the grid cell size used for DPI
 * warnings — derives from the numbers here, so adding a format is a one-line
 * change and never touches the API or templates.
 */

export type PageFormat = 'A4' | 'A5' | 'A3' | 'square';
export type Orientation = 'portrait' | 'landscape';

export interface SizeMm {
  widthMm: number;
  heightMm: number;
}

/** Trim sizes in portrait orientation (mm). */
export const TRIM_SIZES: Record<PageFormat, SizeMm> = {
  A4: { widthMm: 210, heightMm: 297 },
  A5: { widthMm: 148, heightMm: 210 },
  A3: { widthMm: 297, heightMm: 420 },
  square: { widthMm: 210, heightMm: 210 },
};

export const PAGE_FORMATS = Object.keys(TRIM_SIZES) as PageFormat[];

/** Trim size for a format + orientation (square ignores orientation). */
export function trimSize(format: PageFormat, orientation: Orientation = 'portrait'): SizeMm {
  const base = TRIM_SIZES[format];
  if (orientation === 'landscape' && format !== 'square') {
    return { widthMm: base.heightMm, heightMm: base.widthMm };
  }
  return { ...base };
}

/** Media box = trim + bleed on every side (this is the CSS @page size). */
export function mediaBox(
  format: PageFormat,
  orientation: Orientation,
  bleedMm: number,
): SizeMm {
  const t = trimSize(format, orientation);
  return { widthMm: t.widthMm + bleedMm * 2, heightMm: t.heightMm + bleedMm * 2 };
}

/** Printable margin used by grid pages: safe zone + 3 mm inner padding. */
export function gridMarginMm(safeMm: number): number {
  return safeMm + 3;
}

export const GRID_GAP_MM = 6;
/** Product card media is a 4:3 box of the column width. */
export const CARD_MEDIA_RATIO = 3 / 4;

/**
 * Size (mm) of the image slot in one grid cell, for the given format/columns.
 * Width = column width after margins + gaps; height = 4:3 of that width, which
 * is exactly what the card CSS renders (`aspect-ratio: 4/3`). Used to compute
 * dpiAtPlacement so DPI warnings are correct for every format, not just A4.
 */
export function gridCellMm(
  format: PageFormat,
  orientation: Orientation,
  safeMm: number,
  cols: number,
): SizeMm {
  const t = trimSize(format, orientation);
  const margin = gridMarginMm(safeMm);
  const contentW = t.widthMm - margin * 2;
  const cellW = (contentW - (cols - 1) * GRID_GAP_MM) / Math.max(cols, 1);
  return { widthMm: cellW, heightMm: cellW * CARD_MEDIA_RATIO };
}

/** Full-bleed slot (cover / collection hero) = the whole media box. */
export function fullBleedCellMm(
  format: PageFormat,
  orientation: Orientation,
  bleedMm: number,
): SizeMm {
  return mediaBox(format, orientation, bleedMm);
}
