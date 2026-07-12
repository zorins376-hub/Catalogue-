import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types.js';
import { HttpError } from './lib/errors.js';
import { err } from './lib/response.js';
import { requireAdmin } from './lib/auth.js';
import { categories } from './routes/categories.js';
import { collections } from './routes/collections.js';
import { products } from './routes/products.js';
import { images } from './routes/images.js';
import { projects } from './routes/projects.js';
import { pages } from './routes/pages.js';
import { render } from './routes/render.js';
import { print } from './routes/print.js';
import { img } from './routes/img.js';

const app = new Hono<AppEnv>();

app.use('*', cors());

app.get('/', (c) => c.json({ ok: true, data: { service: 'wasser-catalog-api', version: '0.1.0' } }));

// Public, unauthenticated: image delivery and the print page (token-guarded).
app.route('/', img);
app.route('/', print);

// Everything under /api requires the admin bearer token (ТЗ §3 MVP auth).
const api = new Hono<AppEnv>();
api.use('*', requireAdmin);
api.route('/categories', categories);
api.route('/collections', collections);
api.route('/products', products);
api.route('/images', images);
api.route('/projects', projects);
api.route('/pages', pages);
api.route('/', render); // /projects/:id/print-data, /projects/:id/render, /exports/:id
app.route('/api', api);

// Uniform error envelope { ok:false, error } for all thrown errors.
app.onError((error, c) => {
  if (error instanceof HttpError) {
    return err(c, error.status, error.code, error.message, error.details);
  }
  console.error('Unhandled error:', error);
  return err(c, 500, 'internal', 'Internal server error');
});

app.notFound((c) => err(c, 404, 'not_found', 'Route not found'));

export default app;
