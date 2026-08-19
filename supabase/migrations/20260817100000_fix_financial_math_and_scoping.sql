-- Audit remediation, part 1 of 3: financial math and authorisation scoping.
--
-- Fixes:
--   F3  calculate_tenant_risk aggregated across three LEFT JOINs, producing a
--       cartesian fan-out that scored delinquent tenants as zero risk.
--   F4  Overpayment credit was written as an unbacked allocation against the
--       payment month and could never be reached again, so a tenant who prepaid
--       showed arrears the following month.
--   F9  get_financial_statements and record_payment_with_smart_allocation
--       scoped on COALESCE(p_user_id, auth.uid()), letting any authenticated
--       caller read or write another landlord's data by passing their UUID.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Tenant-wide payment reallocation (replaces per-payment allocation)
-- ---------------------------------------------------------------------------
--
-- Allocation is now a pure function of (charges, payments) for a tenant, rebuilt
-- from scratch whenever either side changes. That is what makes overpayment
-- carry-forward work: leftover money from an early payment is re-offered to the
-- oldest unpaid month on every rebuild, so a charge created later absorbs the
-- credit automatically instead of stranding it.
--
-- Deliberately not granted to `authenticated`. It is an internal primitive,
-- reachable only from the SECURITY DEFINER functions below.

CREATE OR REPLACE FUNCTION public.reallocate_tenant_payments(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_month RECORD;
  v_remaining INTEGER;
  v_take INTEGER;
BEGIN
  -- Working set of what each month still needs, mutated as we walk payments.
  DROP TABLE IF EXISTS pg_temp.tenant_outstanding;
  CREATE TEMP TABLE tenant_outstanding AS
  SELECT
    c.charge_month,
    SUM(c.amount)::INTEGER AS outstanding
  FROM public.charges c
  WHERE c.tenant_id = p_tenant_id
  GROUP BY c.charge_month;

  -- Clear existing allocations for this tenant, including any legacy rows whose
  -- tenant_id was never backfilled.
  DELETE FROM public.payment_allocations pa
  USING public.payments p
  WHERE p.id = pa.payment_id
    AND p.tenant_id = p_tenant_id;

  DELETE FROM public.payment_allocations
  WHERE tenant_id = p_tenant_id;

  -- Oldest payment first, so allocation order is deterministic and stable.
  FOR v_payment IN
    SELECT p.id, p.amount, p.payment_month
    FROM public.payments p
    WHERE p.tenant_id = p_tenant_id
    ORDER BY p.payment_date ASC, p.created_at ASC, p.id ASC
  LOOP
    v_remaining := GREATEST(COALESCE(v_payment.amount, 0), 0);

    -- Oldest arrears first.
    FOR v_month IN
      SELECT charge_month, outstanding
      FROM tenant_outstanding
      WHERE outstanding > 0
      ORDER BY charge_month ASC
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_take := LEAST(v_remaining, v_month.outstanding);

      INSERT INTO public.payment_allocations (payment_id, tenant_id, applied_month, amount)
      VALUES (v_payment.id, p_tenant_id, v_month.charge_month, v_take);

      UPDATE tenant_outstanding
      SET outstanding = outstanding - v_take
      WHERE charge_month = v_month.charge_month;

      v_remaining := v_remaining - v_take;
    END LOOP;

    -- Genuine credit: paid beyond every month billed so far. Parked on the
    -- payment's own month, and picked up by the next rebuild once a later
    -- charge exists to absorb it.
    IF v_remaining > 0 THEN
      INSERT INTO public.payment_allocations (payment_id, tenant_id, applied_month, amount)
      VALUES (v_payment.id, p_tenant_id, v_payment.payment_month, v_remaining);
    END IF;
  END LOOP;

  DROP TABLE IF EXISTS pg_temp.tenant_outstanding;
END;
$$;

REVOKE ALL ON FUNCTION public.reallocate_tenant_payments(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reallocate_tenant_payments(UUID) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2) Payment recording — scoped to the caller, back-datable, reallocating
-- ---------------------------------------------------------------------------
--
-- p_user_id is retained in the signature so existing clients keep working, but
-- it is now only ever checked against auth.uid() rather than trusted (F9).

DROP FUNCTION IF EXISTS public.record_payment_with_smart_allocation(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ);

CREATE FUNCTION public.record_payment_with_smart_allocation(
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- A caller-supplied user id may confirm who they are; it may not change it.
  IF p_user_id IS NOT NULL AND p_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
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

  IF p_payment_month IS NULL OR p_payment_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid payment month. Expected YYYY-MM';
  END IF;

  INSERT INTO public.payments (
    tenant_id, amount, payment_date, payment_month, mpesa_code, note, user_id
  )
  VALUES (
    p_tenant_id,
    p_amount,
    COALESCE(p_payment_date, now()),
    p_payment_month,
    NULLIF(TRIM(UPPER(p_mpesa_code)), ''),
    p_note,
    v_user_id
  )
  RETURNING id INTO v_payment_id;

  PERFORM public.reallocate_tenant_payments(p_tenant_id);

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_with_smart_allocation(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ)
TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Deleting a payment must rebuild the tenant's allocations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.payments p
  WHERE p.id = p_payment_id
    AND p.user_id = v_user_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  DELETE FROM public.payments WHERE id = p_payment_id;

  PERFORM public.reallocate_tenant_payments(v_tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_payment(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) insert_payment_with_allocations — verify tenant ownership (F9)
-- ---------------------------------------------------------------------------
--
-- Previously it checked only that p_user_id matched auth.uid(), never that the
-- tenant belonged to the caller, so a payment could be written against another
-- landlord's tenant.

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
  v_user_id UUID := auth.uid();
  v_tenant_user_id UUID;
  v_payment_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT t.user_id INTO v_tenant_user_id
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_tenant_user_id IS NULL OR v_tenant_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized for tenant %', p_tenant_id;
  END IF;

  INSERT INTO public.payments (
    tenant_id, amount, payment_month, mpesa_code, note, user_id
  )
  VALUES (
    p_tenant_id, p_amount, p_payment_month,
    NULLIF(TRIM(UPPER(p_mpesa_code)), ''), p_note, v_user_id
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

-- ---------------------------------------------------------------------------
-- 5) Opening balance charge — reallocate after changing the ledger
-- ---------------------------------------------------------------------------

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

  IF p_effective_month IS NULL OR p_effective_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid effective month. Expected YYYY-MM';
  END IF;

  -- One opening balance per tenant; re-running updates the amount in place.
  INSERT INTO public.charges (tenant_id, amount, charge_month, type, note)
  VALUES (
    p_tenant_id, p_amount, p_effective_month, 'opening_balance',
    COALESCE(p_note, 'Opening balance')
  )
  ON CONFLICT (tenant_id) WHERE type = 'opening_balance'
  DO UPDATE SET
    amount = EXCLUDED.amount,
    charge_month = EXCLUDED.charge_month,
    note = EXCLUDED.note
  RETURNING id INTO v_charge_id;

  PERFORM public.reallocate_tenant_payments(p_tenant_id);

  RETURN v_charge_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) F3 — risk scoring without the cartesian fan-out
-- ---------------------------------------------------------------------------
--
-- Charges and allocations are now aggregated in separate CTEs and joined on
-- totals. Previously both were SUM'd across a three-way LEFT JOIN, so each
-- charge was counted once per allocation row and vice versa: a tenant with 12
-- charges and 3 payments computed to exactly zero outstanding.

CREATE OR REPLACE FUNCTION public.calculate_tenant_risk(p_month_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_month_key IS NULL OR p_month_key !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid month key. Expected YYYY-MM';
  END IF;

  WITH scoped_tenants AS (
    SELECT t.id AS tenant_id, COALESCE(t.rent_amount, 0)::INTEGER AS rent_amount
    FROM public.tenants t
    WHERE t.user_id = v_user_id
  ),
  charged AS (
    SELECT c.tenant_id, SUM(c.amount)::INTEGER AS total_charged
    FROM public.charges c
    JOIN scoped_tenants st ON st.tenant_id = c.tenant_id
    WHERE c.charge_month <= p_month_key
    GROUP BY c.tenant_id
  ),
  allocated AS (
    SELECT p.tenant_id, SUM(pa.amount)::INTEGER AS total_allocated
    FROM public.payment_allocations pa
    JOIN public.payments p ON p.id = pa.payment_id
    JOIN scoped_tenants st ON st.tenant_id = p.tenant_id
    WHERE pa.applied_month <= p_month_key
    GROUP BY p.tenant_id
  ),
  calculated AS (
    SELECT
      st.tenant_id,
      GREATEST(COALESCE(ch.total_charged, 0) - COALESCE(al.total_allocated, 0), 0)::INTEGER
        AS outstanding,
      GREATEST(
        FLOOR(
          GREATEST(COALESCE(ch.total_charged, 0) - COALESCE(al.total_allocated, 0), 0)::NUMERIC
          / GREATEST(st.rent_amount, 1)
        ),
        0
      )::INTEGER AS months_overdue
    FROM scoped_tenants st
    LEFT JOIN charged ch ON ch.tenant_id = st.tenant_id
    LEFT JOIN allocated al ON al.tenant_id = st.tenant_id
  ),
  scored AS (
    SELECT
      tenant_id,
      LEAST(
        100,
        (CASE
          WHEN outstanding = 0 THEN 0
          WHEN outstanding <= 5000 THEN 20
          WHEN outstanding <= 20000 THEN 40
          ELSE 60
        END)
        + LEAST(months_overdue * 10, 40)
      )::INTEGER AS risk_score,
      outstanding,
      months_overdue
    FROM calculated
  ),
  upserted AS (
    INSERT INTO public.tenant_risk_snapshots (
      user_id, tenant_id, month_key, risk_score, risk_level, factors_json
    )
    SELECT
      v_user_id,
      s.tenant_id,
      p_month_key,
      s.risk_score,
      CASE
        WHEN s.risk_score >= 70 THEN 'high'
        WHEN s.risk_score >= 40 THEN 'medium'
        ELSE 'low'
      END,
      jsonb_build_object(
        'outstanding', s.outstanding,
        'months_overdue', s.months_overdue
      )
    FROM scored s
    ON CONFLICT (tenant_id, month_key)
    DO UPDATE SET
      risk_score = EXCLUDED.risk_score,
      risk_level = EXCLUDED.risk_level,
      factors_json = EXCLUDED.factors_json,
      updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM upserted;

  INSERT INTO public.ops_events (user_id, event_type, entity_type, payload_json)
  VALUES (
    v_user_id, 'risk_calculated', 'tenant_risk_snapshots',
    jsonb_build_object('month_key', p_month_key, 'affected_rows', v_count)
  );

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) F9 — financial statements scoped to the caller only
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_financial_statements(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_financial_statements(UUID, TEXT);

CREATE FUNCTION public.get_financial_statements(p_month TEXT DEFAULT NULL)
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tenant_scope AS (
    SELECT
      t.id AS tenant_id,
      t.name AS tenant_name,
      u.unit_number,
      pr.name AS property_name
    FROM public.tenants t
    JOIN public.units u ON u.id = t.unit_id
    JOIN public.properties pr ON pr.id = u.property_id
    WHERE pr.user_id = auth.uid()
  ),
  charges_by_month AS (
    SELECT c.tenant_id, c.charge_month, SUM(c.amount)::INTEGER AS total_charges
    FROM public.charges c
    JOIN tenant_scope ts ON ts.tenant_id = c.tenant_id
    WHERE p_month IS NULL OR c.charge_month = p_month
    GROUP BY c.tenant_id, c.charge_month
  ),
  allocations_by_month AS (
    SELECT p.tenant_id, pa.applied_month AS charge_month, SUM(pa.amount)::INTEGER AS total_collected
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
    COALESCE(cbm.total_charges, 0),
    COALESCE(abm.total_collected, 0),
    COALESCE(cbm.total_charges, 0) - COALESCE(abm.total_collected, 0)
  FROM month_union mu
  JOIN tenant_scope ts ON ts.tenant_id = mu.tenant_id
  LEFT JOIN charges_by_month cbm
    ON cbm.tenant_id = mu.tenant_id AND cbm.charge_month = mu.charge_month
  LEFT JOIN allocations_by_month abm
    ON abm.tenant_id = mu.tenant_id AND abm.charge_month = mu.charge_month
  ORDER BY ts.property_name, ts.unit_number, mu.charge_month;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_statements(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) F9 — a tenant may only be attached to a unit the caller owns
-- ---------------------------------------------------------------------------
--
-- The old policy's `OR tenants.user_id = auth.uid()` branch let a user insert a
-- tenant row pointing at another landlord's unit, which then appeared on that
-- landlord's dashboard.

DROP POLICY IF EXISTS "tenants_insert_own" ON public.tenants;
CREATE POLICY "tenants_insert_own"
ON public.tenants
FOR INSERT
WITH CHECK (
  tenants.user_id = auth.uid()
  AND (
    tenants.unit_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = tenants.unit_id
        AND p.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "tenants_update_own" ON public.tenants;
CREATE POLICY "tenants_update_own"
ON public.tenants
FOR UPDATE
USING (tenants.user_id = auth.uid())
WITH CHECK (
  tenants.user_id = auth.uid()
  AND (
    -- An archived tenant has no unit, and must stay editable.
    tenants.unit_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = tenants.unit_id
        AND p.user_id = auth.uid()
    )
  )
);

-- ---------------------------------------------------------------------------
-- 9) Rebuild every existing tenant's allocations under the corrected rules
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    PERFORM public.reallocate_tenant_payments(r.id);
  END LOOP;
END $$;

COMMIT;
