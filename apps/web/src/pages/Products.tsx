import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '@wasser/shared';
import { formatPrice } from '@wasser/shared';
import { api, ApiError } from '../api/client';

interface Props {
  onNew: () => void;
  onEdit: (id: string) => void;
  /** bump to force a reload (e.g. after saving in the editor) */
  reloadKey?: number;
}

/**
 * Products list (ТЗ stage 3): create / edit / delete + drag-to-reorder rows.
 * Reordering persists via PUT /api/products/reorder.
 */
export function Products({ onNew, onEdit, reloadKey }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dragIndex = useRef<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listProducts()
      .then(setProducts)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const remove = async (id: string) => {
    if (!confirm('Удалить товар?')) return;
    try {
      await api.deleteProduct(id);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const onRowDrop = async (targetIndex: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const next = [...products];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    setProducts(next); // optimistic
    try {
      await api.reorderProducts(next.map((p) => p.id));
    } catch (e) {
      setError(errMsg(e));
      load();
    }
  };

  if (loading) return <p>Загрузка…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: '#666' }}>{products.length} товаров — перетаскивайте строки для порядка</span>
        <button type="button" onClick={onNew}>
          + Новый товар
        </button>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ width: 24 }} />
            <th>SKU</th>
            <th>Название</th>
            <th>Цена</th>
            <th>Статус</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr
              key={p.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onRowDrop(i)}
              style={{ borderBottom: '1px solid #eee', cursor: 'grab' }}
            >
              <td style={{ color: '#bbb' }}>⠿</td>
              <td>{p.sku ?? '—'}</td>
              <td>
                <button
                  type="button"
                  onClick={() => onEdit(p.id)}
                  style={{ background: 'none', border: 'none', color: '#06c', cursor: 'pointer', padding: 0 }}
                >
                  {p.name}
                </button>
              </td>
              <td>{formatPrice(p.price, p.currency, 'ru') ?? 'по запросу'}</td>
              <td>{p.status}</td>
              <td>
                <button type="button" onClick={() => void remove(p.id)} style={{ color: 'crimson' }}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={6} style={{ color: '#888' }}>
                Нет товаров. Нажмите «Новый товар» или запустите seed.
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
