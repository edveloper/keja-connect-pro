-- Phase 2: schema + RPC alignment with runtime app usage

-- -----------------------------------------------------------------------------
-- 1) Fill legacy column gaps to match generated types / app assumptions
-- -----------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE IF EXISTS public.tenants
  ADD COLUMN IF NOT EXISTS lease_start DATE,
  ADD COLUMN IF NOT EXISTS opening_balance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS security_deposit INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_month_override INTEGER,
  ADD COLUMN IF NOT EXISTS is_prorated BOOLEAN DEFAULT false;

-- -----------------------------------------------------------------------------
-- 2) Charges + allocations tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  charge_month TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'rent',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  applied_month TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_charges_tenant_month
  ON public.charges(tenant_id, charge_month);

CREATE INDEX IF NOT EXISTS idx_charges_type
  ON public.charges(type);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment
  ON public.payment_allocations(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_month
  ON public.payment_allocations(applied_month);

-- One opening-balance charge per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_charges_opening_balance_tenant
  ON public.charges(tenant_id)
  WHERE type = 'opening_balance';

ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "charges_select_own" ON public.charges;
DROP POLICY IF EXISTS "charges_insert_own" ON public.charges;
DROP POLICY IF EXISTS "charges_update_own" ON public.charges;
DROP POLICY IF EXISTS "charges_delete_own" ON public.charges;

CREATE POLICY "charges_select_own"
ON public.charges
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = charges.tenant_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "charges_insert_own"
ON public.charges
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = charges.tenant_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "charges_update_own"
ON public.charges
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = charges.tenant_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = charges.tenant_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "charges_delete_own"
ON public.charges
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = charges.tenant_id
      AND t.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "payment_allocations_select_own" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_insert_own" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_update_own" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_delete_own" ON public.payment_allocations;

CREATE POLICY "payment_allocations_select_own"
ON public.payment_allocations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_allocations.payment_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "payment_allocations_insert_own"
ON public.payment_allocations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_allocations.payment_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "payment_allocations_update_own"
ON public.payment_allocations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_allocations.payment_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_allocations.payment_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "payment_allocations_delete_own"
ON public.payment_allocations
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_allocations.payment_id
      AND p.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 3) RPCs used by app
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_opening_balance_charge(
  p_tenant_id UUID,
  p_amount INTEGER,
  p_effective_month TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_user_id UUID;
  v_charge_id UUID;
BEGIN
  SELECT t.user_id INTO v_tenant_user_id
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_tenant_user_id IS NULL OR v_tenant_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized for tenant %', p_tenant_id;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Opening balance amount must be greater than zero';
  END IF;

  BEGIN
    INSERT INTO public.charges (tenant_id, amount, charge_month, type, note)
    VALUES (
      p_tenant_id,
      p_amount,
      p_effective_month,
      'opening_balance',
      COALESCE(p_note, 'Opening balance')
    )
    RETURNING id INTO v_charge_id;
  EXCEPTION
    WHEN unique_violation THEN
      v_charge_id := NULL;
  END;

  IF v_charge_id IS NULL THEN
    SELECT id INTO v_charge_id
    FROM public.charges
    WHERE tenant_id = p_tenant_id
      AND type = 'opening_balance'
    LIMIT 1;
  END IF;

  RETURN v_charge_id;
END;
$$;

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

  -- During migration we may already have a matching payment row.
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

  -- Rebuild allocations for this payment idempotently.
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

  -- Any remainder is advance allocation to selected month.
  IF v_remaining > 0 THEN
    INSERT INTO public.payment_allocations (payment_id, applied_month, amount)
    VALUES (v_payment_id, p_payment_month, v_remaining);
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

  INSERT INTO public.payment_allocations (payment_id, applied_month, amount)
  SELECT
    v_payment_id,
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

CREATE OR REPLACE FUNCTION public.get_financial_statements(
  p_month TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  property_name TEXT,
  unit_number TEXT,
  tenant_name TEXT,
  charge_month TEXT,
  total_charges INTEGER,
  total_collected INTEGER,
  balance INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scope_user AS (
    SELECT COALESCE(p_user_id, auth.uid()) AS uid
  ),
  tenant_scope AS (
    SELECT
      t.id AS tenant_id,
      t.name AS tenant_name,
      u.unit_number,
      pr.name AS property_name
    FROM public.tenants t
    JOIN public.units u ON u.id = t.unit_id
    JOIN public.properties pr ON pr.id = u.property_id
    JOIN scope_user su ON su.uid = pr.user_id
  ),
  charges_by_month AS (
    SELECT
      c.tenant_id,
      c.charge_month,
      SUM(c.amount)::INTEGER AS total_charges
    FROM public.charges c
    JOIN tenant_scope ts ON ts.tenant_id = c.tenant_id
    WHERE p_month IS NULL OR c.charge_month = p_month
    GROUP BY c.tenant_id, c.charge_month
  ),
  allocations_by_month AS (
    SELECT
      p.tenant_id,
      pa.applied_month AS charge_month,
      SUM(pa.amount)::INTEGER AS total_collected
    FROM public.payment_allocations pa
    JOIN public.payments p ON p.id = pa.payment_id
    JOIN tenant_scope ts ON ts.tenant_id = p.tenant_id
    WHERE p_month IS NULL OR pa.applied_month = p_month
    GROUP BY p.tenant_id, pa.applied_month
  ),
  month_union AS (
    SELECT tenant_id, charge_month FROM charges_by_month
    UNION
    SELECT tenant_id, charge_month FROM allocations_by_month
  )
  SELECT
    ts.property_name,
    ts.unit_number,
    ts.tenant_name,
    mu.charge_month,
    COALESCE(cbm.total_charges, 0) AS total_charges,
    COALESCE(abm.total_collected, 0) AS total_collected,
    COALESCE(cbm.total_charges, 0) - COALESCE(abm.total_collected, 0) AS balance
  FROM month_union mu
  JOIN tenant_scope ts ON ts.tenant_id = mu.tenant_id
  LEFT JOIN charges_by_month cbm
    ON cbm.tenant_id = mu.tenant_id AND cbm.charge_month = mu.charge_month
  LEFT JOIN allocations_by_month abm
    ON abm.tenant_id = mu.tenant_id AND abm.charge_month = mu.charge_month
  ORDER BY ts.property_name, ts.unit_number, mu.charge_month;
$$;
