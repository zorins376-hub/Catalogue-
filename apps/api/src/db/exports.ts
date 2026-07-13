import type { CatalogExport, ExportKind, ExportStatus } from '@wasser/shared';
import { newId } from '../lib/id.js';

export async function createExport(
  db: D1Database,
  projectId: string,
  kind: ExportKind,
): Promise<CatalogExport> {
  const id = newId('exp');
  await db
    .prepare('INSERT INTO catalog_exports (id, project_id, kind, status) VALUES (?, ?, ?, ?)')
    .bind(id, projectId, kind, 'pending')
    .run();
  return (await getExport(db, id))!;
}

export async function getExport(db: D1Database, id: string): Promise<CatalogExport | null> {
  return db
    .prepare('SELECT * FROM catalog_exports WHERE id = ?')
    .bind(id)
    .first<CatalogExport>();
}

export async function setExportStatus(
  db: D1Database,
  id: string,
  status: ExportStatus,
  patch: { r2Key?: string; error?: string; pageCount?: number } = {},
): Promise<void> {
  const finished = status === 'done' || status === 'error';
  await db
    .prepare(
      `UPDATE catalog_exports
         SET status = ?,
             r2_key = COALESCE(?, r2_key),
             error = COALESCE(?, error),
             page_count = COALESCE(?, page_count),
             finished_at = CASE WHEN ? THEN datetime('now') ELSE finished_at END
       WHERE id = ?`,
    )
    .bind(
      status,
      patch.r2Key ?? null,
      patch.error ?? null,
      patch.pageCount ?? null,
      finished ? 1 : 0,
      id,
    )
    .run();
}
