import type {
  Attr,
  Product,
  ProductImage,
  ProductInput,
  ProductStatus,
  ProductUpdate,
  ProductWithImages,
} from '@wasser/shared';
import { attrSchema } from '@wasser/shared';
import { z } from 'zod';
import { newId } from '../lib/id.js';

interface ProductRow {
  id: string;
  tenant_id: number;
  sku: string | null;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  attrs: string; // JSON text
  category_id: string | null;
  collection_id: string | null;
  status: ProductStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const attrsArray = z.array(attrSchema);

function parseAttrs(json: string): Attr[] {
  try {
    const parsed = attrsArray.safeParse(JSON.parse(json));
    if (!parsed.success) return [];
    return [...parsed.data].sort((a, b) => a.sort - b.sort);
  } catch {
    return [];
  }
}

function mapRow(row: ProductRow): Product {
  return { ...row, attrs: parseAttrs(row.attrs) };
}

export interface ProductFilters {
  collectionId?: string;
  categoryId?: string;
  status?: ProductStatus;
  q?: string;
}

export async function listProducts(
  db: D1Database,
  tenantId: number,
  filters: ProductFilters = {},
): Promise<Product[]> {
  const where = ['tenant_id = ?'];
  const binds: unknown[] = [tenantId];
  if (filters.collectionId) {
    where.push('collection_id = ?');
    binds.push(filters.collectionId);
  }
  if (filters.categoryId) {
    where.push('category_id = ?');
    binds.push(filters.categoryId);
  }
  if (filters.status) {
    where.push('status = ?');
    binds.push(filters.status);
  }
  if (filters.q) {
    where.push('(name LIKE ? OR sku LIKE ?)');
    const like = `%${filters.q}%`;
    binds.push(like, like);
  }
  const { results } = await db
    .prepare(
      `SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY sort_order, created_at`,
    )
    .bind(...binds)
    .all<ProductRow>();
  return (results ?? []).map(mapRow);
}

export async function getProduct(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<Product | null> {
  const row = await db
    .prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<ProductRow>();
  return row ? mapRow(row) : null;
}

export async function listImages(db: D1Database, productId: string): Promise<ProductImage[]> {
  const { results } = await db
    .prepare(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order, created_at',
    )
    .bind(productId)
    .all<ProductImage>();
  return results ?? [];
}

export async function getProductWithImages(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<ProductWithImages | null> {
  const product = await getProduct(db, tenantId, id);
  if (!product) return null;
  return { ...product, images: await listImages(db, id) };
}

export async function createProduct(
  db: D1Database,
  tenantId: number,
  input: ProductInput,
): Promise<Product> {
  const id = newId('prod');
  await db
    .prepare(
      `INSERT INTO products
         (id, tenant_id, sku, name, description, price, currency, attrs,
          category_id, collection_id, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tenantId,
      input.sku ?? null,
      input.name,
      input.description ?? null,
      input.price ?? null,
      input.currency,
      JSON.stringify(input.attrs ?? []),
      input.category_id ?? null,
      input.collection_id ?? null,
      input.status,
      input.sort_order,
    )
    .run();
  return (await getProduct(db, tenantId, id))!;
}

export async function updateProduct(
  db: D1Database,
  tenantId: number,
  id: string,
  input: ProductUpdate,
): Promise<Product | null> {
  const existing = await getProduct(db, tenantId, id);
  if (!existing) return null;
  const next = {
    sku: input.sku === undefined ? existing.sku : (input.sku ?? null),
    name: input.name ?? existing.name,
    description:
      input.description === undefined ? existing.description : (input.description ?? null),
    price: input.price === undefined ? existing.price : (input.price ?? null),
    currency: input.currency ?? existing.currency,
    attrs: input.attrs ?? existing.attrs,
    category_id:
      input.category_id === undefined ? existing.category_id : (input.category_id ?? null),
    collection_id:
      input.collection_id === undefined ? existing.collection_id : (input.collection_id ?? null),
    status: input.status ?? existing.status,
    sort_order: input.sort_order ?? existing.sort_order,
  };
  await db
    .prepare(
      `UPDATE products SET
         sku = ?, name = ?, description = ?, price = ?, currency = ?, attrs = ?,
         category_id = ?, collection_id = ?, status = ?, sort_order = ?,
         updated_at = datetime('now')
       WHERE id = ? AND tenant_id = ?`,
    )
    .bind(
      next.sku,
      next.name,
      next.description,
      next.price,
      next.currency,
      JSON.stringify(next.attrs),
      next.category_id,
      next.collection_id,
      next.status,
      next.sort_order,
      id,
      tenantId,
    )
    .run();
  return getProduct(db, tenantId, id);
}

export async function deleteProduct(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function reorderProducts(
  db: D1Database,
  tenantId: number,
  ids: string[],
): Promise<void> {
  const stmt = db.prepare(
    "UPDATE products SET sort_order = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
  );
  await db.batch(ids.map((id, i) => stmt.bind(i, id, tenantId)));
}
