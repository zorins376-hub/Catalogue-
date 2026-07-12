import type { TemplateCode, TemplateKind } from '@wasser/shared';

export interface Template {
  id: string;
  code: TemplateCode;
  name: string;
  kind: TemplateKind;
  config: Record<string, unknown>;
}

interface TemplateRow {
  id: string;
  code: TemplateCode;
  name: string;
  kind: TemplateKind;
  config: string;
}

export async function listTemplates(db: D1Database): Promise<Template[]> {
  const { results } = await db.prepare('SELECT * FROM templates ORDER BY code').all<TemplateRow>();
  return (results ?? []).map((r) => ({ ...r, config: safeJson(r.config) }));
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Grid dimensions encoded in the template code, e.g. grid-2x3 → { cols: 2, rows: 3 }. */
export function gridDims(code: TemplateCode): { cols: 2 | 3; rows: 3 | 4 } {
  const m = /^grid-(\d)x(\d)$/.exec(code);
  if (m) {
    const cols = Number(m[1]);
    const rows = Number(m[2]);
    if ((cols === 2 || cols === 3) && (rows === 3 || rows === 4)) return { cols, rows };
  }
  return { cols: 3, rows: 4 };
}
