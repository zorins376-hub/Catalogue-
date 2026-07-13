import puppeteer from '@cloudflare/puppeteer';
import type { Env } from '../types.js';
import type { ExportKind } from '@wasser/shared';
import { createExport, setExportStatus } from '../db/exports.js';
import { newId } from '../lib/id.js';
import { pdfKey } from './r2.js';

const TOKEN_TTL_SECONDS = 600; // one-time render token lives 10 min (ТЗ §3/§5)
const RENDER_TIMEOUT_MS = 60_000; // render budget (ТЗ §5)
const tokenKey = (token: string) => `render-token:${token}`;

export interface RenderTicket {
  exportId: string;
  projectId: string;
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
    projectId,
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
 * RGB render via Browser Rendering (ТЗ §5).
 *
 * Loads the /print page in a headless browser, waits for Paged.js to finish
 * pagination (window.PagedDone), then prints to PDF using the CSS page size
 * (which already includes bleed). The PDF goes to R2 and the export row is
 * marked done with the physical page count. Runs in the background via
 * ctx.waitUntil; all failures land in exports.error rather than hanging.
 */
export async function runRgbRender(env: Env, ticket: RenderTicket): Promise<void> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    await setExportStatus(env.DB, ticket.exportId, 'rendering');

    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.goto(ticket.printUrl, { waitUntil: 'networkidle0', timeout: RENDER_TIMEOUT_MS });
    // The /print page flips this once Paged.js has laid out every page.
    await page.waitForFunction('window.PagedDone === true', { timeout: RENDER_TIMEOUT_MS });

    // String form so the callback isn't type-checked against the Worker lib
    // (no DOM types here); it runs in the page context.
    const pageCount = Number(
      await page.evaluate('document.querySelectorAll(".pagedjs_page").length'),
    );

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });

    const key = pdfKey(ticket.projectId, ticket.exportId, 'rgb');
    await env.BUCKET.put(key, pdf, { httpMetadata: { contentType: 'application/pdf' } });

    await setExportStatus(env.DB, ticket.exportId, 'done', { r2Key: key, pageCount });
  } catch (e) {
    await setExportStatus(env.DB, ticket.exportId, 'error', {
      error: e instanceof Error ? e.message : 'render failed',
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
