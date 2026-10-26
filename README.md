# Censeo — Inventory Intelligence

Modern inventory & sales management for distribution businesses. Full rewrite of
the legacy **CountBook** system on a single TypeScript stack.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) — one deployable for UI + API
- **Prisma 6 + PostgreSQL** — append-only `StockMovement` ledger; stock on hand is always derived, never overwritten
- **Auth**: bcrypt password hashing + jose-signed httpOnly session cookies, role-based access (ADMIN / STAFF), route guard in `src/proxy.ts`
- **UI**: TailwindCSS 4, shadcn/ui, Framer Motion, Recharts, dark-first amber/slate theme

## Getting started

```bash
npm install

# Terminal 1 — local Postgres (no Docker needed)
npm run db:dev

# Terminal 2 — first run only
cp .env.example .env        # then set DATABASE_URL to the URL printed by db:dev (+ pgbouncer=true) and a fresh AUTH_SECRET
npx prisma db push
npm run db:seed             # demo data; on an existing database run `npm run db:backfill` after pulling schema changes

npm run dev                 # http://localhost:3000
```

Demo logins (seeded):

| Role  | Email               | Password  |
| ----- | ------------------- | --------- |
| Admin | admin@censeo.app    | Admin123! |
| Staff | emmanuel@censeo.app | Staff123! |

## Modules

- **Dashboard** — monthly revenue (with trend), units sold, stock value, rep/warehouse/product rankings, low-stock alerts, revenue chart
- **Sales** — multi-line sale entry; transactionally validates and deducts warehouse stock; oversells are rejected. Filter by date range, payment, status and warehouse
- **Receipts** — printable/shareable customer receipt for every sale (`/sales/[id]`), headed with the business details set in Settings
- **Inventory** — live stock levels per warehouse + goods-received history
- **Products** — item master (SKU, pricing, reorder levels, tracking flags), archive/restore; at-a-glance summary, table or catalogue grid, filters, group-by, and a detail page per product. Star products as "major" to pin them under Products in the sidebar
- **Categories** (`/products/categories`) — a category tree up to 4 levels deep (e.g. Phones › Apple › iPhone): add several at once, add sub-categories in place, rename, move, reorder, search; deleting a category moves its products and sub-categories up to the parent. Filtering by a category includes everything beneath it.
- **Attributes** (`/products/categories?tab=attributes`) — user-defined attributes (Colour, Storage, Grade…) with options and rules: one vs. several options, required, filterable, and which categories they apply to (each category includes its sub-categories)
- **Customers** — directory with lifetime value
- **Transfers** — request → approve/cancel between warehouses, ledger-backed
- **Reports** — inventory summary, category breakdown, monthly sales (admin only); export any report as CSV (raw numbers, Excel-friendly) or PDF via `/api/reports/export?type=…&format=csv|pdf`
- **Profile** (`/profile`) — every user can change their display name and profile photo / initials colour
- **Settings** — profile + team overview (admin)

## Mobile & PWA

- Mobile-first layout below the `lg` breakpoint: bottom tab bar (Home, Sales, Inventory, Products — Customers for staff — and Settings), a top-left ⋮ button for the full sidebar, a top-right profile menu (profile, settings, log out), bottom-sheet dialogs, and card lists in place of tables (desktop layout is unchanged).
- Installable PWA: `src/app/manifest.ts`, icons in `public/icons/`, and `public/sw.js` (cache-first for hashed build assets, offline fallback page for navigations; authenticated pages are never cached). The service worker registers only in production builds — test install with `npm run build && npm start` (HTTPS or localhost required).

## Deploying to Render (demo)

`render.yaml` is a Render Blueprint that creates the Postgres database and the web service together (Frankfurt region, free plans).

1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → pick the repo → **Apply**.
3. Wait for the first deploy. `scripts/render-start.mjs` syncs the schema on every start and, when `SEED_DEMO=true` (set by the Blueprint) **and the database is empty**, loads the demo data in the background (1–3 minutes).

`DATABASE_URL` (internal) and `AUTH_SECRET` (randomly generated) are set by the Blueprint. Free-plan limits: the web service sleeps after ~15 minutes idle (the next visit takes ~1 minute to wake), and free databases expire — check Render's current terms.

## New client workspace (empty, no demo data)

Give each client their own Render **Postgres** + **Web Service** (same settings as the demo), with these environment variables:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | the new database's **Internal** URL |
| `AUTH_SECRET` | a new random secret |
| `NODE_VERSION` | `22` |
| `SETUP_CODE` | a one-time code you send the client, e.g. `PRIME-7Q4K` |

Do **not** set `SEED_DEMO`. On first start the tables are created and left empty; the first visit opens `/setup`, where the client enters the setup code and creates their admin account, business name and first warehouse. Setup closes as soon as one account exists. The dashboard then shows a "Getting started" checklist. Never run `npm run db:seed` against a client database — it wipes everything.

## Production deployment (other hosts)

1. Create a Postgres database (Neon / Supabase free tier works).
2. Set `DATABASE_URL` and a fresh `AUTH_SECRET` in your host's env settings.
3. Apply schema + seed: `npx prisma db push && npm run db:seed` (or run the SQL files in `prisma/migrations/` in order).
4. Deploy to Vercel (zero config) or any Node host: `npm run build && npm start`.

## Architecture notes

- Mutations are Server Actions in `src/lib/actions/*`, each re-validating the
  session (`requireSession`) and input (Zod) server-side.
- Sales/transfers wrap stock checks + writes in a single `db.$transaction`, so
  concurrent oversells can't corrupt stock.
- `src/lib/queries.ts` derives stock from `SUM(StockMovement.quantity)` grouped
  by product × warehouse — the ledger is the single source of truth.
