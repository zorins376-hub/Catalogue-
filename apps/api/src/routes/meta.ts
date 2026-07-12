import { Hono } from 'hono';
import { DEFAULT_FONT_ID, FONTS, PAGE_FORMATS, TRIM_SIZES } from '@wasser/shared';
import type { AppEnv } from '../types.js';
import { ok } from '../lib/response.js';

/**
 * Static metadata for the admin UI: available page formats and the font
 * registry (multi-format + many-fonts, ТЗ §8 Q1/Q3). Lets the project editor
 * populate its dropdowns without hardcoding the lists on the client.
 */
export const meta = new Hono<AppEnv>();

meta.get('/', (c) =>
  ok(c, {
    formats: PAGE_FORMATS.map((code) => ({ code, ...TRIM_SIZES[code] })),
    orientations: ['portrait', 'landscape'],
    fonts: FONTS.map((f) => ({ id: f.id, name: f.family, category: f.category })),
    defaultFont: DEFAULT_FONT_ID,
  }),
);
