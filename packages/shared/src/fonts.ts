/**
 * Font registry (ТЗ §8 Q3 — "the more the better").
 *
 * No brand fonts were supplied, so we ship a broad set of high-quality,
 * full-Cyrillic families the catalog can pick from per project. For the RGB
 * pipeline these load from Google Fonts at render time (the /print page already
 * pulls Paged.js from a CDN). For CMYK/print embedding the chosen family gets
 * self-hosted + subset at stage 7 — the `id` stays stable so nothing else changes.
 *
 * All families below cover the Cyrillic range.
 */

export type FontCategory = 'sans' | 'serif' | 'display';

export interface FontDef {
  id: string;
  /** Google Fonts family name */
  family: string;
  /** CSS font-family stack (with sensible fallbacks) */
  stack: string;
  category: FontCategory;
  /** weights requested from Google Fonts */
  weights: number[];
}

function stackFor(family: string, category: FontCategory): string {
  const fallback =
    category === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : category === 'display'
        ? 'Georgia, serif'
        : '-apple-system, "Segoe UI", Roboto, sans-serif';
  return `"${family}", ${fallback}`;
}

function def(id: string, family: string, category: FontCategory, weights = [400, 700]): FontDef {
  return { id, family, category, weights, stack: stackFor(family, category) };
}

/** Curated, Cyrillic-capable families. */
export const FONTS: FontDef[] = [
  // sans
  def('inter', 'Inter', 'sans', [400, 500, 700]),
  def('pt-sans', 'PT Sans', 'sans'),
  def('roboto', 'Roboto', 'sans', [400, 500, 700]),
  def('open-sans', 'Open Sans', 'sans', [400, 600, 700]),
  def('montserrat', 'Montserrat', 'sans', [400, 600, 700]),
  def('manrope', 'Manrope', 'sans', [400, 600, 700]),
  def('golos-text', 'Golos Text', 'sans', [400, 500, 700]),
  def('nunito', 'Nunito', 'sans', [400, 600, 700]),
  def('rubik', 'Rubik', 'sans', [400, 500, 700]),
  def('fira-sans', 'Fira Sans', 'sans', [400, 500, 700]),
  def('oswald', 'Oswald', 'sans', [400, 500, 700]),
  // serif
  def('pt-serif', 'PT Serif', 'serif'),
  def('lora', 'Lora', 'serif', [400, 500, 700]),
  def('merriweather', 'Merriweather', 'serif', [400, 700]),
  def('spectral', 'Spectral', 'serif', [400, 600]),
  def('alegreya', 'Alegreya', 'serif', [400, 700]),
  // display
  def('playfair-display', 'Playfair Display', 'display', [400, 700]),
  def('cormorant', 'Cormorant', 'display', [400, 600]),
];

export const DEFAULT_FONT_ID = 'pt-sans';

export const FONT_IDS = FONTS.map((f) => f.id);

export function fontById(id?: string | null): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS.find((f) => f.id === DEFAULT_FONT_ID)!;
}

/** Google Fonts css2 URL for a font (used by the RGB print page). */
export function googleFontsHref(font: FontDef): string {
  const weights = [...new Set(font.weights)].sort((a, b) => a - b).join(';');
  const family = font.family.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
}
