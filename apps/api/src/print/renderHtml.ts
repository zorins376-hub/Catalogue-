import type { PrintData, PrintImage, PrintProduct, PrintSection } from '@wasser/shared';
import { fontById, googleFontsHref, mediaBox } from '@wasser/shared';

/**
 * Server-side renderer for the /print page (ТЗ §4/§5).
 *
 * This produces a self-contained HTML document the Browser Rendering worker
 * loads and Paged.js paginates. It is deliberately design-neutral (ТЗ §8 Q4:
 * real designs land at stage 4) — the geometry, page boxes, break rules and the
 * PagedDone signalling are what matter here; colours/typography get swapped in
 * once brand samples arrive. The visual source of truth lives in /templates.
 */
export function renderPrintHtml(data: PrintData): string {
  const { settings } = data.project;
  // Page (media) box = trim + bleed on all sides, per the project's format.
  const media = mediaBox(settings.format, settings.orientation, settings.bleedMm);
  const font = fontById(settings.fontFamily);

  // Collect TOC entries up front so the toc section (which precedes the grids)
  // can list every downstream section with a live page-number reference.
  const tocEntries = data.sections
    .map((s, i) => tocEntry(s, i))
    .filter((e): e is TocEntry => e !== null);

  const sectionsHtml = data.sections.map((s, i) => renderSection(s, i, tocEntries)).join('\n');

  return `<!doctype html>
<html lang="${esc(data.project.locale)}">
<head>
<meta charset="utf-8">
<title>${esc(data.project.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(googleFontsHref(font))}">
<style>${baseCss(media.widthMm, media.heightMm, settings.safeMm, font.stack, settings.header, settings.footer)}</style>
</head>
<body>
${sectionsHtml}
<script>window.__PRINT_DATA__ = ${safeJson(data)};</script>
<script>
  // MUST run before paged.polyfill.js loads: the polyfill reads window.PagedConfig
  // when it auto-starts, so the "after" hook has to be registered first, or
  // PagedDone would never flip and the render would hang (ТЗ §5).
  window.PagedDone = false;
  window.PagedConfig = { auto: true, after: function () { window.PagedDone = true; } };
  // Fallback: if Paged.js fails to load, resolve after a grace period.
  window.addEventListener('load', function () {
    setTimeout(function () { if (!window.PagedPolyfill) window.PagedDone = true; }, 3000);
  });
</script>
<script src="https://unpkg.com/pagedjs@0.4.3/dist/paged.polyfill.js"></script>
</body>
</html>`;
}

interface TocEntry {
  anchor: string;
  label: string;
}

/** A section's TOC entry, or null if it shouldn't appear (cover, toc itself). */
function tocEntry(section: PrintSection, index: number): TocEntry | null {
  const anchor = `sec-${index}`;
  if (section.kind === 'collection-hero') return { anchor, label: section.collection.name };
  if (section.kind === 'grid' && section.sectionTitle)
    return { anchor, label: section.sectionTitle };
  return null;
}

function renderSection(section: PrintSection, index: number, tocEntries: TocEntry[]): string {
  const anchor = `sec-${index}`;
  switch (section.kind) {
    case 'cover':
      return `<section class="page cover" id="${anchor}">
        ${section.image ? imgTag(section.image, 'cover-img') : ''}
        <div class="cover-text">
          <h1>${esc(section.title)}</h1>
          ${section.subtitle ? `<p class="subtitle">${esc(section.subtitle)}</p>` : ''}
        </div>
      </section>`;
    case 'toc': {
      // Live page numbers via Paged.js target-counter(attr(href), page).
      const items = tocEntries
        .map(
          (e) =>
            `<li><a href="#${e.anchor}"><span class="toc-label">${esc(e.label)}</span><span class="toc-dots"></span></a></li>`,
        )
        .join('');
      return `<section class="page toc" id="${anchor}"><h2>Содержание</h2><ol class="toc-list">${items}</ol></section>`;
    }
    case 'collection-hero':
      return `<section class="page hero" id="${anchor}">
        ${section.hero ? imgTag(section.hero, 'hero-img') : '<div class="hero-img placeholder"></div>'}
        <div class="hero-text">
          <h2>${esc(section.collection.name)}</h2>
          ${section.collection.description ? `<p>${esc(section.collection.description)}</p>` : ''}
        </div>
      </section>`;
    case 'grid': {
      const cards = section.products.map(renderCard).join('\n');
      return `<section class="grid-section" id="${anchor}" style="--cols:${section.cols};--rows:${section.rows}">
        ${section.sectionTitle ? `<h2 class="section-title">${esc(section.sectionTitle)}</h2>` : ''}
        <div class="grid">${cards}</div>
      </section>`;
    }
  }
}

function renderCard(p: PrintProduct): string {
  const lowRes = p.image?.lowRes ? ' data-lowres="1"' : '';
  return `<article class="card"${lowRes}>
    <div class="card-media">${p.image ? imgTag(p.image, 'card-img') : '<div class="card-img placeholder"></div>'}</div>
    <div class="card-body">
      <h3 class="card-name">${esc(p.name)}</h3>
      ${p.description ? `<p class="card-desc">${esc(p.description)}</p>` : ''}
      ${p.attrs.length ? `<dl class="card-attrs">${p.attrs
        .map((a) => `<dt>${esc(a.key)}</dt><dd>${esc(a.value)}</dd>`)
        .join('')}</dl>` : ''}
      ${p.priceFormatted ? `<div class="card-price">${esc(p.priceFormatted)}</div>` : ''}
    </div>
  </article>`;
}

function imgTag(image: PrintImage, cls: string): string {
  return `<img class="${cls}" src="${esc(image.url)}" width="${image.width}" height="${image.height}" loading="eager" alt="">`;
}

function baseCss(
  pageWmm: number,
  pageHmm: number,
  safeMm: number,
  fontStack: string,
  header?: string,
  footer?: string,
): string {
  // Geometry shared by RGB and CMYK (ТЗ §5): page box already includes bleed.
  // Running head/foot + page number live in @page margin boxes; cover & hero
  // set margin:0 so those boxes have no room and stay blank (ТЗ §5: colontitles
  // off on the cover). counter(page) counts physical pages, so the TOC's
  // target-counter values match the actual page numbers.
  return `
  @page {
    size: ${pageWmm}mm ${pageHmm}mm;
    margin: ${safeMm + 3}mm;
    @bottom-center { content: counter(page); font: 8pt ${fontStack}; color:#666; }
    ${footer ? `@bottom-left { content: "${esc(footer)}"; font: 8pt ${fontStack}; color:#666; }` : ''}
    ${header ? `@top-center { content: "${esc(header)}"; font: 8pt ${fontStack}; color:#666; }` : ''}
  }
  @page cover { margin: 0; @bottom-center { content: none; } @bottom-left { content: none; } @top-center { content: none; } }
  @page hero  { margin: 0; @bottom-center { content: none; } @bottom-left { content: none; } @top-center { content: none; } }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: ${fontStack}; color: #111; }
  .page { page-break-after: always; break-after: page; }
  .cover { page: cover; position: relative; width: 100%; height: 100%; display: flex; align-items: flex-end; }
  .cover .cover-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cover .cover-text { position: relative; padding: 24mm; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
  .cover h1 { font-size: 32pt; margin: 0; }
  .cover .subtitle { font-size: 14pt; margin: 4mm 0 0; }
  .toc { page-break-after: always; }
  .toc h2 { font-size: 20pt; margin: 0 0 8mm; }
  .toc-list { list-style: none; padding: 0; margin: 0; }
  .toc-list li { margin: 0 0 3mm; font-size: 11pt; }
  .toc-list a { display: flex; align-items: baseline; text-decoration: none; color: #111; }
  .toc-label { flex: 0 1 auto; }
  /* dotted leader between the label and the page number */
  .toc-dots { flex: 1 1 auto; margin: 0 2mm; border-bottom: 0.3mm dotted #bbb; transform: translateY(-1mm); }
  /* Paged.js resolves target-counter to the real page number (no leader() fn —
     that would invalidate the whole content value in Chromium) */
  .toc-list a::after { content: target-counter(attr(href), page); flex: 0 0 auto; color: #444; }
  .hero { page: hero; position: relative; width: 100%; height: 100%; }
  .hero .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero .hero-text { position: absolute; left: 0; right: 0; bottom: 0; padding: 20mm; background: linear-gradient(transparent, rgba(0,0,0,.6)); color: #fff; }
  .grid-section { break-before: page; }
  .section-title { font-size: 16pt; margin: 0 0 6mm; }
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 6mm;
    align-content: start;
  }
  .card { break-inside: avoid; display: flex; flex-direction: column; border: 0.2mm solid #e5e5e5; border-radius: 2mm; overflow: hidden; }
  .card-media { aspect-ratio: 4 / 3; background: #f4f4f4; }
  .card-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .placeholder { width: 100%; height: 100%; background:
    repeating-linear-gradient(45deg, #eee, #eee 4mm, #f7f7f7 4mm, #f7f7f7 8mm); }
  .card-body { padding: 3mm; display: flex; flex-direction: column; gap: 1.5mm; }
  .card-name { font-size: 10pt; margin: 0; line-height: 1.2;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .card-desc { font-size: 8pt; color: #555; margin: 0; line-height: 1.25;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .card-attrs { display: grid; grid-template-columns: auto 1fr; gap: 0.5mm 2mm; font-size: 7.5pt; margin: 0; }
  .card-attrs dt { color: #888; }
  .card-attrs dd { margin: 0; text-align: right; }
  .card-price { margin-top: auto; font-size: 11pt; font-weight: 600; }
  .card[data-lowres="1"] .card-media::after {
    content: "<300 DPI"; position: relative; float: right; background: #f5c518; color: #000;
    font-size: 6pt; padding: 0.5mm 1mm; }
  `;
}

/* --------------------------- escaping helpers --------------------------- */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * JSON for an inline <script>. Escaping "<" is enough to prevent a </script>
 * breakout; U+2028/U+2029 are valid in modern JS string context so we leave the
 * rest of the payload intact.
 */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
