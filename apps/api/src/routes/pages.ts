import { Hono } from 'hono';
import { pageUpdateSchema } from '@wasser/shared';
import type { AppEnv } from '../types.js';
import { ok } from '../lib/response.js';
import { parse } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import { deletePage, getPage, updatePage } from '../db/pages.js';
import { touchProject } from '../db/projects.js';

export const pages = new Hono<AppEnv>();

pages.put('/:id', async (c) => {
  const existing = await getPage(c.env.DB, c.req.param('id'));
  if (!existing) throw notFound('Page');
  const input = parse(pageUpdateSchema, await c.req.json());
  const row = await updatePage(c.env.DB, existing.id, input);
  await touchProject(c.env.DB, existing.project_id);
  return ok(c, row);
});

pages.delete('/:id', async (c) => {
  const existing = await getPage(c.env.DB, c.req.param('id'));
  if (!existing) throw notFound('Page');
  await deletePage(c.env.DB, existing.id);
  await touchProject(c.env.DB, existing.project_id);
  return ok(c, { deleted: true });
});
