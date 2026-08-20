-- REPAIR SCRIPT — read supabase/repairs/README.md before running this.
--
-- Deletes one landlord's account and every trace of their data, so they can
-- sign up again from scratch with the same email address.
--
--   Account   699d013c-0be6-4cc1-9bcf-6a3773f3d8f5
--
-- THIS IS NOT REVERSIBLE. There is no undo short of a database restore.

-- ===========================================================================
-- YOU PROBABLY DO NOT NEED THE SQL IN THIS FILE
-- ===========================================================================
--
-- Every table hangs off auth.users by ON DELETE CASCADE, either directly or
-- one hop away:
--
--   auth.users
--     |-- properties, units, tenants, payments, expenses, expense_categories,
--     |   landlord_settings, ops_events, reminder_queue, report_narratives,
--     |   tenant_risk_snapshots, user_migrations      (user_id -> CASCADE)
--     |
--     |-- tenants  --> charges                        (tenant_id -> CASCADE)
--     '-- payments --> payment_allocations            (payment_id -> CASCADE)
--
-- charges and payment_allocations are the only two tables with no user_id;
-- both are reached through their parent, so nothing is left orphaned.
--
-- So the whole job is: delete the user in
--   Supabase dashboard > Authentication > Users > (row) > Delete user
--
-- That is a hard delete and frees the email address immediately. Postgres
-- does the rest. STEP 1 and STEP 3 below are just proof it worked.


-- ===========================================================================
-- STEP 1 — BEFORE. Run this first and keep the output.
-- ===========================================================================

SELECT 'properties'        AS table_name, COUNT(*) AS rows FROM public.properties        WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'units',              COUNT(*) FROM public.units                 WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'tenants',            COUNT(*) FROM public.tenants               WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'payments',           COUNT(*) FROM public.payments              WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'expenses',           COUNT(*) FROM public.expenses              WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'expense_categories', COUNT(*) FROM public.expense_categories    WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'landlord_settings',  COUNT(*) FROM public.landlord_settings     WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'ops_events',         COUNT(*) FROM public.ops_events            WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'reminder_queue',     COUNT(*) FROM public.reminder_queue        WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'report_narratives',  COUNT(*) FROM public.report_narratives     WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'risk_snapshots',     COUNT(*) FROM public.tenant_risk_snapshots WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'user_migrations',    COUNT(*) FROM public.user_migrations       WHERE user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'charges (via tenant)',   COUNT(*) FROM public.charges c
  JOIN public.tenants t ON t.id = c.tenant_id WHERE t.user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
UNION ALL SELECT 'allocations (via payment)', COUNT(*) FROM public.payment_allocations pa
  JOIN public.payments p ON p.id = pa.payment_id WHERE p.user_id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5'
ORDER BY table_name;


-- ===========================================================================
-- STEP 2 — DELETE. Use the dashboard.
-- ===========================================================================
--
-- Take a backup first: Database > Backups.
--
-- Then: Authentication > Users > search the email > row menu > Delete user.
-- Confirm the UID on the row is 699d013c-0be6-4cc1-9bcf-6a3773f3d8f5 before
-- you confirm. There is no second chance.
--
-- Only if the dashboard refuses, uncomment this. It does exactly the same
-- thing, with none of the dashboard's safety rails:
--
-- DELETE FROM auth.users WHERE id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';


-- ===========================================================================
-- STEP 3 — AFTER. Re-run STEP 1.
-- ===========================================================================
--
-- Every row must read 0. If any table still has rows, its foreign key is
-- missing the CASCADE and needs deleting by hand — tell me which one.
--
-- Confirm the login is gone and the email is free to reuse:
--
-- SELECT COUNT(*) AS should_be_zero
-- FROM auth.users
-- WHERE id = '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';


-- ===========================================================================
-- WHEN SHE SIGNS UP AGAIN
-- ===========================================================================
--
-- Same email and password work immediately; the new account gets a new UID.
--
-- Have her clear the old browser state first, or the app will carry stale
-- markers into the fresh account. In the browser console on the app, once:
--
--   Object.keys(localStorage)
--     .filter(k => k.startsWith('rentkonnect:'))
--     .forEach(k => localStorage.removeItem(k));
--
-- Then hard-refresh. Signing out and back in does not clear these.
