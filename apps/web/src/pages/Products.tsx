import { useEffect, useState } from 'react';
import type { Product } from '@wasser/shared';
import { formatPrice } from '@wasser/shared';
import { api, ApiError } from '../api/client';

/**
 * Products list (ТЗ stage 3 scaffold). The full admin — create/edit forms,
 * drag-and-drop photo upload, reorder — builds on this once stages 1/2/4/5 land.
 */
export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listProducts()
      .then(setProducts)
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? `${e.code}: ${e.message}` : String(e)),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Загрузка…</p>;
  if (error) return <p style={{ color: 'crimson' }}>Ошибка: {error}</p>;

  return (
    <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
          <th>SKU</th>
          <th>Название</th>
          <th>Цена</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
            <td>{p.sku ?? '—'}</td>
            <td>{p.name}</td>
            <td>{formatPrice(p.price, p.currency, 'ru') ?? 'по запросу'}</td>
            <td>{p.status}</td>
          </tr>
        ))}
        {products.length === 0 && (
          <tr>
            <td colSpan={4} style={{ color: '#888' }}>
              Нет товаров. Запустите seed: <code>pnpm --filter @wasser/api db:seed:local</code>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
