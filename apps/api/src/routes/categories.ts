import { Hono } from 'hono';
import { categoryInputSchema, reorderSchema } from '@wasser/shared';
import type { AppEnv } from '../types.js';
import { ok } from '../lib/response.js';
import { parse } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from '../db/categories.js';

export const categories = new Hono<AppEnv>();

categories.get('/', async (c) => ok(c, await listCategories(c.env.DB, c.get('tenantId'))));

categories.post('/', async (c) => {
  const input = parse(categoryInputSchema, await c.req.json());
  return ok(c, await createCategory(c.env.DB, c.get('tenantId'), input), 201);
});

// reorder must be registered before /:id so "reorder" isn't captured as an id
categories.put('/reorder', async (c) => {
  const { ids } = parse(reorderSchema, await c.req.json());
  await reorderCategories(c.env.DB, c.get('tenantId'), ids);
  return ok(c, { reordered: ids.length });
});

categories.get('/:id', async (c) => {
  const row = await getCategory(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!row) throw notFound('Category');
  return ok(c, row);
});

categories.put('/:id', async (c) => {
  const input = parse(categoryInputSchema.partial(), await c.req.json());
  const row = await updateCategory(c.env.DB, c.get('tenantId'), c.req.param('id'), input);
  if (!row) throw notFound('Category');
  return ok(c, row);
});

categories.delete('/:id', async (c) => {
  const done = await deleteCategory(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!done) throw notFound('Category');
  return ok(c, { deleted: true });
});
