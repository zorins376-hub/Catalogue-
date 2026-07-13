import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

/**
 * Public image delivery (ТЗ §3/§6). No auth — these URLs go into the print HTML.
 *   GET /img/{tenant}/{product}/{id}.{ext}        → original from R2 (immutable)
 *   GET /img/{tenant}/{product}/{id}.{ext}?w=400  → on-the-fly preview via
 *                             Cloudflare Image Resizing; original never touched.
 * The path IS the R2 key (keys are "img/{tenant}/{product}/{id}.{ext}"), so the
 * router is mounted at root and matches the whole "img/…" path.
 */
export const img = new Hono<AppEnv>();

img.get('/img/*', async (c) => {
  const key = c.req.path.replace(/^\//, ''); // drop leading slash → R2 key
  if (!key.startsWith('img/')) return c.notFound();

  const width = Number(c.req.query('w'));
  if (Number.isFinite(width) && width > 0) {
    // Resize the original by fetching its raw variant through Image Resizing.
    const base = c.env.PUBLIC_BASE_URL.replace(/\/$/, '');
    const origin = `${base}/${key}`;
    const resized = await fetch(origin, {
      cf: { image: { width: Math.round(width), fit: 'scale-down', format: 'auto' } },
    } as unknown as RequestInit);
    if (resized.ok) {
      const headers = new Headers(resized.headers);
      headers.set('Cache-Control', 'public, max-age=86400');
      return new Response(resized.body, { status: 200, headers });
    }
    // Image Resizing unavailable (e.g. local dev) — fall through to the original.
  }

  const object = await c.env.BUCKET.get(key);
  if (!object) return c.notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});
