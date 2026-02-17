-- Phase 2 checkpoint utility:
-- Reset financial history for a single consenting user while preserving
-- properties, units, tenants, and tenant profile details.
--
-- Target user:
-- 699d013c-0be6-4cc1-9bcf-6a3773f3d8f5

BEGIN;

DO $$
DECLARE
  v_user_id UUID := '699d013c-0be6-4cc1-9bcf-6a3773f3d8f5';
BEGIN
  -- Remove expenses for this user.
  DELETE FROM public.expenses e
  WHERE e.user_id = v_user_id;

  -- Remove payment allocations attached to this user's payments.
  DELETE FROM public.payment_allocations pa
  USING public.payments p
  WHERE pa.payment_id = p.id
    AND p.user_id = v_user_id;

  -- Remove payments for this user.
  DELETE FROM public.payments p
  WHERE p.user_id = v_user_id;

  -- Remove generated charges for this user if the charges table is present.
  -- charges does not have user_id in this schema, so scope via tenant ownership.
  IF to_regclass('public.charges') IS NOT NULL THEN
    DELETE FROM public.charges c
    USING public.tenants t
    WHERE c.tenant_id = t.id
      AND t.user_id = v_user_id;
  END IF;
END
$$;

COMMIT;
