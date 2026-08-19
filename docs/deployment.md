# Deployment

## 1. Apply the database migrations

Files in `supabase/migrations/` run in filename order. If you use the CLI:

```sh
supabase db push
```

If you paste into the Supabase SQL editor instead, run these three in order —
each is one transaction, so paste and run one file at a time:

1. `20260817100000_fix_financial_math_and_scoping.sql`
2. `20260817101000_recurring_billing.sql`
3. `20260817102000_payment_integrity.sql`

Watch the output of each. Two notices are expected and fine:

- `Scheduled nightly rent billing` — `pg_cron` is available and the job is set.
- `pg_cron is not available...` — billing will run from the app instead. To fix,
  enable `pg_cron` under **Database → Extensions**, then re-run the `DO $$` block
  at the end of migration 2.

## 2. Repair the historical charge months

Every charge written before these migrations is filed one month early (the F1
timezone defect). Read `supabase/repairs/README.md`, run the preview query in
`supabase/repairs/01_shift_charge_months.sql`, and only then run the apply step.

**Take a backup first** — Database → Backups.

Skip this only if the preview shows your earliest charge month already matches
each tenant's lease start month.

## 3. Verify

In the SQL editor:

```sql
-- Every active tenant should have a charge for the current month.
SELECT t.name, c.charge_month, c.amount
FROM public.tenants t
LEFT JOIN public.charges c
  ON c.tenant_id = t.id
 AND c.type = 'rent'
 AND c.charge_month = to_char(timezone('Africa/Nairobi', now()), 'YYYY-MM')
WHERE t.status = 'active'
ORDER BY t.name;

-- No tenant should have two rent charges in one month.
SELECT tenant_id, charge_month, COUNT(*)
FROM public.charges WHERE type = 'rent'
GROUP BY 1, 2 HAVING COUNT(*) > 1;

-- Allocations should never exceed the payment they belong to.
SELECT p.id, p.amount, SUM(pa.amount) AS allocated
FROM public.payments p
JOIN public.payment_allocations pa ON pa.payment_id = p.id
GROUP BY p.id, p.amount
HAVING SUM(pa.amount) > p.amount;
```

The first should list every tenant with a charge; the second and third should
both return no rows.

## 4. Deploy the app

```sh
npm ci
npm run build     # typechecks first, then builds
```

Vercel picks up `vercel.json` for SPA routing. Set `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` in the project's
environment variables.

## Smoke test after deploying

- Dashboard shows a rent-billed figure for the current month, not zero.
- Add a tenant with a lease starting three months ago; they should show three
  months of arrears, not "paid".
- Record a part payment; it should clear the oldest month, and the dialog should
  say so before you submit.
- Record a payment with an M-Pesa code, then try the same code again — it should
  be refused.
- Open a tenant's statement; the month rows should sum to the balance shown.
- Paste an M-Pesa message into "Record payments from M-Pesa"; it should match to
  a tenant by phone number.
- Export the Lender Pack; it should cover twelve months, not one.

## Rollback

The migrations are additive — they replace function bodies and add columns,
indexes and tables. Nothing is dropped except superseded function overloads.
To roll back the app, redeploy the previous build; the new database objects are
harmless to the old client except `get_financial_statements`, which lost its
`p_user_id` argument.
