import { useState } from 'react';
import { Products } from './pages/Products';
import { ProductEditor } from './pages/ProductEditor';
import { ProjectsList } from './pages/ProjectsList';
import { ProjectEditor } from './pages/ProjectEditor';

type View =
  | { name: 'products' }
  | { name: 'product-new' }
  | { name: 'product-edit'; id: string }
  | { name: 'projects' }
  | { name: 'project-edit'; id: string };

export function App() {
  const [view, setView] = useState<View>({ name: 'products' });
  const [reloadKey, setReloadKey] = useState(0);

  const tab = view.name.startsWith('product') ? 'products' : 'projects';

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, cursor: 'pointer' }} onClick={() => setView({ name: 'products' })}>
          WasserCatalog
        </h1>
        <p style={{ color: '#666', marginTop: 4 }}>
          Админка: товары с фото (drag-and-drop) и каталоги-проекты с рендером PDF.
        </p>
        <nav style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <TabButton active={tab === 'products'} onClick={() => setView({ name: 'products' })}>
            Товары
          </TabButton>
          <TabButton active={tab === 'projects'} onClick={() => setView({ name: 'projects' })}>
            Каталоги
          </TabButton>
        </nav>
      </header>

      {view.name === 'products' && (
        <Products
          reloadKey={reloadKey}
          onNew={() => setView({ name: 'product-new' })}
          onEdit={(id) => setView({ name: 'product-edit', id })}
        />
      )}
      {view.name === 'product-new' && (
        <ProductEditor
          onClose={() => setView({ name: 'products' })}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}
      {view.name === 'product-edit' && (
        <ProductEditor
          productId={view.id}
          onClose={() => setView({ name: 'products' })}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}

      {view.name === 'projects' && (
        <ProjectsList onOpen={(id) => setView({ name: 'project-edit', id })} />
      )}
      {view.name === 'project-edit' && (
        <ProjectEditor projectId={view.id} onClose={() => setView({ name: 'projects' })} />
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        border: '1px solid #ddd',
        borderBottom: active ? '2px solid #06c' : '1px solid #ddd',
        background: active ? '#f0f6ff' : '#fff',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
