import { Hono } from 'hono';
import { pageInputSchema, projectInputSchema, projectUpdateSchema, reorderSchema } from '@wasser/shared';
import type { AppEnv } from '../types.js';
import { ok } from '../lib/response.js';
import { parse } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  touchProject,
  updateProject,
} from '../db/projects.js';
import { createPage, listPages, reorderPages } from '../db/pages.js';

export const projects = new Hono<AppEnv>();

projects.get('/', async (c) => ok(c, await listProjects(c.env.DB, c.get('tenantId'))));

projects.post('/', async (c) => {
  const input = parse(projectInputSchema, await c.req.json());
  return ok(c, await createProject(c.env.DB, c.get('tenantId'), input), 201);
});

projects.get('/:id', async (c) => {
  const row = await getProject(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!row) throw notFound('Project');
  return ok(c, row);
});

projects.put('/:id', async (c) => {
  const input = parse(projectUpdateSchema, await c.req.json());
  const row = await updateProject(c.env.DB, c.get('tenantId'), c.req.param('id'), input);
  if (!row) throw notFound('Project');
  return ok(c, row);
});

projects.delete('/:id', async (c) => {
  const done = await deleteProject(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!done) throw notFound('Project');
  return ok(c, { deleted: true });
});

// ---- pages (scoped to a project) ---------------------------------------

projects.get('/:id/pages', async (c) => {
  const project = await getProject(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!project) throw notFound('Project');
  return ok(c, await listPages(c.env.DB, project.id));
});

projects.post('/:id/pages', async (c) => {
  const project = await getProject(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!project) throw notFound('Project');
  const input = parse(pageInputSchema, await c.req.json());
  const page = await createPage(c.env.DB, project.id, input);
  await touchProject(c.env.DB, project.id);
  return ok(c, page, 201);
});

projects.put('/:id/pages/reorder', async (c) => {
  const project = await getProject(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!project) throw notFound('Project');
  const { ids } = parse(reorderSchema, await c.req.json());
  await reorderPages(c.env.DB, project.id, ids);
  await touchProject(c.env.DB, project.id);
  return ok(c, { reordered: ids.length });
});
