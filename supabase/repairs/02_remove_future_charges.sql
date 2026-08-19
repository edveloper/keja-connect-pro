-- REPAIR SCRIPT — read supabase/repairs/README.md before running this.
--
-- Removes rent charges dated after the current month.
--
-- Rent is only ever billed up to the current month, so a charge for a future
-- month should not exist. If you see one on a tenant statement, the most likely
-- cause is that `01_shift_charge_months.sql` was run on data that had already
-- been corrected — the migration's backfill writes correct months, and shifting
-- those forward again moves them one month into the future.
--
-- A future charge inflates "rent billed" and makes a tenant look further behind
-- than they are, so it is worth clearing.

-- ===========================================================================
-- STEP 1 — PREVIEW. Changes nothing. Run this alone.
-- ===========================================================================

SELECT
  to_char(timezone('Africa/Nairobi', now()), 'YYYY-MM') AS current_month,
  c.charge_month,
  c.type,
  COUNT(*)                                              AS charges,
  SUM(c.amount)                                         AS total_amount
FROM public.charges c
WHERE c.charge_month > to_char(timezone('Africa/Nairobi', now()), 'YYYY-MM')
GROUP BY c.charge_month, c.type
ORDER BY c.charge_month;

-- No rows: nothing to do, your data is fine.
-- Rows returned: those months are in the future. Run STEP 2.


-- ===========================================================================
-- STEP 2 — APPLY. Uncomment and run.
-- ===========================================================================
--
-- Take a backup first (Supabase dashboard > Database > Backups).

/*
BEGIN;

-- Only rent is auto-generated, so only rent can be wrongly dated forward.
-- Opening balances are deliberately placed and are left alone.
DELETE FROM public.charges
WHERE type = 'rent'
  AND charge_month > to_char(timezone('Africa/Nairobi', now()), 'YYYY-MM');

-- Payments may have been applied to those months; rebuild every tenant's
-- allocations so the money lands on real charges again.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    PERFORM public.reallocate_tenant_payments(r.id);
  END LOOP;
END $$;

-- Risk snapshots are derived from the balances that just changed.
DELETE FROM public.tenant_risk_snapshots;

COMMIT;
*/


-- ===========================================================================
-- STEP 3 — VERIFY. Should return no rows.
-- ===========================================================================
--
-- SELECT charge_month, COUNT(*)
-- FROM public.charges
-- WHERE charge_month > to_char(timezone('Africa/Nairobi', now()), 'YYYY-MM')
-- GROUP BY charge_month;
