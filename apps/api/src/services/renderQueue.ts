import type { Env } from '../types.js';
import type { ExportKind } from '@wasser/shared';
import { createExport, setExportStatus } from '../db/exports.js';
import { newId } from '../lib/id.js';

const TOKEN_TTL_SECONDS = 600; // one-time render token lives 10 min (ТЗ §3/§5)
const tokenKey = (token: string) => `render-token:${token}`;

export interface RenderTicket {
  exportId: string;
  token: string;
  /** URL the Browser Rendering worker navigates to. */
  printUrl: string;
}

/**
 * Start a render: create the export row, mint a one-time token in KV, and hand
 * back the /print URL. The heavy Browser Rendering step runs in the background
 * (ctx.waitUntil) so the HTTP request returns immediately with the export id.
 */
export async function enqueueRender(
  env: Env,
  projectId: string,
  kind: ExportKind,
): Promise<RenderTicket> {
  const exp = await createExport(env.DB, projectId, kind);
  const token = newId('rtok');
  await env.KV.put(tokenKey(token), projectId, { expirationTtl: TOKEN_TTL_SECONDS });

  const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  return {
    exportId: exp.id,
    token,
    printUrl: `${base}/print/${projectId}?token=${token}`,
  };
}

/** Validate + consume a render token; returns the bound projectId or null. */
export async function consumeRenderToken(env: Env, token: string): Promise<string | null> {
  const projectId = await env.KV.get(tokenKey(token));
  if (!projectId) return null;
  // One-time use: delete on read so a token can't be replayed.
  await env.KV.delete(tokenKey(token));
  return projectId;
}

/**
 * RGB render via Browser Rendering (ТЗ §5, stage 5).
 *
 * Scaffold: the Paged.js templates and the puppeteer/Browser Rendering call
 * land in stage 5. Until then this marks the export as errored with an explicit
 * message so the API is honest rather than silently pending forever. The intended
 * flow is documented inline below.
 */
export async function runRgbRender(
  env: Env,
  ticket: RenderTicket,
): Promise<void> {
  try {
    await setExportStatus(env.DB, ticket.exportId, 'rendering');

    // --- stage 5 pipeline (to implement) --------------------------------
    // const browser = await puppeteer.launch(env.BROWSER);
    // const page = await browser.newPage();
    // await page.goto(ticket.printUrl, { waitUntil: 'networkidle0', timeout: 60_000 });
    // await page.waitForFunction('window.PagedDone === true', { timeout: 60_000 });
    // const pageCount = await page.evaluate(() => window.PagedPolyfill?.pages?.length ?? 0);
    // const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    // await browser.close();
    // const key = pdfKey(projectId, ticket.exportId, 'rgb');
    // await env.BUCKET.put(key, pdf, { httpMetadata: { contentType: 'application/pdf' } });
    // await setExportStatus(env.DB, ticket.exportId, 'done', { r2Key: key, pageCount });
    // --------------------------------------------------------------------

    await setExportStatus(env.DB, ticket.exportId, 'error', {
      error: 'RGB render pipeline not yet enabled (ТЗ stage 5).',
    });
  } catch (e) {
    await setExportStatus(env.DB, ticket.exportId, 'error', {
      error: e instanceof Error ? e.message : 'render failed',
    });
  }
}
