import type { Page, PageConfig, PageInput, PageUpdate, TemplateCode } from '@wasser/shared';
import { newId } from '../lib/id.js';

interface PageRow {
  id: string;
  project_id: string;
  sort_order: number;
  template_code: TemplateCode;
  config: string; // JSON text
}

function parseConfig(json: string): PageConfig {
  try {
    return JSON.parse(json) as PageConfig;
  } catch {
    return {};
  }
}

function mapRow(row: PageRow): Page {
  return { ...row, config: parseConfig(row.config) };
}

export async function listPages(db: D1Database, projectId: string): Promise<Page[]> {
  const { results } = await db
    .prepare('SELECT * FROM catalog_pages WHERE project_id = ? ORDER BY sort_order')
    .bind(projectId)
    .all<PageRow>();
  return (results ?? []).map(mapRow);
}

export async function getPage(db: D1Database, id: string): Promise<Page | null> {
  const row = await db
    .prepare('SELECT * FROM catalog_pages WHERE id = ?')
    .bind(id)
    .first<PageRow>();
  return row ? mapRow(row) : null;
}

export async function createPage(
  db: D1Database,
  projectId: string,
  input: PageInput,
): Promise<Page> {
  const id = newId('page');
  // Default sort_order to the end of the project's pages when not provided.
  let sortOrder = input.sort_order;
  if (sortOrder === undefined || sortOrder === 0) {
    const row = await db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxSort FROM catalog_pages WHERE project_id = ?')
      .bind(projectId)
      .first<{ maxSort: number }>();
    sortOrder = (row?.maxSort ?? -1) + 1;
  }
  await db
    .prepare(
      'INSERT INTO catalog_pages (id, project_id, sort_order, template_code, config) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(id, projectId, sortOrder, input.template_code, JSON.stringify(input.config))
    .run();
  return (await getPage(db, id))!;
}

export async function updatePage(
  db: D1Database,
  id: string,
  input: PageUpdate,
): Promise<Page | null> {
  const existing = await getPage(db, id);
  if (!existing) return null;
  await db
    .prepare(
      'UPDATE catalog_pages SET sort_order = ?, template_code = ?, config = ? WHERE id = ?',
    )
    .bind(
      input.sort_order ?? existing.sort_order,
      input.template_code ?? existing.template_code,
      JSON.stringify(input.config ?? existing.config),
      id,
    )
    .run();
  return getPage(db, id);
}

export async function deletePage(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM catalog_pages WHERE id = ?').bind(id).run();
  return (res.meta.changes ?? 0) > 0;
}

export async function reorderPages(
  db: D1Database,
  projectId: string,
  ids: string[],
): Promise<void> {
  const stmt = db.prepare(
    'UPDATE catalog_pages SET sort_order = ? WHERE id = ? AND project_id = ?',
  );
  await db.batch(ids.map((id, i) => stmt.bind(i, id, projectId)));
}
