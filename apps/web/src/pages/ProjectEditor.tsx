import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Category,
  Collection,
  Page,
  Product,
  Project,
  ProjectSettings,
  TemplateCode,
} from '@wasser/shared';
import { api, ApiError, previewBlobUrl, type MetaResponse } from '../api/client';
import { PageConfigEditor } from '../components/PageConfigEditor';

const TEMPLATE_LABELS: Record<TemplateCode, string> = {
  cover: 'Обложка',
  'grid-2x3': 'Сетка 2×3',
  'grid-3x4': 'Сетка 3×4',
  'collection-hero': 'Коллекция (герой)',
};
const TEMPLATE_CODES = Object.keys(TEMPLATE_LABELS) as TemplateCode[];
const CURRENCIES = ['', 'KGS', 'USD', 'EUR', 'RUB', 'KZT'];

interface Props {
  projectId: string;
  onClose: () => void;
}

export function ProjectEditor({ projectId, onClose }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newTemplate, setNewTemplate] = useState<TemplateCode>('cover');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);

  const loadPages = useCallback(async () => {
    setPages(await api.listPages(projectId));
  }, [projectId]);

  useEffect(() => {
    Promise.all([
      api.getProject(projectId),
      api.listPages(projectId),
      api.meta(),
      api.listCollections(),
      api.listCategories(),
      api.listProducts('?status=active'),
    ])
      .then(([proj, pg, m, cols, cats, prods]) => {
        setProject(proj);
        setSettings(proj.settings);
        setPages(pg);
        setMeta(m);
        setCollections(cols);
        setCategories(cats);
        setProducts(prods);
      })
      .catch((e) => setError(errMsg(e)));
  }, [projectId]);

  const saveSettings = async () => {
    if (!project || !settings) return;
    setError(null);
    setStatus('Сохранение…');
    try {
      const updated = await api.updateProject(project.id, {
        name: project.name,
        settings,
      });
      setProject(updated);
      setSettings(updated.settings);
      setStatus('Настройки сохранены');
    } catch (e) {
      setError(errMsg(e));
      setStatus(null);
    }
  };

  const setS = <K extends keyof ProjectSettings>(k: K, v: ProjectSettings[K]) =>
    setSettings((s) => (s ? { ...s, [k]: v } : s));

  const addPage = async () => {
    setError(null);
    try {
      await api.createPage(projectId, { template_code: newTemplate, config: {}, sort_order: 0 });
      await loadPages();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const savePage = async (page: Page, config: Record<string, unknown>) => {
    setError(null);
    try {
      await api.updatePage(page.id, { config });
      await loadPages();
      setStatus('Страница сохранена');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const removePage = async (id: string) => {
    if (!confirm('Удалить страницу?')) return;
    try {
      await api.deletePage(id);
      await loadPages();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const onPageDrop = async (targetIndex: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const next = [...pages];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    setPages(next);
    try {
      await api.reorderPages(projectId, next.map((p) => p.id));
    } catch (e) {
      setError(errMsg(e));
      await loadPages();
    }
  };

  const preview = async () => {
    setError(null);
    try {
      const url = await previewBlobUrl(projectId);
      window.open(url, '_blank');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const render = async () => {
    setError(null);
    setStatus('Запуск рендера…');
    try {
      const { export_id } = await api.render(projectId, 'rgb');
      // poll for completion
      for (let i = 0; i < 40; i++) {
        await sleep(1500);
        const exp = await api.getExport(export_id);
        setStatus(`Рендер: ${exp.status}`);
        if (exp.status === 'done') {
          setStatus('Готово');
          if (exp.downloadUrl) window.open(exp.downloadUrl, '_blank');
          return;
        }
        if (exp.status === 'error') {
          setError(`Ошибка рендера: ${exp.error ?? 'неизвестно'}`);
          setStatus(null);
          return;
        }
      }
      setStatus('Рендер выполняется дольше обычного…');
    } catch (e) {
      setError(errMsg(e));
      setStatus(null);
    }
  };

  if (!project || !settings || !meta) return <p>{error ?? 'Загрузка…'}</p>;

  const ctx = { collections, categories, products };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Каталог: {project.name}</h2>
        <button type="button" onClick={onClose}>
          ← К списку
        </button>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {status && <p style={{ color: '#2b7' }}>{status}</p>}

      {/* --- settings --- */}
      <fieldset style={box}>
        <legend>Настройки</legend>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
          <label>
            Название
            <input
              value={project.name}
              onChange={(e) => setProject({ ...project, name: e.target.value })}
              style={fld}
            />
          </label>
          <label>
            Формат
            <select value={settings.format} onChange={(e) => setS('format', e.target.value as ProjectSettings['format'])} style={fld}>
              {meta.formats.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.code} ({f.widthMm}×{f.heightMm} мм)
                </option>
              ))}
            </select>
          </label>
          <label>
            Ориентация
            <select value={settings.orientation} onChange={(e) => setS('orientation', e.target.value as ProjectSettings['orientation'])} style={fld}>
              <option value="portrait">Вертикальная</option>
              <option value="landscape">Горизонтальная</option>
            </select>
          </label>
          <label>
            Шрифт
            <select value={settings.fontFamily} onChange={(e) => setS('fontFamily', e.target.value)} style={fld}>
              {meta.fonts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.category})
                </option>
              ))}
            </select>
          </label>
          <label>
            Валюта отображения
            <select
              value={settings.displayCurrency ?? ''}
              onChange={(e) => setS('displayCurrency', e.target.value || undefined)}
              style={fld}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c || '— как у товара —'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Колонтитул (футер)
            <input value={settings.footer ?? ''} onChange={(e) => setS('footer', e.target.value || undefined)} style={fld} />
          </label>
          <label style={{ fontWeight: 'normal' }}>
            <input type="checkbox" checked={settings.showToc} onChange={(e) => setS('showToc', e.target.checked)} /> Оглавление
          </label>
          <label style={{ fontWeight: 'normal' }}>
            <input type="checkbox" checked={settings.priceVisible} onChange={(e) => setS('priceVisible', e.target.checked)} /> Показывать цены
          </label>
        </div>
        <button type="button" onClick={saveSettings} style={{ marginTop: 10, padding: '6px 14px' }}>
          Сохранить настройки
        </button>
      </fieldset>

      {/* --- pages --- */}
      <fieldset style={box}>
        <legend>Страницы ({pages.length}) — перетаскивайте для порядка</legend>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={newTemplate} onChange={(e) => setNewTemplate(e.target.value as TemplateCode)} style={{ padding: 6 }}>
            {TEMPLATE_CODES.map((c) => (
              <option key={c} value={c}>
                {TEMPLATE_LABELS[c]}
              </option>
            ))}
          </select>
          <button type="button" onClick={addPage}>
            + Добавить страницу
          </button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {pages.map((page, i) => (
            <PageRow
              key={page.id}
              page={page}
              index={i}
              ctx={ctx}
              onSave={savePage}
              onRemove={removePage}
              onDragStart={() => (dragIndex.current = i)}
              onDrop={() => void onPageDrop(i)}
            />
          ))}
          {pages.length === 0 && <p style={{ color: '#999' }}>Страниц пока нет.</p>}
        </div>
      </fieldset>

      {/* --- actions --- */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={preview} style={{ padding: '8px 16px' }}>
          Открыть превью (HTML)
        </button>
        <button type="button" onClick={render} style={{ padding: '8px 16px' }}>
          Рендер PDF (RGB)
        </button>
      </div>
    </div>
  );
}

function PageRow({
  page,
  index,
  ctx,
  onSave,
  onRemove,
  onDragStart,
  onDrop,
}: {
  page: Page;
  index: number;
  ctx: { collections: Collection[]; categories: Category[]; products: Product[] };
  onSave: (page: Page, config: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, unknown>>(page.config as Record<string, unknown>);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={{ border: '1px solid #e5e5e5', borderRadius: 6, padding: 10, background: '#fff' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#bbb', cursor: 'grab' }}>⠿</span>
        <strong>
          {index + 1}. {TEMPLATE_LABELS[page.template_code]}
        </strong>
        <span style={{ color: '#999', fontSize: 12 }}>{summarize(config)}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setOpen((v) => !v)}>
            {open ? 'Свернуть' : 'Изменить'}
          </button>
          <button type="button" onClick={() => onRemove(page.id)} style={{ color: 'crimson' }}>
            Удалить
          </button>
        </span>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          <PageConfigEditor
            templateCode={page.template_code}
            config={config}
            ctx={ctx}
            onChange={setConfig}
          />
          <button type="button" onClick={() => onSave(page, config)} style={{ marginTop: 8 }}>
            Сохранить страницу
          </button>
        </div>
      )}
    </div>
  );
}

function summarize(config: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof config.title === 'string' && config.title) parts.push(config.title);
  if (typeof config.sectionTitle === 'string' && config.sectionTitle) parts.push(config.sectionTitle);
  if (typeof config.source === 'string') parts.push(String(config.source));
  return parts.join(' · ');
}

const box: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 8, padding: 16 };
const fld: React.CSSProperties = { display: 'block', width: '100%', marginTop: 4, padding: 6 };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function errMsg(e: unknown): string {
  return e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
}
