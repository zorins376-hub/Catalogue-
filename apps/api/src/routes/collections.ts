import { Hono } from 'hono';
import { collectionInputSchema, reorderSchema } from '@wasser/shared';
import type { AppEnv } from '../types.js';
import { ok } from '../lib/response.js';
import { parse } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  reorderCollections,
  updateCollection,
} from '../db/collections.js';

export const collections = new Hono<AppEnv>();

collections.get('/', async (c) => ok(c, await listCollections(c.env.DB, c.get('tenantId'))));

collections.post('/', async (c) => {
  const input = parse(collectionInputSchema, await c.req.json());
  return ok(c, await createCollection(c.env.DB, c.get('tenantId'), input), 201);
});

collections.put('/reorder', async (c) => {
  const { ids } = parse(reorderSchema, await c.req.json());
  await reorderCollections(c.env.DB, c.get('tenantId'), ids);
  return ok(c, { reordered: ids.length });
});

collections.get('/:id', async (c) => {
  const row = await getCollection(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!row) throw notFound('Collection');
  return ok(c, row);
});

collections.put('/:id', async (c) => {
  const input = parse(collectionInputSchema.partial(), await c.req.json());
  const row = await updateCollection(c.env.DB, c.get('tenantId'), c.req.param('id'), input);
  if (!row) throw notFound('Collection');
  return ok(c, row);
});

collections.delete('/:id', async (c) => {
  const done = await deleteCollection(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!done) throw notFound('Collection');
  return ok(c, { deleted: true });
});
