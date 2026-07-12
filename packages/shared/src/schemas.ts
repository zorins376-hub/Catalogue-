import { z } from 'zod';

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export const idSchema = z.string().min(1).max(64);

export const productStatusSchema = z.enum(['active', 'archived']);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const projectStatusSchema = z.enum(['draft', 'ready', 'archived']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const exportKindSchema = z.enum(['rgb', 'cmyk']);
export type ExportKind = z.infer<typeof exportKindSchema>;

export const exportStatusSchema = z.enum(['pending', 'rendering', 'done', 'error']);
export type ExportStatus = z.infer<typeof exportStatusSchema>;

export const templateKindSchema = z.enum(['cover', 'grid', 'collection']);
export type TemplateKind = z.infer<typeof templateKindSchema>;

export const templateCodeSchema = z.enum([
  'cover',
  'grid-2x3',
  'grid-3x4',
  'collection-hero',
]);
export type TemplateCode = z.infer<typeof templateCodeSchema>;

/** Product attribute: order matters for print. */
export const attrSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.string().max(500),
  sort: z.number().int().nonnegative().default(0),
});
export type Attr = z.infer<typeof attrSchema>;

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export const categoryInputSchema = z.object({
  name: z.string().min(1).max(200),
  sort_order: z.number().int().default(0),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categorySchema = categoryInputSchema.extend({
  id: idSchema,
  tenant_id: z.number().int(),
  created_at: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

/* ------------------------------------------------------------------ *
 * Collections
 * ------------------------------------------------------------------ */

export const collectionInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  cover_image_id: idSchema.nullish(),
  sort_order: z.number().int().default(0),
});
export type CollectionInput = z.infer<typeof collectionInputSchema>;

export const collectionSchema = collectionInputSchema.extend({
  id: idSchema,
  tenant_id: z.number().int(),
  created_at: z.string(),
});
export type Collection = z.infer<typeof collectionSchema>;

/* ------------------------------------------------------------------ *
 * Products
 * ------------------------------------------------------------------ */

export const productInputSchema = z.object({
  sku: z.string().max(120).nullish(),
  name: z.string().min(1).max(300),
  description: z.string().max(4000).nullish(),
  /** minor units; null = "price on request" */
  price: z.number().int().nullish(),
  currency: z.string().length(3).default('KGS'),
  attrs: z.array(attrSchema).default([]),
  category_id: idSchema.nullish(),
  collection_id: idSchema.nullish(),
  status: productStatusSchema.default('active'),
  sort_order: z.number().int().default(0),
});
export type ProductInput = z.infer<typeof productInputSchema>;

/** PUT accepts a partial payload. */
export const productUpdateSchema = productInputSchema.partial();
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

export const productImageSchema = z.object({
  id: idSchema,
  product_id: idSchema,
  r2_key: z.string(),
  mime: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  is_primary: z.number().int(),
  sort_order: z.number().int(),
  created_at: z.string(),
});
export type ProductImage = z.infer<typeof productImageSchema>;

export const productSchema = z.object({
  id: idSchema,
  tenant_id: z.number().int(),
  sku: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().int().nullable(),
  currency: z.string(),
  attrs: z.array(attrSchema),
  category_id: idSchema.nullable(),
  collection_id: idSchema.nullable(),
  status: productStatusSchema,
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Product = z.infer<typeof productSchema>;

export type ProductWithImages = Product & { images: ProductImage[] };

export const imageUpdateSchema = z.object({
  is_primary: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});
export type ImageUpdate = z.infer<typeof imageUpdateSchema>;

/* ------------------------------------------------------------------ *
 * Reorder (shared shape for products/categories/collections/pages)
 * ------------------------------------------------------------------ */

export const reorderSchema = z.object({
  ids: z.array(idSchema).min(1),
});
export type Reorder = z.infer<typeof reorderSchema>;

/* ------------------------------------------------------------------ *
 * Catalog projects, pages, exports
 * ------------------------------------------------------------------ */

export const pageFormatSchema = z.enum(['A4', 'A5', 'A3', 'square']);
export type PageFormatT = z.infer<typeof pageFormatSchema>;

export const orientationSchema = z.enum(['portrait', 'landscape']);
export type OrientationT = z.infer<typeof orientationSchema>;

export const projectSettingsSchema = z.object({
  format: pageFormatSchema.default('A4'),
  orientation: orientationSchema.default('portrait'),
  bleedMm: z.number().nonnegative().default(3),
  safeMm: z.number().nonnegative().default(5),
  showToc: z.boolean().default(true),
  priceVisible: z.boolean().default(true),
  /** Font family id from the shared font registry (see fonts.ts). */
  fontFamily: z.string().default('pt-sans'),
  /**
   * Optional display currency. When set, product prices are converted to it
   * using `fxRates` before formatting; without a rate a product keeps its
   * native currency (we never guess a rate). Default: show each product's own.
   */
  displayCurrency: z.string().length(3).optional(),
  /** Rates: units of displayCurrency per 1 unit of the keyed currency. */
  fxRates: z.record(z.string(), z.number().positive()).optional(),
  header: z.string().max(300).optional(),
  footer: z.string().max(300).optional(),
});
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;

export const projectInputSchema = z.object({
  name: z.string().min(1).max(300),
  locale: z.string().min(2).max(10).default('ru'),
  settings: projectSettingsSchema.default({}),
  status: projectStatusSchema.default('draft'),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectUpdateSchema = projectInputSchema.partial();
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

export const projectSchema = z.object({
  id: idSchema,
  tenant_id: z.number().int(),
  name: z.string(),
  locale: z.string(),
  settings: projectSettingsSchema,
  status: projectStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

/** Page config, discriminated by the template it uses. */
export const coverConfigSchema = z.object({
  title: z.string().max(300).default(''),
  subtitle: z.string().max(300).optional(),
  imageId: idSchema.optional(),
});

export const gridConfigSchema = z.object({
  source: z.enum(['collection', 'category', 'manual']),
  collectionId: idSchema.optional(),
  categoryId: idSchema.optional(),
  productIds: z.array(idSchema).optional(),
  sectionTitle: z.string().max(300).optional(),
});

export const collectionHeroConfigSchema = z.object({
  collectionId: idSchema,
  heroImageId: idSchema.optional(),
});

export const pageConfigSchema = z.union([
  coverConfigSchema,
  gridConfigSchema,
  collectionHeroConfigSchema,
  z.object({}).passthrough(),
]);
export type PageConfig = z.infer<typeof pageConfigSchema>;

export const pageInputSchema = z.object({
  template_code: templateCodeSchema,
  sort_order: z.number().int().default(0),
  config: pageConfigSchema.default({}),
});
export type PageInput = z.infer<typeof pageInputSchema>;

export const pageUpdateSchema = pageInputSchema.partial();
export type PageUpdate = z.infer<typeof pageUpdateSchema>;

export const pageSchema = z.object({
  id: idSchema,
  project_id: idSchema,
  sort_order: z.number().int(),
  template_code: templateCodeSchema,
  config: pageConfigSchema,
});
export type Page = z.infer<typeof pageSchema>;

export const renderInputSchema = z.object({
  kind: exportKindSchema.default('rgb'),
});
export type RenderInput = z.infer<typeof renderInputSchema>;

export const exportSchema = z.object({
  id: idSchema,
  project_id: idSchema,
  kind: exportKindSchema,
  status: exportStatusSchema,
  r2_key: z.string().nullable(),
  error: z.string().nullable(),
  page_count: z.number().int().nullable(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type CatalogExport = z.infer<typeof exportSchema>;

/* ------------------------------------------------------------------ *
 * API envelope
 * ------------------------------------------------------------------ */

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown } };
export type ApiResponse<T> = ApiOk<T> | ApiErr;
