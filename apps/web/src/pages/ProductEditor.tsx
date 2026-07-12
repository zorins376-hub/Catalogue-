import { useEffect, useState } from 'react';
import type {
  Attr,
  Category,
  Collection,
  ProductInput,
  ProductStatus,
} from '@wasser/shared';
import { minorDigits } from '@wasser/shared';
import { api, ApiError } from '../api/client';
import { AttrsEditor } from '../components/AttrsEditor';
import { ImageUploader } from '../components/ImageUploader';

const CURRENCIES = ['KGS', 'USD', 'EUR', 'RUB', 'KZT'];

interface Props {
  productId?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  sku: string;
  description: string;
  priceMajor: string; // as typed, major units
  currency: string;
  categoryId: string;
  collectionId: string;
  status: ProductStatus;
  attrs: Attr[];
}

const EMPTY: FormState = {
  name: '',
  sku: '',
  description: '',
  priceMajor: '',
  currency: 'KGS',
  categoryId: '',
  collectionId: '',
  status: 'active',
  attrs: [],
};

/**
 * Create / edit a product (ТЗ stage 3). New products are saved first (to get an
 * id), which then unlocks the drag-and-drop photo uploader — so the flow is
 * "create product → add 5 photos", matching the stage-3 DoD.
 */
export function ProductEditor({ productId, onClose, onSaved }: Props) {
  const [id, setId] = useState<string | undefined>(productId);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listCategories(), api.listCollections()])
      .then(([c, col]) => {
        setCategories(c);
        setCollections(col);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    if (!productId) return;
    api
      .getProduct(productId)
      .then((p) => {
        setForm({
          name: p.name,
          sku: p.sku ?? '',
          description: p.description ?? '',
          priceMajor: p.price == null ? '' : (p.price / 10 ** minorDigits(p.currency)).toString(),
          currency: p.currency,
          categoryId: p.category_id ?? '',
          collectionId: p.collection_id ?? '',
          status: p.status,
          attrs: p.attrs,
        });
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [productId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const buildInput = (): ProductInput => {
    const trimmed = form.priceMajor.trim();
    const price =
      trimmed === '' ? null : Math.round(parseFloat(trimmed) * 10 ** minorDigits(form.currency));
    return {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      price: Number.isFinite(price as number) ? price : null,
      currency: form.currency,
      attrs: form.attrs,
      category_id: form.categoryId || null,
      collection_id: form.collectionId || null,
      status: form.status,
      sort_order: 0,
    };
  };

  const save = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Укажите название');
      return;
    }
    setSaving(true);
    try {
      const input = buildInput();
      if (id) {
        await api.updateProduct(id, input);
      } else {
        const created = await api.createProduct(input);
        setId(created.id); // reveals the photo uploader
      }
      onSaved();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Загрузка…</p>;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{id ? 'Редактирование товара' : 'Новый товар'}</h2>
        <button type="button" onClick={onClose}>
          ← К списку
        </button>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ display: 'grid', gap: 10, maxWidth: 640 }}>
        <label>
          Название*
          <input value={form.name} onChange={(e) => set('name', e.target.value)} style={fld} />
        </label>
        <label>
          SKU
          <input value={form.sku} onChange={(e) => set('sku', e.target.value)} style={fld} />
        </label>
        <label>
          Описание
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            style={fld}
          />
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1 }}>
            Цена (пусто = по запросу)
            <input
              type="number"
              step="0.01"
              value={form.priceMajor}
              onChange={(e) => set('priceMajor', e.target.value)}
              style={fld}
            />
          </label>
          <label>
            Валюта
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)} style={fld}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1 }}>
            Категория
            <select
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              style={fld}
            >
              <option value="">— нет —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1 }}>
            Коллекция
            <select
              value={form.collectionId}
              onChange={(e) => set('collectionId', e.target.value)}
              style={fld}
            >
              <option value="">— нет —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Статус
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as ProductStatus)}
              style={fld}
            >
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </label>
        </div>

        <div>
          <strong>Характеристики</strong>
          <AttrsEditor value={form.attrs} onChange={(a) => set('attrs', a)} />
        </div>

        <button type="button" onClick={save} disabled={saving} style={{ padding: '8px 16px' }}>
          {saving ? 'Сохранение…' : id ? 'Сохранить' : 'Создать товар'}
        </button>
      </div>

      <div>
        <strong>Фотографии</strong>
        {id ? (
          <ImageUploader productId={id} />
        ) : (
          <p style={{ color: '#999' }}>Сначала создайте товар — затем можно загрузить фото.</p>
        )}
      </div>
    </div>
  );
}

const fld: React.CSSProperties = { display: 'block', width: '100%', marginTop: 4, padding: 6 };

function errMsg(e: unknown): string {
  return e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
}
