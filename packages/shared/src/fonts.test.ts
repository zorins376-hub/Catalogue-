import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_ID, FONTS, fontById, googleFontsHref } from './fonts';

describe('fonts (ТЗ §8 Q3)', () => {
  it('ships a broad registry with unique ids and stacks', () => {
    expect(FONTS.length).toBeGreaterThanOrEqual(15);
    const ids = FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of FONTS) expect(f.stack).toContain(f.family);
  });

  it('resolves by id and falls back to the default', () => {
    expect(fontById('lora').family).toBe('Lora');
    expect(fontById('does-not-exist').id).toBe(DEFAULT_FONT_ID);
    expect(fontById(undefined).id).toBe(DEFAULT_FONT_ID);
  });

  it('builds a valid Google Fonts URL with weights', () => {
    const href = googleFontsHref(fontById('pt-sans'));
    expect(href).toContain('https://fonts.googleapis.com/css2?family=PT+Sans');
    expect(href).toContain('wght@400;700');
    expect(href).toContain('display=swap');
  });
});
