import type { ProductImage } from '@wasser/shared';
import { newId } from '../lib/id.js';

export interface NewImage {
  productId: string;
  r2Key: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
}

export async function getImage(db: D1Database, id: string): Promise<ProductImage | null> {
  return db
    .prepare('SELECT * FROM product_images WHERE id = ?')
    .bind(id)
    .first<ProductImage>();
}

/**
 * Insert an image row. The first image on a product becomes primary
 * automatically; sort_order appends to the end of the product's images.
 */
export async function createImage(db: D1Database, id: string, input: NewImage): Promise<ProductImage> {
  const row = await db
    .prepare(
      'SELECT COUNT(*) AS n, COALESCE(MAX(sort_order), -1) AS maxSort FROM product_images WHERE product_id = ?',
    )
    .bind(input.productId)
    .first<{ n: number; maxSort: number }>();
  const isPrimary = (row?.n ?? 0) === 0 ? 1 : 0;
  const sortOrder = (row?.maxSort ?? -1) + 1;

  await db
    .prepare(
      `INSERT INTO product_images
         (id, product_id, r2_key, mime, width, height, bytes, is_primary, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.productId,
      input.r2Key,
      input.mime,
      input.width,
      input.height,
      input.bytes,
      isPrimary,
      sortOrder,
    )
    .run();
  return (await getImage(db, id))!;
}

/** Set is_primary / sort_order. Setting primary clears it on the product's other images. */
export async function updateImage(
  db: D1Database,
  id: string,
  input: { is_primary?: boolean; sort_order?: number },
): Promise<ProductImage | null> {
  const existing = await getImage(db, id);
  if (!existing) return null;

  const statements: D1PreparedStatement[] = [];
  if (input.is_primary === true) {
    statements.push(
      db
        .prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ? AND id != ?')
        .bind(existing.product_id, id),
    );
    statements.push(
      db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').bind(id),
    );
  } else if (input.is_primary === false) {
    statements.push(
      db.prepare('UPDATE product_images SET is_primary = 0 WHERE id = ?').bind(id),
    );
  }
  if (input.sort_order !== undefined) {
    statements.push(
      db
        .prepare('UPDATE product_images SET sort_order = ? WHERE id = ?')
        .bind(input.sort_order, id),
    );
  }
  if (statements.length) await db.batch(statements);
  return getImage(db, id);
}

export async function deleteImage(db: D1Database, id: string): Promise<ProductImage | null> {
  const existing = await getImage(db, id);
  if (!existing) return null;
  await db.prepare('DELETE FROM product_images WHERE id = ?').bind(id).run();

  // If we removed the primary, promote the next image so a product always has one.
  if (existing.is_primary === 1) {
    const next = await db
      .prepare(
        'SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order, created_at LIMIT 1',
      )
      .bind(existing.product_id)
      .first<{ id: string }>();
    if (next) {
      await db
        .prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?')
        .bind(next.id)
        .run();
    }
  }
  return existing;
}
