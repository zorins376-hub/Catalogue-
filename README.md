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

## Status (by ТЗ stages)

Code order per the ТЗ is **1 → 2 → 4 → 5 → 3 → 6 → 7**.

| # | Stage | State |
|---|-------|-------|
| 1 | D1 migration + seed | ✅ implemented |
| 2 | API CRUD + R2 image upload + `print-data` | ✅ implemented |
| 3 | Admin UI (products, dnd photos, reorder) | 🚧 scaffold |
| 4 | Templates cover / grid / hero + `/print/:id` | 🚧 scaffold |
| 5 | RGB render via Browser Rendering | 🚧 scaffold |
| 6 | TOC, running headers, page numbers | ⬜ |
| 7 | CMYK: Containers + Ghostscript | ⬜ |

## Configuration

See `apps/api/wrangler.toml` for the required bindings:

- `DB` — D1 database (`wasser-catalog`)
- `BUCKET` — R2 bucket (`img/…` and `pdf/…`)
- `KV` — KV namespace for one-time render tokens
- `BROWSER` — Browser Rendering binding
- `ADMIN_TOKEN`, `PUBLIC_BASE_URL` — secrets/vars

## Open questions (ТЗ §8, needed before Stage 4)

1. Catalog formats — A4 only, or reserve A5/square in `settings.format`?
2. Currency — KGS only, or multi-currency (USD for export)?
3. Wasser brand fonts — which licensed webfonts (full Cyrillic for print)?
4. Design samples — needed before Stage 4; otherwise templates ship on a neutral grid.
