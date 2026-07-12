import { Hono } from 'hono';
import {
  productInputSchema,
  productStatusSchema,
  productUpdateSchema,
  reorderSchema,
} from '@wasser/shared';
import type { AppEnv } from '../types.js';
import { ok } from '../lib/response.js';
import { parse } from '../lib/validate.js';
import { badRequest, notFound, payloadTooLarge, unprocessable } from '../lib/errors.js';
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProductWithImages,
  listImages,
  listProducts,
  reorderProducts,
  updateProduct,
  type ProductFilters,
} from '../db/products.js';
import { createImage } from '../db/images.js';
import { isAcceptedImageMime, readImageMeta } from '../lib/imageMeta.js';
import { imageKey, putObject } from '../services/r2.js';
import { newId } from '../lib/id.js';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB (ТЗ §3)

export const products = new Hono<AppEnv>();

products.get('/', async (c) => {
  const filters: ProductFilters = {};
  const collectionId = c.req.query('collection_id');
  const categoryId = c.req.query('category_id');
  const q = c.req.query('q');
  const status = c.req.query('status');
  if (collectionId) filters.collectionId = collectionId;
  if (categoryId) filters.categoryId = categoryId;
  if (q) filters.q = q;
  if (status) {
    const parsed = productStatusSchema.safeParse(status);
    if (parsed.success) filters.status = parsed.data;
  }
  return ok(c, await listProducts(c.env.DB, c.get('tenantId'), filters));
});

products.post('/', async (c) => {
  const input = parse(productInputSchema, await c.req.json());
  return ok(c, await createProduct(c.env.DB, c.get('tenantId'), input), 201);
});

products.put('/reorder', async (c) => {
  const { ids } = parse(reorderSchema, await c.req.json());
  await reorderProducts(c.env.DB, c.get('tenantId'), ids);
  return ok(c, { reordered: ids.length });
});

products.get('/:id', async (c) => {
  const row = await getProductWithImages(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!row) throw notFound('Product');
  return ok(c, row);
});

products.put('/:id', async (c) => {
  const input = parse(productUpdateSchema, await c.req.json());
  const row = await updateProduct(c.env.DB, c.get('tenantId'), c.req.param('id'), input);
  if (!row) throw notFound('Product');
  return ok(c, row);
});

products.delete('/:id', async (c) => {
  const done = await deleteProduct(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!done) throw notFound('Product');
  return ok(c, { deleted: true });
});

// ---- product images -----------------------------------------------------

products.get('/:id/images', async (c) => {
  const product = await getProduct(c.env.DB, c.get('tenantId'), c.req.param('id'));
  if (!product) throw notFound('Product');
  return ok(c, await listImages(c.env.DB, product.id));
});

/**
 * multipart upload → Worker → R2 (ТЗ §3). Worker reads width/height straight
 * from the file header (no decode), enforces the 25 MB limit, stores the
 * original untouched in R2 and records the dimensions in D1.
 */
products.post('/:id/images', async (c) => {
  const tenantId = c.get('tenantId');
  const product = await getProduct(c.env.DB, tenantId, c.req.param('id'));
  if (!product) throw notFound('Product');

  const form = await c.req.formData();
  const entry = form.get('file');
  if (!entry || typeof entry === 'string') {
    throw badRequest('Expected a "file" field (multipart/form-data)');
  }
  // Structural view of the uploaded Blob/File (avoids lib File-type ambiguity).
  const file = entry as unknown as { size: number; arrayBuffer(): Promise<ArrayBuffer> };
  if (file.size > MAX_IMAGE_BYTES) {
    throw payloadTooLarge(`Image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)} MB limit`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const meta = readImageMeta(bytes);
  if (!meta) throw unprocessable('Unrecognised image format (expected JPEG, PNG or WebP)');
  if (!isAcceptedImageMime(meta.mime)) throw unprocessable(`Unsupported image type: ${meta.mime}`);

  const imageId = newId('img');
  const key = imageKey(tenantId, product.id, imageId, meta.mime);
  await putObject(c.env.BUCKET, key, bytes, meta.mime);

  const image = await createImage(c.env.DB, imageId, {
    productId: product.id,
    r2Key: key,
    mime: meta.mime,
    width: meta.width,
    height: meta.height,
    bytes: file.size,
  });
  return ok(c, image, 201);
});
