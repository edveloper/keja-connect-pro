-- REPAIR SCRIPT — read supabase/repairs/README.md before running this.
--
-- Shifts every historical charge_month and applied_month forward by one month,
-- correcting the F1 timezone defect that filed every charge one month early.
--
-- Charges and allocations are shifted together, so every tenant's balance is
-- unchanged. Only the month a figure is filed under changes.
--
-- Run STEP 1 on its own first and read the output.

-- ===========================================================================
-- STEP 1 — PREVIEW. Changes nothing. Run this alone.
-- ===========================================================================

SELECT
  t.name                                    AS tenant,
  u.unit_number                             AS unit,
  to_char(t.lease_start, 'YYYY-MM')         AS lease_starts,
  MIN(c.charge_month)                       AS earliest_charge_now,
  to_char(
    to_date(MIN(c.charge_month) || '-01', 'YYYY-MM-DD') + interval '1 month',
    'YYYY-MM'
  )                                         AS earliest_charge_after,
  COUNT(*)                                  AS charge_rows
FROM public.charges c
JOIN public.tenants t ON t.id = c.tenant_id
LEFT JOIN public.units u ON u.id = t.unit_id
WHERE c.type = 'rent'
GROUP BY t.name, u.unit_number, t.lease_start
ORDER BY t.name;

-- Read the result:
--   * `earliest_charge_now` one month BEFORE `lease_starts` -> the data is
--     shifted, and `earliest_charge_after` should equal `lease_starts`.
--     Run STEP 2.
--   * `earliest_charge_now` already equals `lease_starts` -> your data is
--     correct. Do not run STEP 2.


-- ===========================================================================
-- STEP 2 — APPLY. Uncomment the block below and run it.
-- ===========================================================================
--
-- Take a database backup first (Supabase dashboard > Database > Backups).

/*
BEGIN;

-- Drop the uniqueness guard for the duration of the shift: moving every row
-- forward one month transiently collides with the row already in that month.
DROP INDEX IF EXISTS public.uq_charges_rent_tenant_month;

UPDATE public.charges
SET charge_month = to_char(
  to_date(charge_month || '-01', 'YYYY-MM-DD') + interval '1 month',
  'YYYY-MM'
);

UPDATE public.payment_allocations
SET applied_month = to_char(
  to_date(applied_month || '-01', 'YYYY-MM-DD') + interval '1 month',
  'YYYY-MM'
);

-- Collapse any duplicates the shift created, keeping the earliest row.
DELETE FROM public.charges c
USING public.charges keep
WHERE c.type = 'rent'
  AND keep.type = 'rent'
  AND c.tenant_id = keep.tenant_id
  AND c.charge_month = keep.charge_month
  AND (c.created_at, c.id) > (keep.created_at, keep.id);

CREATE UNIQUE INDEX uq_charges_rent_tenant_month
  ON public.charges(tenant_id, charge_month)
  WHERE type = 'rent';

-- Fill any months still missing, then rebuild every tenant's allocations so
-- balances settle under the corrected months.
SELECT public.generate_monthly_charges(NULL);

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    PERFORM public.reallocate_tenant_payments(r.id);
  END LOOP;
END $$;

-- Risk snapshots are derived data keyed by month; drop them and re-run the
-- risk scan from the app afterwards.
DELETE FROM public.tenant_risk_snapshots;

COMMIT;
*/


-- ===========================================================================
-- STEP 3 — VERIFY. Run after STEP 2.
-- ===========================================================================
--
-- Every row should now show earliest_charge = lease_starts.
--
-- SELECT t.name, to_char(t.lease_start,'YYYY-MM') AS lease_starts,
--        MIN(c.charge_month) AS earliest_charge
-- FROM public.charges c
-- JOIN public.tenants t ON t.id = c.tenant_id
-- WHERE c.type = 'rent'
-- GROUP BY t.name, t.lease_start
-- HAVING MIN(c.charge_month) <> to_char(t.lease_start,'YYYY-MM');
