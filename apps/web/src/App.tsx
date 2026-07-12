import { useState } from 'react';
import { Products } from './pages/Products';
import { ProductEditor } from './pages/ProductEditor';

type View = { name: 'list' } | { name: 'new' } | { name: 'edit'; id: string };

export function App() {
  const [view, setView] = useState<View>({ name: 'list' });
  const [reloadKey, setReloadKey] = useState(0);

  const backToList = () => setView({ name: 'list' });
  const afterSave = () => setReloadKey((k) => k + 1);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, cursor: 'pointer' }} onClick={backToList}>
          WasserCatalog
        </h1>
        <p style={{ color: '#666', marginTop: 4 }}>
          Админка каталога — товары, фото (drag-and-drop), коллекции, проекты и рендер PDF.
        </p>
      </header>

      {view.name === 'list' && (
        <section>
          <h2>Товары</h2>
          <Products
            reloadKey={reloadKey}
            onNew={() => setView({ name: 'new' })}
            onEdit={(id) => setView({ name: 'edit', id })}
          />
        </section>
      )}

      {view.name === 'new' && <ProductEditor onClose={backToList} onSaved={afterSave} />}

      {view.name === 'edit' && (
        <ProductEditor productId={view.id} onClose={backToList} onSaved={afterSave} />
      )}
    </main>
  );
}
