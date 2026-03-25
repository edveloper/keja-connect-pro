-- One-off landlord reset for user:
-- 699d013c-0be6-4cc1-9bcf-6a3773f3d8f5
--
-- Preserves:
-- - properties
-- - units
-- - tenants.name
-- - tenants.phone
-- - tenants.unit_id
-- - tenants.rent_amount
-- - tenants.user_id
--
-- Resets/removes:
-- - payments
-- - payment_allocations
-- - charges
-- - expenses
-- - tenant_risk_snapshots
-- - reminder_queue
-- - report_narratives
-- - tenants.lease_start
-- - tenants.security_deposit
-- - tenants.opening_balance
-- - tenants.first_month_override
-- - tenants.is_prorated

BEGIN;

DO $$
DECLARE
  v_user_id UUID := '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';
BEGIN
  -- Delete derived intelligence/reporting state first.
  DELETE FROM public.reminder_queue
  WHERE user_id = v_user_id;

  DELETE FROM public.tenant_risk_snapshots
  WHERE user_id = v_user_id;

  DELETE FROM public.report_narratives
  WHERE user_id = v_user_id;

  -- Delete payment allocations before payments.
  DELETE FROM public.payment_allocations pa
  USING public.payments p
  WHERE pa.payment_id = p.id
    AND p.user_id = v_user_id;

  -- Delete financial transactions.
  DELETE FROM public.payments
  WHERE user_id = v_user_id;

  DELETE FROM public.charges c
  WHERE c.tenant_id IN (
    SELECT t.id
    FROM public.tenants t
    WHERE t.user_id = v_user_id
  );

  DELETE FROM public.expenses
  WHERE user_id = v_user_id;

  -- Reset tenant fields while preserving identity, occupancy, and rent.
  UPDATE public.tenants
  SET
    lease_start = NULL,
    security_deposit = 0,
    opening_balance = 0,
    first_month_override = NULL,
    is_prorated = false,
    updated_at = now()
  WHERE user_id = v_user_id;
END
$$;

COMMIT;
