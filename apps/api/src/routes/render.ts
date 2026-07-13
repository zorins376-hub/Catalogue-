import { Hono } from 'hono';
import { renderInputSchema } from '@wasser/shared';
import type { AppEnv } from '../types.js';
import { ok } from '../lib/response.js';
import { parse } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import { getProject } from '../db/projects.js';
import { getExport } from '../db/exports.js';
import { buildPrintData } from '../services/printData.js';
import { enqueueRender, runCmykRender, runRgbRender } from '../services/renderQueue.js';

/** Admin render endpoints, mounted under /api. */
export const render = new Hono<AppEnv>();

// Full print-data payload for the templates (ТЗ §4).
render.get('/projects/:id/print-data', async (c) => {
  const data = await buildPrintData(
    c.env.DB,
    c.get('tenantId'),
    c.env.PUBLIC_BASE_URL,
    c.req.param('id'),
  );
  return ok(c, data);
});

// Kick off a render; the heavy work runs after the response (waitUntil).
render.post('/projects/:id/render', async (c) => {
  const project = await getProject(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!project) throw notFound('Project');
  const { kind } = parse(renderInputSchema, await c.req.json().catch(() => ({})));

  const ticket = await enqueueRender(c.env, project.id, kind);
  if (kind === 'cmyk') {
    c.executionCtx.waitUntil(runCmykRender(c.env, ticket));
  } else {
    c.executionCtx.waitUntil(runRgbRender(c.env, ticket));
  }
  return ok(c, { export_id: ticket.exportId, status: 'pending', kind }, 202);
});

// Export status + download link (ТЗ §3).
render.get('/exports/:id', async (c) => {
  const exp = await getExport(c.env.DB, c.req.param('id'));
  if (!exp) throw notFound('Export');
  const base = c.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const downloadUrl =
    exp.status === 'done' && exp.r2_key ? `${base}/api/exports/${exp.id}/download` : null;
  return ok(c, { ...exp, downloadUrl });
});

// Stream the rendered PDF from R2 (admin only — this router is behind auth).
render.get('/exports/:id/download', async (c) => {
  const exp = await getExport(c.env.DB, c.req.param('id'));
  if (!exp || !exp.r2_key) throw notFound('Export PDF');
  const object = await c.env.BUCKET.get(exp.r2_key);
  if (!object) throw notFound('Export PDF');
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${exp.project_id}-${exp.kind}.pdf"`,
    },
  });
});
