-- Resolve overloaded RPC ambiguity for payment recording.
-- Keep exactly one canonical signature for record_payment_with_smart_allocation.

-- Drop known conflicting overloads (legacy variants).
DROP FUNCTION IF EXISTS public.record_payment_with_smart_allocation(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, DATE);
DROP FUNCTION IF EXISTS public.record_payment_with_smart_allocation(UUID, INTEGER, TEXT, TEXT, TEXT, UUID);

-- Drop/recreate canonical function to ensure stable definition.
DROP FUNCTION IF EXISTS public.record_payment_with_smart_allocation(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.record_payment_with_smart_allocation(
  p_tenant_id UUID,
  p_amount INTEGER,
  p_payment_month TEXT,
  p_mpesa_code TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_payment_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_user_id UUID;
  v_payment_id UUID;
  v_remaining INTEGER;
  v_month TEXT;
  v_outstanding INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.user_id INTO v_tenant_user_id
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_tenant_user_id IS NULL OR v_tenant_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized for tenant %', p_tenant_id;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF p_payment_date IS NOT NULL THEN
    SELECT p.id
    INTO v_payment_id
    FROM public.payments p
    WHERE p.tenant_id = p_tenant_id
      AND p.user_id = v_user_id
      AND p.amount = p_amount
      AND p.payment_month = p_payment_month
      AND p.payment_date::date = p_payment_date::date
      AND COALESCE(p.mpesa_code, '') = COALESCE(p_mpesa_code, '')
      AND COALESCE(p.note, '') = COALESCE(p_note, '')
    ORDER BY p.created_at DESC
    LIMIT 1;
  END IF;

  IF v_payment_id IS NULL THEN
    INSERT INTO public.payments (
      tenant_id,
      amount,
      payment_date,
      payment_month,
      mpesa_code,
      note,
      user_id
    )
    VALUES (
      p_tenant_id,
      p_amount,
      COALESCE(p_payment_date, now()),
      p_payment_month,
      p_mpesa_code,
      p_note,
      v_user_id
    )
    RETURNING id INTO v_payment_id;
  END IF;

  DELETE FROM public.payment_allocations
  WHERE payment_id = v_payment_id;

  v_remaining := p_amount;

  FOR v_month, v_outstanding IN
    WITH charge_totals AS (
      SELECT c.charge_month, SUM(c.amount)::INTEGER AS total_charged
      FROM public.charges c
      WHERE c.tenant_id = p_tenant_id
      GROUP BY c.charge_month
    ),
    allocation_totals AS (
      SELECT pa.applied_month AS charge_month, SUM(pa.amount)::INTEGER AS total_allocated
      FROM public.payment_allocations pa
      JOIN public.payments p ON p.id = pa.payment_id
      WHERE p.tenant_id = p_tenant_id
      GROUP BY pa.applied_month
    )
    SELECT
      ct.charge_month,
      GREATEST(ct.total_charged - COALESCE(at.total_allocated, 0), 0)::INTEGER AS outstanding
    FROM charge_totals ct
    LEFT JOIN allocation_totals at ON at.charge_month = ct.charge_month
    WHERE GREATEST(ct.total_charged - COALESCE(at.total_allocated, 0), 0) > 0
    ORDER BY ct.charge_month ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    INSERT INTO public.payment_allocations (payment_id, applied_month, amount)
    VALUES (v_payment_id, v_month, LEAST(v_remaining, v_outstanding));

    v_remaining := v_remaining - LEAST(v_remaining, v_outstanding);
  END LOOP;

  IF v_remaining > 0 THEN
    INSERT INTO public.payment_allocations (payment_id, applied_month, amount)
    VALUES (v_payment_id, p_payment_month, v_remaining);
  END IF;

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_with_smart_allocation(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ)
TO authenticated;
