import type { Project, ProjectInput, ProjectSettings, ProjectStatus, ProjectUpdate } from '@wasser/shared';
import { projectSettingsSchema } from '@wasser/shared';
import { newId } from '../lib/id.js';

interface ProjectRow {
  id: string;
  tenant_id: number;
  name: string;
  locale: string;
  settings: string; // JSON text
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

function parseSettings(json: string): ProjectSettings {
  try {
    return projectSettingsSchema.parse(JSON.parse(json));
  } catch {
    return projectSettingsSchema.parse({});
  }
}

function mapRow(row: ProjectRow): Project {
  return { ...row, settings: parseSettings(row.settings) };
}

export async function listProjects(db: D1Database, tenantId: number): Promise<Project[]> {
  const { results } = await db
    .prepare('SELECT * FROM catalog_projects WHERE tenant_id = ? ORDER BY updated_at DESC')
    .bind(tenantId)
    .all<ProjectRow>();
  return (results ?? []).map(mapRow);
}

export async function getProject(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<Project | null> {
  const row = await db
    .prepare('SELECT * FROM catalog_projects WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<ProjectRow>();
  return row ? mapRow(row) : null;
}

export async function createProject(
  db: D1Database,
  tenantId: number,
  input: ProjectInput,
): Promise<Project> {
  const id = newId('proj');
  await db
    .prepare(
      'INSERT INTO catalog_projects (id, tenant_id, name, locale, settings, status) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(id, tenantId, input.name, input.locale, JSON.stringify(input.settings), input.status)
    .run();
  return (await getProject(db, tenantId, id))!;
}

export async function updateProject(
  db: D1Database,
  tenantId: number,
  id: string,
  input: ProjectUpdate,
): Promise<Project | null> {
  const existing = await getProject(db, tenantId, id);
  if (!existing) return null;
  const settings = input.settings
    ? projectSettingsSchema.parse({ ...existing.settings, ...input.settings })
    : existing.settings;
  await db
    .prepare(
      `UPDATE catalog_projects SET name = ?, locale = ?, settings = ?, status = ?,
         updated_at = datetime('now')
       WHERE id = ? AND tenant_id = ?`,
    )
    .bind(
      input.name ?? existing.name,
      input.locale ?? existing.locale,
      JSON.stringify(settings),
      input.status ?? existing.status,
      id,
      tenantId,
    )
    .run();
  return getProject(db, tenantId, id);
}

export async function deleteProject(
  db: D1Database,
  tenantId: number,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM catalog_projects WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function touchProject(db: D1Database, id: string): Promise<void> {
  await db
    .prepare("UPDATE catalog_projects SET updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();
}
