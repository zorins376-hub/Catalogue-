import type {
  PrintData,
  PrintImage,
  PrintProduct,
  PrintSection,
  Product,
  ProductImage,
} from '@wasser/shared';
import { CELL_MM, evaluatePlacement, formatPrice, minPx } from '@wasser/shared';
import type { Placement } from '@wasser/shared';
import { getProject } from '../db/projects.js';
import { listPages } from '../db/pages.js';
import { listProducts } from '../db/products.js';
import { getCollection } from '../db/collections.js';
import { gridDims } from '../db/templates.js';
import { imageUrl } from './r2.js';
import { notFound } from '../lib/errors.js';

/**
 * Build the full PrintData payload for a project (ТЗ §4).
 * This is the stable contract the templates consume; keep the shape in sync
 * with packages/shared/print.ts, never diverge.
 */
export async function buildPrintData(
  db: D1Database,
  tenantId: number,
  baseUrl: string,
  projectId: string,
): Promise<PrintData> {
  const project = await getProject(db, tenantId, projectId);
  if (!project) throw notFound('Project');

  const pages = await listPages(db, projectId);
  const sections: PrintSection[] = [];
  let tocInserted = false;

  for (const page of pages) {
    const cfg = page.config as Record<string, unknown>;

    if (page.template_code === 'cover') {
      const img = await resolveImage(db, cfg.imageId as string | undefined);
      sections.push({
        kind: 'cover',
        title: (cfg.title as string) ?? project.name,
        subtitle: cfg.subtitle as string | undefined,
        image: img ? toPrintImage(baseUrl, img, CELL_MM.cover!) : undefined,
      });
      // Table of contents goes right after the cover when enabled.
      if (project.settings.showToc && !tocInserted) {
        sections.push({ kind: 'toc' });
        tocInserted = true;
      }
      continue;
    }

    if (page.template_code === 'collection-hero') {
      const collectionId = cfg.collectionId as string | undefined;
      const collection = collectionId ? await getCollection(db, tenantId, collectionId) : null;
      const hero = await resolveImage(db, cfg.heroImageId as string | undefined);
      sections.push({
        kind: 'collection-hero',
        collection: {
          name: collection?.name ?? 'Коллекция',
          description: collection?.description ?? undefined,
        },
        hero: hero ? toPrintImage(baseUrl, hero, CELL_MM['collection-hero']!) : undefined,
      });
      continue;
    }

    // grid-2x3 / grid-3x4
    const { cols, rows } = gridDims(page.template_code);
    const products = await resolveGridProducts(db, tenantId, cfg);
    const cell = CELL_MM[page.template_code] ?? CELL_MM['grid-3x4']!;
    const images = await imagesForProducts(db, products.map((p) => p.id));

    const printProducts: PrintProduct[] = products.map((p) =>
      toPrintProduct(baseUrl, p, images.get(p.id), cell, project.settings.priceVisible, project.locale),
    );

    sections.push({
      kind: 'grid',
      cols,
      rows,
      sectionTitle: cfg.sectionTitle as string | undefined,
      products: printProducts,
    });
  }

  // showToc with no cover page → still surface a toc at the top.
  if (project.settings.showToc && !tocInserted) {
    sections.unshift({ kind: 'toc' });
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      locale: project.locale,
      settings: project.settings,
    },
    sections,
  };
}

/* ------------------------------- helpers ------------------------------- */

function toPrintProduct(
  baseUrl: string,
  p: Product,
  image: ProductImage | undefined,
  cell: Placement,
  priceVisible: boolean,
  locale: string,
): PrintProduct {
  return {
    id: p.id,
    sku: p.sku ?? undefined,
    name: p.name,
    description: p.description ?? undefined,
    priceFormatted: priceVisible ? formatPrice(p.price, p.currency, locale) : undefined,
    attrs: p.attrs.map((a) => ({ key: a.key, value: a.value })),
    image: image ? toPrintImage(baseUrl, image, cell) : undefined,
  };
}

function toPrintImage(baseUrl: string, img: ProductImage, cell: Placement): PrintImage {
  const { dpiAtPlacement, lowRes } = evaluatePlacement(img, cell);
  // Request just enough width for the cell at print DPI, never upscaling.
  const requestW = Math.min(img.width, minPx(cell.widthMm));
  return {
    url: imageUrl(baseUrl, img.r2_key, requestW),
    width: img.width,
    height: img.height,
    dpiAtPlacement,
    lowRes,
  };
}

async function resolveImage(db: D1Database, imageId?: string): Promise<ProductImage | null> {
  if (!imageId) return null;
  return db
    .prepare('SELECT * FROM product_images WHERE id = ?')
    .bind(imageId)
    .first<ProductImage>();
}

async function resolveGridProducts(
  db: D1Database,
  tenantId: number,
  cfg: Record<string, unknown>,
): Promise<Product[]> {
  const source = cfg.source as 'collection' | 'category' | 'manual' | undefined;
  if (source === 'collection' && cfg.collectionId) {
    return listProducts(db, tenantId, {
      collectionId: cfg.collectionId as string,
      status: 'active',
    });
  }
  if (source === 'category' && cfg.categoryId) {
    return listProducts(db, tenantId, {
      categoryId: cfg.categoryId as string,
      status: 'active',
    });
  }
  if (source === 'manual' && Array.isArray(cfg.productIds)) {
    const ids = cfg.productIds as string[];
    const all = await listProducts(db, tenantId, { status: 'active' });
    const byId = new Map(all.map((p) => [p.id, p]));
    // Preserve the manual order given in config.
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }
  return [];
}

/** Fetch primary images for many products in one query, keyed by product_id. */
async function imagesForProducts(
  db: D1Database,
  productIds: string[],
): Promise<Map<string, ProductImage>> {
  const map = new Map<string, ProductImage>();
  if (productIds.length === 0) return map;
  const placeholders = productIds.map(() => '?').join(',');
  const { results } = await db
    .prepare(
      `SELECT * FROM product_images
       WHERE product_id IN (${placeholders})
       ORDER BY is_primary DESC, sort_order, created_at`,
    )
    .bind(...productIds)
    .all<ProductImage>();
  for (const img of results ?? []) {
    if (!map.has(img.product_id)) map.set(img.product_id, img); // first = primary
  }
  return map;
}
