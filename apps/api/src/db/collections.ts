import type { Collection, CollectionInput } from '@wasser/shared';
import { newId } from '../lib/id.js';

type Row = Omit<Collection, 'cover_image_id' | 'description'> & {
  cover_image_id: string | null;
  description: string | null;
};

export async function listCollections(db: D1Database, tenantId: number): Promise<Collection[]> {
  const { results } = await db
    .prepare('SELECT * FROM collections WHERE tenant_id = ? ORDER BY sort_order, created_at')
    .bind(tenantId)
    .all<Row>();
  return results ?? [];
}

export async function getCollection(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<Collection | null> {
  return db
    .prepare('SELECT * FROM collections WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<Row>();
}

export async function createCollection(
  db: D1Database,
  tenantId: number,
  input: CollectionInput,
): Promise<Collection> {
  const id = newId('coll');
  await db
    .prepare(
      `INSERT INTO collections (id, tenant_id, name, description, cover_image_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tenantId,
      input.name,
      input.description ?? null,
      input.cover_image_id ?? null,
      input.sort_order,
    )
    .run();
  return (await getCollection(db, tenantId, id))!;
}

export async function updateCollection(
  db: D1Database,
  tenantId: number,
  id: string,
  input: Partial<CollectionInput>,
): Promise<Collection | null> {
  const existing = await getCollection(db, tenantId, id);
  if (!existing) return null;
  await db
    .prepare(
      `UPDATE collections SET name = ?, description = ?, cover_image_id = ?, sort_order = ?
       WHERE id = ? AND tenant_id = ?`,
    )
    .bind(
      input.name ?? existing.name,
      input.description === undefined ? existing.description : (input.description ?? null),
      input.cover_image_id === undefined
        ? existing.cover_image_id
        : (input.cover_image_id ?? null),
      input.sort_order ?? existing.sort_order,
      id,
      tenantId,
    )
    .run();
  return getCollection(db, tenantId, id);
}

export async function deleteCollection(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM collections WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function reorderCollections(
  db: D1Database,
  tenantId: number,
  ids: string[],
): Promise<void> {
  const stmt = db.prepare(
    'UPDATE collections SET sort_order = ? WHERE id = ? AND tenant_id = ?',
  );
  await db.batch(ids.map((id, i) => stmt.bind(i, id, tenantId)));
}
