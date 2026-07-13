import { describe, expect, it } from 'vitest';
import type { PrintData, PrintProduct } from '@wasser/shared';
import { renderPrintHtml } from './renderHtml';

function make(products: PrintProduct[]): PrintData {
  return {
    project: {
      id: 'p1',
      name: 'Каталог',
      locale: 'ru',
      settings: {
        format: 'A4',
        orientation: 'portrait',
        bleedMm: 3,
        safeMm: 5,
        showToc: true,
        priceVisible: true,
        fontFamily: 'pt-sans',
        footer: 'Каталог 2026',
      },
    },
    sections: [
      { kind: 'cover', title: 'Обложка' },
      { kind: 'toc' },
      { kind: 'grid', cols: 3, rows: 4, sectionTitle: 'Фильтры', products },
    ],
  };
}

const baseProduct: PrintProduct = { id: 'x', name: 'Товар', attrs: [], priceFormatted: '100 сом' };

describe('renderPrintHtml (ТЗ §4/§5/§6)', () => {
  const html = renderPrintHtml(make([baseProduct]));

  it('emits a full HTML document with the bleed page size', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page');
    expect(html).toContain('size: 216mm 303mm'); // A4 + 3mm bleed each side
  });

  it('registers the Paged.js hook BEFORE loading the polyfill (render-hang fix)', () => {
    const cfg = html.indexOf('window.PagedConfig =');
    const scriptLoad = html.indexOf('<script src="https://unpkg.com/pagedjs');
    expect(cfg).toBeGreaterThan(-1);
    expect(scriptLoad).toBeGreaterThan(-1);
    expect(cfg).toBeLessThan(scriptLoad);
  });

  it('numbers pages and builds a TOC with target-counter', () => {
    expect(html).toContain('@bottom-center { content: counter(page)');
    expect(html).toContain('target-counter(attr(href), page)');
    expect(html).toContain('Фильтры'); // grid with a sectionTitle → TOC entry
    expect(html).toContain('href="#sec-2"');
  });

  it('escapes untrusted product text', () => {
    const withXss = renderPrintHtml(
      make([{ id: 'y', name: '<script>alert(1)</script>', attrs: [] }]),
    );
    expect(withXss).not.toContain('<script>alert(1)</script>');
    expect(withXss).toContain('&lt;script&gt;');
  });
});
