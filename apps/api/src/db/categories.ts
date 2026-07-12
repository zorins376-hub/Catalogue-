import type { Category, CategoryInput } from '@wasser/shared';
import { newId } from '../lib/id.js';

export async function listCategories(db: D1Database, tenantId: number): Promise<Category[]> {
  const { results } = await db
    .prepare('SELECT * FROM categories WHERE tenant_id = ? ORDER BY sort_order, created_at')
    .bind(tenantId)
    .all<Category>();
  return results ?? [];
}

export async function getCategory(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<Category | null> {
  return db
    .prepare('SELECT * FROM categories WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<Category>();
}

export async function createCategory(
  db: D1Database,
  tenantId: number,
  input: CategoryInput,
): Promise<Category> {
  const id = newId('cat');
  await db
    .prepare('INSERT INTO categories (id, tenant_id, name, sort_order) VALUES (?, ?, ?, ?)')
    .bind(id, tenantId, input.name, input.sort_order)
    .run();
  return (await getCategory(db, tenantId, id))!;
}

export async function updateCategory(
  db: D1Database,
  tenantId: number,
  id: string,
  input: Partial<CategoryInput>,
): Promise<Category | null> {
  const existing = await getCategory(db, tenantId, id);
  if (!existing) return null;
  const name = input.name ?? existing.name;
  const sortOrder = input.sort_order ?? existing.sort_order;
  await db
    .prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ? AND tenant_id = ?')
    .bind(name, sortOrder, id, tenantId)
    .run();
  return getCategory(db, tenantId, id);
}

export async function deleteCategory(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM categories WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

/** Persist a new order; ids not in this tenant are ignored. */
export async function reorderCategories(
  db: D1Database,
  tenantId: number,
  ids: string[],
): Promise<void> {
  const stmt = db.prepare(
    'UPDATE categories SET sort_order = ? WHERE id = ? AND tenant_id = ?',
  );
  await db.batch(ids.map((id, i) => stmt.bind(i, id, tenantId)));
}
