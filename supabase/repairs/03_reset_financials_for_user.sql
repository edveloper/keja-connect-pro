-- REPAIR SCRIPT — read supabase/repairs/README.md before running this.
--
-- Clears one landlord's financial history while keeping their setup.
--
--   KEPT     properties, units, tenants (name, phone, unit, rent, deposit,
--            lease start), expenses, expense categories, settings
--   CLEARED  every charge, every payment, every allocation, opening balances,
--            risk scores, queued reminders
--
-- Billing then restarts from the month set in STEP 2 with every tenant at zero.
--
-- Requires migration 20260819120000_billing_start_date.sql to have been applied.
-- Without it there is no `billing_starts_on` column, and the nightly billing job
-- will rebuild every charge you delete here from each tenant's lease start —
-- usually within hours, so it will look as though the reset silently failed.

-- ===========================================================================
-- WHAT THIS SCRIPT IS SET TO
-- ===========================================================================
--   Account        699d013c-0be6-4cc1-9bcf-6a3773f3d8f5
--   Billing restarts  2026-08-01
--
-- Both are written out in full everywhere below. To reset a different account
-- or restart from a different month, find and replace those two values.
--
-- Run each STEP as its own query. Do not paste the whole file at once: the
-- APPLY block is commented out on purpose so it cannot run by accident.


-- ===========================================================================
-- STEP 1 — PREVIEW. Changes nothing. Run this alone and read the output.
-- ===========================================================================

SELECT 'kept: properties'  AS item, COUNT(*)::TEXT AS amount
FROM public.properties WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT 'kept: units', COUNT(*)::TEXT
FROM public.units WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT 'kept: tenants', COUNT(*)::TEXT
FROM public.tenants WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT 'kept: expenses', COUNT(*)::TEXT
FROM public.expenses WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT 'kept: expense value', COALESCE(SUM(amount), 0)::TEXT
FROM public.expenses WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT '--- to be deleted ---', ''
UNION ALL
SELECT 'delete: charges', COUNT(*)::TEXT
FROM public.charges c
JOIN public.tenants t ON t.id = c.tenant_id
WHERE t.user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT 'delete: payments', COUNT(*)::TEXT
FROM public.payments WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT 'delete: payment value', COALESCE(SUM(amount), 0)::TEXT
FROM public.payments WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT 'delete: risk scores', COUNT(*)::TEXT
FROM public.tenant_risk_snapshots WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL
SELECT 'delete: reminders', COUNT(*)::TEXT
FROM public.reminder_queue WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

-- Check that the tenant and expense counts match what she expects to keep,
-- and that the payment value is what she has backed up. Once deleted it is
-- gone: there is no undo beyond a database restore.


-- ===========================================================================
-- STEP 2 — APPLY. Uncomment the block and run it.
-- ===========================================================================
--
-- Take a backup first: Supabase dashboard > Database > Backups.

/*
BEGIN;

-- 1. Payments and everything derived from them.
DELETE FROM public.payment_allocations pa
USING public.payments p
WHERE p.id = pa.payment_id
  AND p.user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

DELETE FROM public.payment_allocations pa
USING public.tenants t
WHERE t.id = pa.tenant_id
  AND t.user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

DELETE FROM public.payments
WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

-- 2. Every charge, including opening balances.
DELETE FROM public.charges c
USING public.tenants t
WHERE t.id = c.tenant_id
  AND t.user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

-- 3. Derived data that described the balances just removed.
DELETE FROM public.tenant_risk_snapshots
WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

DELETE FROM public.reminder_queue
WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

DELETE FROM public.report_narratives
WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

-- 4. Tenants keep their identity and terms, but start financially clean.
--
--    lease_start is deliberately left alone — it is a true fact about the
--    tenancy and appears in no export, so overwriting it would lose it for
--    good. billing_starts_on is what stops the nightly job rebuilding history.
UPDATE public.tenants
SET
  billing_starts_on   = DATE '2026-08-01',
  opening_balance     = 0,
  first_month_override = NULL,
  is_prorated         = false
WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';

COMMIT;
*/


-- ===========================================================================
-- STEP 3 — REBUILD THIS MONTH, then verify.
-- ===========================================================================
--
-- Run as a separate statement after STEP 2 commits. It bills every active
-- tenant for August 2026 only, because billing_starts_on is now August.
--
-- SELECT public.generate_monthly_charges('2026-08');
--
-- Then check: one charge each, this month, and nothing paid yet.
--
-- SELECT t.name,
--        COUNT(c.id)                    AS charges,
--        MIN(c.charge_month)            AS earliest,
--        MAX(c.charge_month)            AS latest,
--        COALESCE(SUM(c.amount), 0)     AS billed
-- FROM public.tenants t
-- LEFT JOIN public.charges c ON c.tenant_id = t.id
-- WHERE t.user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
--   AND t.status = 'active'
-- GROUP BY t.name
-- ORDER BY t.name;
--
-- Every row should read: charges 1, earliest 2026-08, latest 2026-08.
-- If earliest is before 2026-08, billing_starts_on did not take —
-- confirm the migration was applied.


-- ===========================================================================
-- AFTERWARDS, in the app
-- ===========================================================================
--
-- She should also clear the browser's billing marker so the in-app trigger
-- re-runs cleanly. In the browser console on the app, once:
--
--   localStorage.removeItem('rentkonnect:billed:699d013c-0be6-4cc1-9bcf-6a3773f3d8f5')
--
-- Security deposits were left untouched. They record money physically held on
-- behalf of a tenant, not a balance owed, so they survive a books reset. If she
-- wants those cleared too, add to STEP 2:
--
--   UPDATE public.tenants SET security_deposit = 0
--   WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';
