import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@wasser/shared';
import { api, ApiError } from '../api/client';

interface Props {
  onOpen: (id: string) => void;
}

export function ProjectsList({ onOpen }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listProjects()
      .then(setProjects)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    const name = prompt('Название каталога:');
    if (!name) return;
    try {
      const proj = await api.createProject({
        name,
        locale: 'ru',
        status: 'draft',
        settings: {
          format: 'A4',
          orientation: 'portrait',
          bleedMm: 3,
          safeMm: 5,
          showToc: true,
          priceVisible: true,
          fontFamily: 'pt-sans',
        },
      });
      onOpen(proj.id);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить каталог?')) return;
    try {
      await api.deleteProject(id);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (loading) return <p>Загрузка…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" onClick={create}>
          + Новый каталог
        </button>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th>Название</th>
            <th>Формат</th>
            <th>Статус</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>
                <button
                  type="button"
                  onClick={() => onOpen(p.id)}
                  style={{ background: 'none', border: 'none', color: '#06c', cursor: 'pointer', padding: 0 }}
                >
                  {p.name}
                </button>
              </td>
              <td>
                {p.settings.format} / {p.settings.orientation}
              </td>
              <td>{p.status}</td>
              <td>
                <button type="button" onClick={() => void remove(p.id)} style={{ color: 'crimson' }}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: '#888' }}>
                Каталогов пока нет. Нажмите «Новый каталог».
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function errMsg(e: unknown): string {
  return e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
}
