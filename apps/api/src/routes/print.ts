import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { DEFAULT_TENANT_ID } from '../types.js';
import { buildPrintData } from '../services/printData.js';
import { consumeRenderToken } from '../services/renderQueue.js';
import { renderPrintHtml } from '../print/renderHtml.js';

/**
 * Public print page (ТЗ §3/§5). Opened by the Browser Rendering worker with a
 * one-time token (10-min TTL, KV). Also accepts the admin bearer token so a
 * human can preview the exact HTML in a browser.
 */
export const print = new Hono<AppEnv>();

print.get('/print/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const token = c.req.query('token');

  let authorized = false;
  if (token) {
    const bound = await consumeRenderToken(c.env, token);
    authorized = bound === projectId;
  } else {
    // Allow a logged-in admin to preview without minting a render token.
    const header = c.req.header('Authorization') ?? '';
    authorized = header === `Bearer ${c.env.ADMIN_TOKEN}` && !!c.env.ADMIN_TOKEN;
  }
  if (!authorized) return c.text('Unauthorized', 401);

  const data = await buildPrintData(c.env.DB, DEFAULT_TENANT_ID, c.env.PUBLIC_BASE_URL, projectId);
  return c.html(renderPrintHtml(data));
});
