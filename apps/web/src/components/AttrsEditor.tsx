import type { Attr } from '@wasser/shared';

interface Props {
  value: Attr[];
  onChange: (attrs: Attr[]) => void;
}

/**
 * Editable product attribute list. Order matters for print, so `sort` is kept
 * equal to the row position and re-derived on every change.
 */
export function AttrsEditor({ value, onChange }: Props) {
  const commit = (rows: { key: string; value: string }[]) =>
    onChange(rows.map((r, i) => ({ key: r.key, value: r.value, sort: i })));

  const update = (i: number, patch: Partial<{ key: string; value: string }>) => {
    const rows = value.map((a) => ({ key: a.key, value: a.value }));
    rows[i] = { ...rows[i]!, ...patch };
    commit(rows);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const rows = value.map((a) => ({ key: a.key, value: a.value }));
    [rows[i], rows[j]] = [rows[j]!, rows[i]!];
    commit(rows);
  };

  const remove = (i: number) =>
    commit(value.filter((_, idx) => idx !== i).map((a) => ({ key: a.key, value: a.value })));

  const add = () => commit([...value.map((a) => ({ key: a.key, value: a.value })), { key: '', value: '' }]);

  return (
    <div>
      {value.length === 0 && <p style={{ color: '#999', margin: '4px 0' }}>Характеристик нет</p>}
      {value.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input
            placeholder="Характеристика"
            value={a.key}
            onChange={(e) => update(i, { key: e.target.value })}
            style={{ flex: '0 0 40%' }}
          />
          <input
            placeholder="Значение"
            value={a.value}
            onChange={(e) => update(i, { value: e.target.value })}
            style={{ flex: 1 }}
          />
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Вверх">
            ↑
          </button>
          <button
            type="button"
            onClick={() => move(i, 1)}
            disabled={i === value.length - 1}
            title="Вниз"
          >
            ↓
          </button>
          <button type="button" onClick={() => remove(i)} style={{ color: 'crimson' }}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={add} style={{ marginTop: 4 }}>
        + Добавить характеристику
      </button>
    </div>
  );
}
