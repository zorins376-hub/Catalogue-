import type { Hono } from 'hono';

/** Cloudflare bindings declared in wrangler.toml (ТЗ §6). */
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  KV: KVNamespace;
  BROWSER: Fetcher;
  ADMIN_TOKEN: string;
  PUBLIC_BASE_URL: string;
}

/** Values set on the Hono context by middleware. */
export interface Variables {
  tenantId: number;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
export type App = Hono<AppEnv>;

/** MVP is single-tenant; tenant_id is baked in everywhere for later (§2). */
export const DEFAULT_TENANT_ID = 1;
