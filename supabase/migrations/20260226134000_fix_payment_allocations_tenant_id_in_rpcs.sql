-- Ensure payment_allocations.tenant_id is supported consistently and
-- all payment allocation RPCs populate it.

ALTER TABLE IF EXISTS public.payment_allocations
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE public.payment_allocations pa
SET tenant_id = p.tenant_id
FROM public.payments p
WHERE p.id = pa.payment_id
  AND pa.tenant_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_allocations'
      AND column_name = 'tenant_id'
  ) THEN
    BEGIN
      ALTER TABLE public.payment_allocations
        ALTER COLUMN tenant_id SET NOT NULL;
    EXCEPTION WHEN others THEN
      -- If historical orphan rows exist, keep migration non-breaking.
      NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'payment_allocations'
      AND c.conname = 'payment_allocations_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.payment_allocations
      ADD CONSTRAINT payment_allocations_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_allocations_tenant_month
  ON public.payment_allocations(tenant_id, applied_month);

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

    INSERT INTO public.payment_allocations (payment_id, tenant_id, applied_month, amount)
    VALUES (v_payment_id, p_tenant_id, v_month, LEAST(v_remaining, v_outstanding));

    v_remaining := v_remaining - LEAST(v_remaining, v_outstanding);
  END LOOP;

  IF v_remaining > 0 THEN
    INSERT INTO public.payment_allocations (payment_id, tenant_id, applied_month, amount)
    VALUES (v_payment_id, p_tenant_id, p_payment_month, v_remaining);
  END IF;

  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_payment_with_allocations(
  p_tenant_id UUID,
  p_amount INTEGER,
  p_payment_month TEXT,
  p_user_id UUID,
  p_mpesa_code TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_allocations JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE(payment_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.payments (
    tenant_id, amount, payment_month, mpesa_code, note, user_id
  )
  VALUES (
    p_tenant_id, p_amount, p_payment_month, p_mpesa_code, p_note, p_user_id
  )
  RETURNING id, public.payments.created_at INTO v_payment_id, v_created_at;

  INSERT INTO public.payment_allocations (payment_id, tenant_id, applied_month, amount)
  SELECT
    v_payment_id,
    p_tenant_id,
    elem->>'applied_month',
    (elem->>'amount')::INTEGER
  FROM jsonb_array_elements(COALESCE(p_allocations, '[]'::JSONB)) elem
  WHERE (elem->>'applied_month') IS NOT NULL
    AND (elem->>'amount') IS NOT NULL
    AND (elem->>'amount')::INTEGER > 0;

  payment_id := v_payment_id;
  created_at := v_created_at;
  RETURN NEXT;
END;
$$;
