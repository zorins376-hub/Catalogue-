-- System templates (ТЗ §2 stage 1: "seed — templates, tenant").
-- These are structural, not demo data, so they live in a migration and ship to
-- every environment. catalog_pages.template_code FKs against templates.code.

INSERT OR IGNORE INTO templates (id, code, name, kind, config) VALUES
  ('tpl_cover',      'cover',           'Обложка',           'cover',
   '{}'),
  ('tpl_grid_2x3',   'grid-2x3',        'Сетка 2×3',         'grid',
   '{"cols":2,"rows":3}'),
  ('tpl_grid_3x4',   'grid-3x4',        'Сетка 3×4',         'grid',
   '{"cols":3,"rows":4}'),
  ('tpl_coll_hero',  'collection-hero', 'Коллекция (герой)', 'collection',
   '{}');
