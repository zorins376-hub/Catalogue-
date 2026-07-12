/**
 * Template data contract (ТЗ §4).
 *
 * This is the stable interface between the API and the print templates.
 * Templates (HTML/CSS) may change freely; this shape must not — so the backend
 * can be built against it before any template design lands.
 */

export interface PrintImage {
  /** absolute URL through /img/ with ?w= sized for the cell ×2 */
  url: string;
  width: number;
  height: number;
  dpiAtPlacement: number;
  lowRes: boolean;
}

export interface PrintProduct {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  /** price is formatted on the backend, never in CSS */
  priceFormatted?: string;
  attrs: { key: string; value: string }[];
  /** primary image; absent → the template draws a placeholder */
  image?: PrintImage;
}

export type PrintSection =
  | { kind: 'cover'; title: string; subtitle?: string; image?: PrintImage }
  | { kind: 'toc' } // rendered by Paged.js from section anchors
  | {
      kind: 'collection-hero';
      collection: { name: string; description?: string };
      hero?: PrintImage;
    }
  | {
      kind: 'grid';
      cols: 2 | 3;
      rows: 3 | 4;
      sectionTitle?: string;
      products: PrintProduct[];
    };

export interface PrintSettings {
  format: 'A4';
  bleedMm: number;
  safeMm: number;
  showToc: boolean;
  priceVisible: boolean;
  header?: string;
  footer?: string;
}

export interface PrintData {
  project: {
    id: string;
    name: string;
    locale: string;
    settings: PrintSettings;
  };
  /** in sort_order */
  sections: PrintSection[];
}

/** Summary of low-res photos, shown to the user before rendering (ТЗ §3). */
export interface LowResWarning {
  productId: string;
  productName: string;
  sectionIndex: number;
  dpiAtPlacement: number;
}
