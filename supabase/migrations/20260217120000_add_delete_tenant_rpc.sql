-- Phase 2: transactional tenant deletion RPC

CREATE OR REPLACE FUNCTION public.delete_tenant_cascade(
  p_tenant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.user_id INTO v_tenant_user_id
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_tenant_user_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  IF v_tenant_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized for tenant %', p_tenant_id;
  END IF;

  -- Cascades remove related charges/payments/allocations via FK rules.
  DELETE FROM public.tenants
  WHERE id = p_tenant_id;
END;
$$;

