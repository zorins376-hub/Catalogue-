# WasserCatalog

Print-ready product catalog generator. Data lives in Cloudflare D1, images in R2,
PDFs are produced by rendering HTML/CSS templates through Paged.js + Browser Rendering
(RGB, MVP) and Ghostscript for CMYK (later stage).

Implementation follows `wassercatalogtzv1` (the ТЗ). This repo is a pnpm monorepo.

## Layout

```
wasser-catalog/
├── apps/
│   ├── api/        # Cloudflare Worker: Hono + D1 + R2 + KV + Browser Rendering
│   └── web/        # React + TS + Vite → Cloudflare Pages (admin)
├── packages/
│   └── shared/     # zod schemas + types (PrintData contract, DPI math)
└── templates/      # HTML/CSS print templates + Paged.js (base, cover, grid, hero)
```

## Prerequisites

- Node ≥ 22, pnpm ≥ 10
- A Cloudflare account with Workers, D1, R2, KV and Browser Rendering enabled
- `wrangler` (installed as an api dev dependency)

## Getting started

```bash
pnpm install

# create the local D1 database and apply migrations
pnpm --filter @wasser/api db:migrate:local

# seed templates + tenant + 10 demo products
pnpm --filter @wasser/api db:seed:local

# run the API worker locally
pnpm dev:api

# run the admin UI
pnpm dev:web
```

## Tests

Unit tests (vitest) cover the pure logic — DPI math, money/currency, page-format
geometry, the font registry, the image-header parser and the print renderer.

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

CI (`.github/workflows/ci.yml`) runs typecheck + tests + web build on every PR.

## Status (by ТЗ stages)

Code order per the ТЗ is **1 → 2 → 4 → 5 → 3 → 6 → 7**.

| # | Stage | State |
|---|-------|-------|
| 1 | D1 migration + seed | ✅ implemented |
| 2 | API CRUD + R2 image upload + `print-data` | ✅ implemented (multi-format, multi-currency, fonts) |
| 3 | Admin UI (products, dnd photos, reorder) | ✅ product editor + drag-and-drop photos |
| 4 | Templates cover / grid / hero + `/print/:id` | 🚧 scaffold |
| 5 | RGB render via Browser Rendering | ✅ pipeline implemented (needs Cloudflare BROWSER to run) |
| 6 | TOC, running headers, page numbers | ✅ live TOC (target-counter) + numbering |
| 7 | CMYK: Containers + Ghostscript | ⬜ |

## Configuration

See `apps/api/wrangler.toml` for the required bindings:

- `DB` — D1 database (`wasser-catalog`)
- `BUCKET` — R2 bucket (`img/…` and `pdf/…`)
- `KV` — KV namespace for one-time render tokens
- `BROWSER` — Browser Rendering binding
- `ADMIN_TOKEN`, `PUBLIC_BASE_URL` — secrets/vars

## Project settings (`catalog_projects.settings`)

- `format` — `A4` | `A5` | `A3` | `square`; `orientation` — `portrait` | `landscape`.
  Page box, content box and grid-cell DPI all derive from the format (see
  `packages/shared/src/formats.ts`).
- `fontFamily` — id from the font registry (`packages/shared/src/fonts.ts`, 18
  full-Cyrillic families). RGB render loads it from Google Fonts; CMYK embeds a
  self-hosted subset at stage 7.
- Multi-currency — each product carries its own `currency`; optionally set
  `displayCurrency` + `fxRates` (units of displayCurrency per 1 unit of the
  source currency) to render a unified currency. Without a rate a product keeps
  its native currency. `GET /api/meta` returns the available formats and fonts.

## Open questions (ТЗ §8) — resolved

1. ✅ Multi-format: A4 / A5 / A3 / square + portrait/landscape.
2. ✅ Multi-currency: per-product currency + optional display-currency conversion.
3. ✅ Fonts: broad Cyrillic-capable registry (no brand fonts supplied yet).
4. ⏳ Design samples — templates stay on the neutral grid until they arrive.
