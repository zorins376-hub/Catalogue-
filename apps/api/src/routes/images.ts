import { Hono } from 'hono';
import { imageUpdateSchema } from '@wasser/shared';
import type { AppEnv } from '../types.js';
import { ok } from '../lib/response.js';
import { parse } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import { deleteImage, updateImage } from '../db/images.js';

export const images = new Hono<AppEnv>();

images.put('/:id', async (c) => {
  const input = parse(imageUpdateSchema, await c.req.json());
  const row = await updateImage(c.env.DB, c.req.param('id'), input);
  if (!row) throw notFound('Image');
  return ok(c, row);
});

images.delete('/:id', async (c) => {
  const removed = await deleteImage(c.env.DB, c.req.param('id'));
  if (!removed) throw notFound('Image');
  // Best-effort: drop the original from R2 (row is already gone).
  await c.env.BUCKET.delete(removed.r2_key).catch(() => {});
  return ok(c, { deleted: true });
});
