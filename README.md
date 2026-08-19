# Keja-Connect

Rent tracking for Kenyan landlords. Bills rent monthly, applies payments to the
oldest arrears first, reconciles pasted M-Pesa messages, and exports the twelve
months of income history a bank asks for.

## Running locally

Requires Node 18+.

```sh
npm install
cp .env.example .env   # then fill in your Supabase project values
npm run dev            # http://localhost:8080
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typechecks, then builds for production |
| `npm run typecheck` | `tsc --noEmit` on the app sources |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | ESLint |

## Environment

Copy `.env.example` to `.env` and fill in:

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same page. This is the anon/publishable key and is safe in the browser — row-level security is what protects the data. |
| `VITE_SUPABASE_PROJECT_ID` | Same page |

`.env` is not committed. Do not put a service-role key in it — anything prefixed
`VITE_` is compiled into the JavaScript bundle and visible to anyone.

## Database

Migrations live in `supabase/migrations/` and run in filename order.

```sh
supabase db push
```

Or paste each file into the Supabase SQL editor in order.

`supabase/repairs/` holds one-off data-repair scripts. These are **not**
migrations and are not run by `db push` — read `supabase/repairs/README.md`
before running any of them.

### Rent billing

`generate_monthly_charges()` guarantees that every active tenant has one rent
charge for every month from their lease start to the billing month. It is
idempotent, and runs from two places:

- a nightly `pg_cron` job at 00:30 Africa/Nairobi
- the app itself, once per month per user, on load

The app-side call is the fallback for projects where `pg_cron` is unavailable.
If you enable `pg_cron` later, re-run the scheduling block in
`20260817101000_recurring_billing.sql`.

## Things worth knowing before changing the code

**Never derive a month or date key with `toISOString()`.** It converts to UTC
first, so in Kenya (UTC+3) local midnight on the 1st becomes 21:00 on the last
day of the previous month, and every charge is filed one month early. Use the
helpers in `src/lib/month.ts`. The test suite runs under `TZ=Africa/Nairobi`
specifically so this regression fails the build.

**Allocation is derived, never edited by hand.** `reallocate_tenant_payments()`
rebuilds a tenant's allocations from scratch from their charges and payments.
Anything that changes either side calls it. That rebuild is what makes
overpayment credit carry forward correctly.

**Money is stored as whole shillings in `INTEGER` columns.** Round at the input
boundary; never pass a float to an RPC.

**Never abbreviate money in the UI.** Use `formatKES`. `formatCompact` exists for
chart axis ticks only.

## Stack

Vite · React · TypeScript · Tailwind · shadcn/ui · Supabase · Recharts · Vitest
