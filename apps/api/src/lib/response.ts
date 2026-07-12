import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiOk, ApiErr } from '@wasser/shared';

/** Success envelope: { ok: true, data }. */
export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json<ApiOk<T>>({ ok: true, data }, status);
}

/** Error envelope: { ok: false, error }. */
export function err(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ApiErr = { ok: false, error: { code, message, ...(details ? { details } : {}) } };
  return c.json(body, status);
}
