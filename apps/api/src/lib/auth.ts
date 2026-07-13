import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';
import { DEFAULT_TENANT_ID } from '../types.js';
import { unauthorized } from './errors.js';

/**
 * MVP auth (ТЗ §3): one static bearer token in the Worker secrets (ADMIN_TOKEN).
 * Real auth arrives with multitenancy after MVP. Uses a constant-time compare.
 */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expected = c.env.ADMIN_TOKEN ?? '';

  if (!expected || !token || !timingSafeEqual(token, expected)) {
    throw unauthorized('Missing or invalid bearer token');
  }

  // Single tenant for now; every query is still scoped by tenant_id (§2).
  c.set('tenantId', DEFAULT_TENANT_ID);
  await next();
};

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i]! ^ eb[i]!;
  return diff === 0;
}
