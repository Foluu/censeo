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
npm run db:seed

npm run dev                 # http://localhost:3000
```

Demo logins (seeded):

| Role  | Email               | Password  |
| ----- | ------------------- | --------- |
| Admin | admin@censeo.app    | Admin123! |
| Staff | emmanuel@censeo.app | Staff123! |

## Modules

- **Dashboard** — monthly revenue (with trend), units sold, stock value, rep/warehouse/product rankings, low-stock alerts, revenue chart
- **Sales** — multi-line sale entry; transactionally validates and deducts warehouse stock; oversells are rejected
- **Inventory** — live stock levels per warehouse + goods-received history
- **Products** — item master (SKU, pricing, reorder levels, tracking flags), archive/restore
- **Customers** — directory with lifetime value
- **Transfers** — request → approve/cancel between warehouses, ledger-backed
- **Reports** — inventory summary, category breakdown, monthly sales (admin only)
- **Settings** — profile + team overview (admin)

## Production deployment

1. Create a Postgres database (Neon / Supabase free tier works).
2. Set `DATABASE_URL` and a fresh `AUTH_SECRET` in your host's env settings.
3. Apply schema + seed: `npx prisma db push && npm run db:seed` (or run `prisma/migrations/0001_init/migration.sql`).
4. Deploy to Vercel (zero config) or any Node host: `npm run build && npm start`.

## Architecture notes

- Mutations are Server Actions in `src/lib/actions/*`, each re-validating the
  session (`requireSession`) and input (Zod) server-side.
- Sales/transfers wrap stock checks + writes in a single `db.$transaction`, so
  concurrent oversells can't corrupt stock.
- `src/lib/queries.ts` derives stock from `SUM(StockMovement.quantity)` grouped
  by product × warehouse — the ledger is the single source of truth.
