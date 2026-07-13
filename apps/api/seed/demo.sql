-- Demo data for local/staging (ТЗ stage 1 DoD: "seed fills 10 test products").
-- Idempotent-ish: DELETE the seed rows first so re-running gives a clean set.
-- Wasser sells water treatment / plumbing gear; the demo reflects that.

DELETE FROM products   WHERE id LIKE 'seed_prod_%';
DELETE FROM collections WHERE id LIKE 'seed_coll_%';
DELETE FROM categories  WHERE id LIKE 'seed_cat_%';

INSERT INTO categories (id, tenant_id, name, sort_order) VALUES
  ('seed_cat_filters', 1, 'Фильтры для воды', 0),
  ('seed_cat_pumps',   1, 'Насосное оборудование', 1),
  ('seed_cat_fittings',1, 'Фитинги и арматура', 2);

INSERT INTO collections (id, tenant_id, name, description, sort_order) VALUES
  ('seed_coll_home', 1, 'Wasser Home',
   'Решения для бытовой водоподготовки: фильтры, умягчители, насосы.', 0),
  ('seed_coll_pro', 1, 'Wasser Pro',
   'Промышленная линейка для коммерческих объектов.', 1);

-- prices are minor units (KGS, 2 digits): 149900 = 1 499 KGS.
INSERT INTO products
  (id, tenant_id, sku, name, description, price, currency, attrs, category_id, collection_id, status, sort_order)
VALUES
  ('seed_prod_01', 1, 'WF-100', 'Магистральный фильтр Wasser WF-100',
   'Механическая очистка холодной воды, колба 10", картридж PP 5 мкм.',
   149900, 'KGS',
   '[{"key":"Присоединение","value":"1/2\"","sort":0},{"key":"Ресурс","value":"20 000 л","sort":1},{"key":"Макс. давление","value":"6 бар","sort":2}]',
   'seed_cat_filters', 'seed_coll_home', 'active', 0),

  ('seed_prod_02', 1, 'WF-200', 'Магистральный фильтр Wasser WF-200',
   'Двухступенчатая очистка, колба 20", уголь + механика.',
   289900, 'KGS',
   '[{"key":"Присоединение","value":"3/4\"","sort":0},{"key":"Ступеней","value":"2","sort":1},{"key":"Ресурс","value":"35 000 л","sort":2}]',
   'seed_cat_filters', 'seed_coll_home', 'active', 1),

  ('seed_prod_03', 1, 'WS-300', 'Умягчитель воды Wasser WS-300',
   'Ионообменный умягчитель для дома, автоматический клапан.',
   1259000, 'KGS',
   '[{"key":"Производительность","value":"1.5 м³/ч","sort":0},{"key":"Объём смолы","value":"25 л","sort":1}]',
   'seed_cat_filters', 'seed_coll_home', 'active', 2),

  -- USD-priced item to exercise multi-currency (ТЗ §8 Q2): $112.00
  ('seed_prod_04', 1, 'RO-500', 'Система обратного осмоса Wasser RO-500',
   '5 ступеней очистки, бак 12 л, минерализатор.',
   11200, 'USD',
   '[{"key":"Ступеней","value":"5","sort":0},{"key":"Бак","value":"12 л","sort":1},{"key":"Мембрана","value":"75 GPD","sort":2}]',
   'seed_cat_filters', 'seed_coll_home', 'active', 3),

  ('seed_prod_05', 1, 'PMP-750', 'Насос повышения давления Wasser PMP-750',
   'Циркуляционный насос для поддержания давления в контуре.',
   649900, 'KGS',
   '[{"key":"Мощность","value":"750 Вт","sort":0},{"key":"Напор","value":"45 м","sort":1},{"key":"Подача","value":"3.6 м³/ч","sort":2}]',
   'seed_cat_pumps', 'seed_coll_pro', 'active', 4),

  ('seed_prod_06', 1, 'PMP-1100', 'Скважинный насос Wasser PMP-1100',
   'Погружной насос для скважин 4", нержавеющая сталь.',
   1890000, 'KGS',
   '[{"key":"Мощность","value":"1100 Вт","sort":0},{"key":"Напор","value":"90 м","sort":1},{"key":"Диаметр","value":"98 мм","sort":2}]',
   'seed_cat_pumps', 'seed_coll_pro', 'active', 5),

  ('seed_prod_07', 1, 'BST-60', 'Гидроаккумулятор Wasser BST-60',
   'Мембранный бак 60 л для систем водоснабжения.',
   529900, 'KGS',
   '[{"key":"Объём","value":"60 л","sort":0},{"key":"Макс. давление","value":"8 бар","sort":1}]',
   'seed_cat_pumps', 'seed_coll_pro', 'active', 6),

  ('seed_prod_08', 1, 'FIT-BR15', 'Шаровой кран Wasser FIT-BR15',
   'Латунный полнопроходной кран 1/2", ручка-бабочка.',
   34900, 'KGS',
   '[{"key":"Материал","value":"Латунь","sort":0},{"key":"Присоединение","value":"1/2\"","sort":1}]',
   'seed_cat_fittings', 'seed_coll_home', 'active', 7),

  -- EUR-priced item to exercise multi-currency (ТЗ §8 Q2): €14.90
  ('seed_prod_09', 1, 'FIT-CL20', 'Коллектор распределительный Wasser FIT-CL20',
   'Латунный коллектор на 3 выхода 3/4".',
   1490, 'EUR',
   '[{"key":"Выходов","value":"3","sort":0},{"key":"Присоединение","value":"3/4\"","sort":1}]',
   'seed_cat_fittings', 'seed_coll_pro', 'active', 8),

  -- price NULL = "по запросу"; status archived example lives below (still seeded).
  ('seed_prod_10', 1, 'PRO-IND1', 'Промышленная станция водоподготовки Wasser PRO-IND1',
   'Комплексная станция под объект: подбор конфигурации по проекту.',
   NULL, 'KGS',
   '[{"key":"Производительность","value":"до 10 м³/ч","sort":0},{"key":"Исполнение","value":"под заказ","sort":1}]',
   'seed_cat_pumps', 'seed_coll_pro', 'active', 9);
