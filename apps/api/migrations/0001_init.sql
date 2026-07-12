-- WasserCatalog — initial schema (ТЗ §2)
-- Principles:
--   * tenant_id on every business table (default 1 = Wasser); multitenancy later
--     with no data migration.
--   * product attributes are a JSON column, not EAV (catalog needs "as-is" output,
--     no attribute filtering).
--   * all ids are TEXT (nanoid), generated in the Worker.
--   * money is INTEGER minor units + currency.

PRAGMA foreign_keys = ON;

CREATE TABLE tenants (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO tenants (id, name) VALUES (1, 'Wasser');

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1 REFERENCES tenants(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1 REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_id TEXT,              -- soft FK on product_images
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1 REFERENCES tenants(id),
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER,                    -- minor units; NULL = "price on request"
  currency TEXT NOT NULL DEFAULT 'KGS',
  attrs TEXT NOT NULL DEFAULT '[]', -- JSON: [{key, value, sort}] — order matters for print
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active | archived
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_products_tenant ON products(tenant_id, status, sort_order);
CREATE INDEX idx_products_collection ON products(collection_id);
CREATE INDEX idx_products_category ON products(category_id);

CREATE TABLE product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,             -- original: img/{tenant}/{product}/{id}.{ext}
  mime TEXT NOT NULL,
  width INTEGER NOT NULL,           -- pixels, read on upload
  height INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_images_product ON product_images(product_id, sort_order);

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,        -- cover | grid-2x3 | grid-3x4 | collection-hero
  name TEXT NOT NULL,
  kind TEXT NOT NULL,               -- cover | grid | collection
  config TEXT NOT NULL DEFAULT '{}' -- JSON defaults (cols, rows, fields, ...)
);

CREATE TABLE catalog_projects (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1 REFERENCES tenants(id),
  name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ru',
  settings TEXT NOT NULL DEFAULT '{}',
  -- settings JSON: { format: "A4", bleedMm: 3, safeMm: 5, showToc: true,
  --                  header: {...}, footer: {...}, priceVisible: true }
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE catalog_pages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES catalog_projects(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  template_code TEXT NOT NULL REFERENCES templates(code),
  config TEXT NOT NULL DEFAULT '{}'
  -- config JSON by template type:
  --   cover:            { title, subtitle, imageId }
  --   grid:             { source: "collection"|"category"|"manual",
  --                       collectionId?, categoryId?, productIds?: [] }
  --   collection-hero:  { collectionId, heroImageId }
  -- grid is a SECTION, not a physical page: Paged.js splits the product flow
  -- into N physical pages by itself.
);
CREATE INDEX idx_pages_project ON catalog_pages(project_id, sort_order);

CREATE TABLE catalog_exports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES catalog_projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,               -- rgb | cmyk
  status TEXT NOT NULL DEFAULT 'pending', -- pending | rendering | done | error
  r2_key TEXT,                      -- pdf/{project}/{export}.pdf
  error TEXT,
  page_count INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE INDEX idx_exports_project ON catalog_exports(project_id, created_at);
