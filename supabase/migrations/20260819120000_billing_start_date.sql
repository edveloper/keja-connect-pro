-- Separates "when the tenancy began" from "when we start billing for it".
--
-- `generate_monthly_charges` fills every month from the tenant's lease start to
-- the current month, which is right for a new tenant but wrong in two common
-- cases:
--
--   1. A landlord onboarding mid-tenancy. Someone who has rented the same house
--      for four years does not want four years of invented charges and arrears
--      on their first day using the app.
--   2. A landlord starting their books over. Deleting old charges does nothing
--      on its own — the nightly job rebuilds them from lease_start within hours.
--
-- The only way to stop that previously was to overwrite `lease_start`, which
-- destroys a real fact about the tenancy and is not recoverable from any export.

BEGIN;

ALTER TABLE IF EXISTS public.tenants
  ADD COLUMN IF NOT EXISTS billing_starts_on DATE;

COMMENT ON COLUMN public.tenants.billing_starts_on IS
  'First month to bill rent for. Defaults to lease_start. Set this to begin '
  'tracking part-way through a tenancy without inventing historical charges.';

-- ---------------------------------------------------------------------------
-- Billing now runs from the billing start, falling back to the lease start
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_monthly_charges(p_month_key TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_month TEXT;
  v_month_start DATE;
  v_inserted INTEGER := 0;
  r RECORD;
BEGIN
  v_month := COALESCE(
    p_month_key,
    to_char(timezone('Africa/Nairobi', now()), 'YYYY-MM')
  );

  IF v_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid month key. Expected YYYY-MM';
  END IF;

  v_month_start := to_date(v_month || '-01', 'YYYY-MM-DD');

  WITH eligible AS (
    SELECT
      t.id,
      GREATEST(COALESCE(t.rent_amount, 0), 0)::INTEGER AS rent_amount,
      -- The only change: bill from the billing start when one is set.
      COALESCE(t.billing_starts_on, t.lease_start) AS bill_from,
      COALESCE(t.is_prorated, false) AS is_prorated,
      GREATEST(COALESCE(t.first_month_override, 0), 0)::INTEGER AS first_month_override,
      to_char(COALESCE(t.billing_starts_on, t.lease_start), 'YYYY-MM') AS start_month
    FROM public.tenants t
    WHERE t.status = 'active'
      AND t.unit_id IS NOT NULL
      AND COALESCE(t.billing_starts_on, t.lease_start) IS NOT NULL
      AND COALESCE(t.rent_amount, 0) > 0
      AND date_trunc('month', COALESCE(t.billing_starts_on, t.lease_start)) <= v_month_start
      AND (v_user_id IS NULL OR t.user_id = v_user_id)
  ),
  wanted AS (
    SELECT
      e.id AS tenant_id,
      to_char(m, 'YYYY-MM') AS charge_month,
      CASE
        WHEN to_char(m, 'YYYY-MM') = e.start_month
             AND e.is_prorated
             AND e.first_month_override > 0
        THEN e.first_month_override
        ELSE e.rent_amount
      END AS amount,
      CASE
        WHEN to_char(m, 'YYYY-MM') = e.start_month THEN 'First month rent'
        ELSE 'Monthly rent'
      END AS note
    FROM eligible e
    CROSS JOIN LATERAL generate_series(
      date_trunc('month', e.bill_from)::date,
      v_month_start,
      interval '1 month'
    ) AS m
  ),
  inserted AS (
    INSERT INTO public.charges (tenant_id, amount, charge_month, type, note)
    SELECT w.tenant_id, w.amount, w.charge_month, 'rent', w.note
    FROM wanted w
    ON CONFLICT (tenant_id, charge_month) WHERE type = 'rent'
    DO NOTHING
    RETURNING tenant_id
  )
  SELECT COUNT(*) INTO v_inserted FROM inserted;

  IF v_inserted > 0 THEN
    FOR r IN
      SELECT DISTINCT c.tenant_id
      FROM public.charges c
      WHERE c.type = 'rent'
        AND c.charge_month = v_month
        AND (v_user_id IS NULL OR EXISTS (
          SELECT 1 FROM public.tenants t
          WHERE t.id = c.tenant_id AND t.user_id = v_user_id
        ))
    LOOP
      PERFORM public.reallocate_tenant_payments(r.tenant_id);
    END LOOP;
  END IF;

  IF v_user_id IS NOT NULL AND v_inserted > 0 THEN
    INSERT INTO public.ops_events (user_id, event_type, entity_type, payload_json)
    VALUES (
      v_user_id, 'charges_generated', 'charges',
      jsonb_build_object('month_key', v_month, 'inserted', v_inserted)
    );
  END IF;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_monthly_charges(TEXT) TO authenticated;

COMMIT;
