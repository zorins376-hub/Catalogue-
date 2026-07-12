import type { Category, Collection, Product, TemplateCode } from '@wasser/shared';

type Config = Record<string, unknown>;

interface Ctx {
  collections: Collection[];
  categories: Category[];
  products: Product[];
}

interface Props {
  templateCode: TemplateCode;
  config: Config;
  ctx: Ctx;
  onChange: (config: Config) => void;
}

/**
 * Renders the config fields for a catalog page, switched by template code
 * (cover / grid / collection-hero). Config is stored as a passthrough object;
 * print-data reads it defensively.
 */
export function PageConfigEditor({ templateCode, config, ctx, onChange }: Props) {
  const set = (patch: Config) => onChange({ ...config, ...patch });

  if (templateCode === 'cover') {
    return (
      <div style={grid}>
        <label>
          Заголовок
          <input
            value={str(config.title)}
            onChange={(e) => set({ title: e.target.value })}
            style={fld}
          />
        </label>
        <label>
          Подзаголовок
          <input
            value={str(config.subtitle)}
            onChange={(e) => set({ subtitle: e.target.value })}
            style={fld}
          />
        </label>
        <label>
          ID фото обложки (необязательно)
          <input
            value={str(config.imageId)}
            onChange={(e) => set({ imageId: e.target.value || undefined })}
            style={fld}
          />
        </label>
      </div>
    );
  }

  if (templateCode === 'collection-hero') {
    return (
      <div style={grid}>
        <label>
          Коллекция
          <select
            value={str(config.collectionId)}
            onChange={(e) => set({ collectionId: e.target.value })}
            style={fld}
          >
            <option value="">— выберите —</option>
            {ctx.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          ID hero-фото (необязательно)
          <input
            value={str(config.heroImageId)}
            onChange={(e) => set({ heroImageId: e.target.value || undefined })}
            style={fld}
          />
        </label>
      </div>
    );
  }

  // grid-2x3 / grid-3x4
  const source = str(config.source) || 'collection';
  const productIds = Array.isArray(config.productIds) ? (config.productIds as string[]) : [];
  return (
    <div style={grid}>
      <label>
        Заголовок раздела
        <input
          value={str(config.sectionTitle)}
          onChange={(e) => set({ sectionTitle: e.target.value })}
          style={fld}
        />
      </label>
      <label>
        Источник товаров
        <select value={source} onChange={(e) => set({ source: e.target.value })} style={fld}>
          <option value="collection">Коллекция</option>
          <option value="category">Категория</option>
          <option value="manual">Вручную</option>
        </select>
      </label>

      {source === 'collection' && (
        <label>
          Коллекция
          <select
            value={str(config.collectionId)}
            onChange={(e) => set({ collectionId: e.target.value })}
            style={fld}
          >
            <option value="">— выберите —</option>
            {ctx.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {source === 'category' && (
        <label>
          Категория
          <select
            value={str(config.categoryId)}
            onChange={(e) => set({ categoryId: e.target.value })}
            style={fld}
          >
            <option value="">— выберите —</option>
            {ctx.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {source === 'manual' && (
        <div>
          <div style={{ marginBottom: 4 }}>Товары ({productIds.length})</div>
          <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #eee', padding: 6 }}>
            {ctx.products.map((p) => {
              const checked = productIds.includes(p.id);
              return (
                <label key={p.id} style={{ display: 'block', fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...productIds, p.id]
                        : productIds.filter((id) => id !== p.id);
                      set({ productIds: next });
                    }}
                  />{' '}
                  {p.name}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const grid: React.CSSProperties = { display: 'grid', gap: 8 };
const fld: React.CSSProperties = { display: 'block', width: '100%', marginTop: 4, padding: 6 };

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
