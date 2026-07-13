/**
 * Print resolution math (ТЗ §3).
 *
 * DPI warnings are computed at placement time — not on upload — because the
 * required resolution depends on the size of the cell the image lands in.
 */

export const TARGET_DPI = 300;
export const MM_PER_INCH = 25.4;

/** Minimum pixels needed along one side to hit TARGET_DPI at a given mm size. */
export function minPx(sizeMm: number, dpi: number = TARGET_DPI): number {
  return Math.ceil((sizeMm / MM_PER_INCH) * dpi);
}

/**
 * Effective DPI when an image of `px` is displayed over `mm` on one axis.
 * dpi = px / (mm / 25.4)
 */
export function dpiForAxis(px: number, mm: number): number {
  if (mm <= 0) return Infinity;
  return (px * MM_PER_INCH) / mm;
}

export interface Placement {
  /** cell width in millimetres */
  widthMm: number;
  /** cell height in millimetres */
  heightMm: number;
}

export interface ImagePx {
  width: number;
  height: number;
}

export interface DpiResult {
  /**
   * Effective DPI at this placement. With `object-fit: cover` the image must
   * fill the whole cell, so the limiting axis (the one that has to stretch
   * furthest) determines the real resolution — hence the min.
   */
  dpiAtPlacement: number;
  lowRes: boolean;
}

/** Compute placement DPI + low-res flag for an image dropped into a cell. */
export function evaluatePlacement(
  image: ImagePx,
  placement: Placement,
  targetDpi: number = TARGET_DPI,
): DpiResult {
  const dpi = Math.min(
    dpiForAxis(image.width, placement.widthMm),
    dpiForAxis(image.height, placement.heightMm),
  );
  const dpiAtPlacement = Math.floor(dpi);
  return { dpiAtPlacement, lowRes: dpiAtPlacement < targetDpi };
}

/**
 * Nominal cell geometry per template (ТЗ §3). These are the approximate content
 * sizes on A4; keep them here so both the API (print-data) and any UI preview
 * agree on the numbers. When a template's real cell size is known it can be
 * passed to evaluatePlacement directly instead.
 */
export const CELL_MM: Record<string, Placement> = {
  'grid-3x4': { widthMm: 60, heightMm: 70 },
  'grid-2x3': { widthMm: 90, heightMm: 85 },
  'collection-hero': { widthMm: 216, heightMm: 303 },
  cover: { widthMm: 216, heightMm: 303 },
};
