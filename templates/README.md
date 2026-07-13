# Print templates

These are the HTML/CSS print templates rendered through **Paged.js** into
print-ready pages (ТЗ §1, §5). They consume the `PrintData` contract from
`@wasser/shared` (ТЗ §4) — the data shape is frozen, the visual design is not.

## Status

Design is a **placeholder** until brand samples arrive (ТЗ §8 Q4). For the MVP,
the authoritative renderer that produces the `/print/:id` page is
`apps/api/src/print/renderHtml.ts` — it emits a self-contained document (inlined
CSS + Paged.js) so the render pipeline can be validated on seed data before the
final design lands. `base/print.css` here is the shared design source designers
iterate on; once it stabilises it will be the single stylesheet the renderer links.

## Geometry (shared by RGB + CMYK — ТЗ §5)

- `@page { size: 216mm 303mm }` — A4 (210×297) + 3 mm bleed on every side.
- Content box 210×297 centred; safe zone 5 mm further in.
- Crop marks are **not** drawn in CSS — Ghostscript/the printer adds them from
  the bleed box, and TrimBox/BleedBox are stamped at the `gs` step (stage 7).

## Templates

| folder             | code              | kind        | notes |
|--------------------|-------------------|-------------|-------|
| `base/`            | —                 | —           | `@page`, bleed, running heads/feet, TOC handlers |
| `cover/`           | `cover`           | cover       | full-bleed image + title/subtitle |
| `grid-2x3/`        | `grid-2x3`        | grid        | 2 cols × 3 rows, product cards |
| `grid-3x4/`        | `grid-3x4`        | grid        | 3 cols × 4 rows, product cards |
| `collection-hero/` | `collection-hero` | collection  | full-bleed hero + collection intro |

`grid-*` is a **section**, not a physical page: Paged.js flows the product list
across as many pages as needed. Cards use `break-inside: avoid` so no card is
ever split. Text zones are fixed-height with `line-clamp` (2 lines name, 3 lines
description) so overflow never shifts the grid. Missing photos render a
same-proportion placeholder so the grid does not move.

## Render contract

The page must set `window.PagedDone = true` once pagination finishes (Paged.js
`after` hook) so the Browser Rendering worker knows when to call `page.pdf()`.
