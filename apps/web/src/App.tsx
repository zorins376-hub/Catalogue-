import { Products } from './pages/Products';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>WasserCatalog</h1>
        <p style={{ color: '#666', marginTop: 4 }}>
          Админка каталога — MVP-скелет. Товары, коллекции, проекты и рендер PDF.
        </p>
      </header>
      <section>
        <h2>Товары</h2>
        <Products />
      </section>
    </main>
  );
}
