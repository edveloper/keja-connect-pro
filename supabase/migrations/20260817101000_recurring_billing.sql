-- Audit remediation, part 2 of 3: recurring rent billing.
--
-- Fixes F2: rent charges were only ever written once, when a tenant was created.
-- Nothing generated next month's charge, so on the 1st of every month every
-- tenant had no charge, therefore no balance, therefore showed as "paid".
--
-- The fix is a single idempotent function that guarantees the invariant
-- "every active tenant has one rent charge for every month from their lease
-- start through the billing month". It is safe to run repeatedly, and is driven
-- from two places: a nightly pg_cron job, and the app itself on load, so
-- billing still works if pg_cron is unavailable.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Tenancy lifecycle
-- ---------------------------------------------------------------------------
-- Billing needs to know who is still renting. Archiving also replaces hard
-- deletion for move-outs, which previously cascaded away a tenant's entire
-- payment history and retroactively changed closed months.

ALTER TABLE IF EXISTS public.tenants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS moved_out_on DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_status_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_status_check
      CHECK (status IN ('active', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);

-- ---------------------------------------------------------------------------
-- 2) One rent charge per tenant per month
-- ---------------------------------------------------------------------------
-- Required for the ON CONFLICT below to make generation idempotent.
-- Existing duplicates (from the three separate buggy backfill paths) are
-- collapsed to the earliest row first.

DELETE FROM public.charges c
USING public.charges keep
WHERE c.type = 'rent'
  AND keep.type = 'rent'
  AND c.tenant_id = keep.tenant_id
  AND c.charge_month = keep.charge_month
  AND (c.created_at, c.id) > (keep.created_at, keep.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_charges_rent_tenant_month
  ON public.charges(tenant_id, charge_month)
  WHERE type = 'rent';

-- ---------------------------------------------------------------------------
-- 3) The billing function
-- ---------------------------------------------------------------------------
--
-- p_month_key defaults to the current month in Africa/Nairobi. This matters:
-- pg_cron fires in UTC, and between 21:00 and 00:00 UTC on the last day of a
-- month it is already the next month in Kenya.
--
-- Scoping: an authenticated caller always bills only their own tenants. The
-- cron job runs unauthenticated and bills everyone.

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
      t.lease_start,
      COALESCE(t.is_prorated, false) AS is_prorated,
      GREATEST(COALESCE(t.first_month_override, 0), 0)::INTEGER AS first_month_override,
      to_char(t.lease_start, 'YYYY-MM') AS start_month
    FROM public.tenants t
    WHERE t.status = 'active'
      AND t.unit_id IS NOT NULL
      AND t.lease_start IS NOT NULL
      AND COALESCE(t.rent_amount, 0) > 0
      AND date_trunc('month', t.lease_start) <= v_month_start
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
      date_trunc('month', e.lease_start)::date,
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

  -- New charges change what outstanding money should be applied to, so any
  -- tenant whose ledger grew gets their payments reallocated. This is what
  -- lets a prepayment made months ago land on the charge that just appeared.
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

-- ---------------------------------------------------------------------------
-- 4) Resync a tenant's charges after their rent or lease terms change
-- ---------------------------------------------------------------------------
--
-- Fixes F6: editing a tenant's rent updated the row but left every charge at
-- the old amount, so the ledger and the form drifted apart silently.
--
-- Only unpaid future and current months are repriced. Months that have already
-- been paid against are left alone — repricing settled history would silently
-- reopen closed months.

CREATE OR REPLACE FUNCTION public.sync_tenant_charges(
  p_tenant_id UUID,
  p_reprice_from TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant RECORD;
  v_from TEXT;
  v_updated INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.id, t.user_id, t.rent_amount, t.lease_start, t.status
  INTO v_tenant
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_tenant.id IS NULL OR v_tenant.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized for tenant %', p_tenant_id;
  END IF;

  v_from := COALESCE(
    p_reprice_from,
    to_char(timezone('Africa/Nairobi', now()), 'YYYY-MM')
  );

  IF v_from !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid month key. Expected YYYY-MM';
  END IF;

  IF COALESCE(v_tenant.rent_amount, 0) > 0 THEN
    WITH paid_months AS (
      SELECT DISTINCT pa.applied_month
      FROM public.payment_allocations pa
      JOIN public.payments p ON p.id = pa.payment_id
      WHERE p.tenant_id = p_tenant_id
    ),
    repriced AS (
      UPDATE public.charges c
      SET amount = v_tenant.rent_amount
      WHERE c.tenant_id = p_tenant_id
        AND c.type = 'rent'
        AND c.charge_month >= v_from
        AND c.amount <> v_tenant.rent_amount
        AND NOT EXISTS (
          SELECT 1 FROM paid_months pm WHERE pm.applied_month = c.charge_month
        )
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_updated FROM repriced;
  END IF;

  -- Fill any months the tenant is missing, then rebuild allocations.
  PERFORM public.generate_monthly_charges(NULL);
  PERFORM public.reallocate_tenant_payments(p_tenant_id);

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_tenant_charges(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Move-out: archive rather than delete
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.archive_tenant(
  p_tenant_id UUID,
  p_moved_out_on DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_user_id UUID;
  v_unit_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.user_id, t.unit_id INTO v_tenant_user_id, v_unit_id
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_tenant_user_id IS NULL OR v_tenant_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized for tenant %', p_tenant_id;
  END IF;

  UPDATE public.tenants
  SET status = 'archived',
      moved_out_on = COALESCE(p_moved_out_on, timezone('Africa/Nairobi', now())::date),
      unit_id = NULL
  WHERE id = p_tenant_id;

  -- Free the unit for a new tenancy.
  IF v_unit_id IS NOT NULL THEN
    UPDATE public.units SET is_available = true WHERE id = v_unit_id;
  END IF;

  INSERT INTO public.ops_events (user_id, event_type, entity_type, entity_id, payload_json)
  VALUES (
    v_user_id, 'tenant_archived', 'tenants', p_tenant_id,
    jsonb_build_object('moved_out_on', COALESCE(p_moved_out_on, CURRENT_DATE))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_tenant(UUID, DATE) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Nightly billing job
-- ---------------------------------------------------------------------------
-- Runs at 00:30 Africa/Nairobi (21:30 UTC the previous day). Daily rather than
-- monthly so a missed run self-heals the next night — the function is
-- idempotent, so a no-op day costs nothing.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    PERFORM cron.unschedule('keja-generate-monthly-charges')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'keja-generate-monthly-charges'
    );

    PERFORM cron.schedule(
      'keja-generate-monthly-charges',
      '30 21 * * *',
      $cron$SELECT public.generate_monthly_charges(NULL);$cron$
    );

    RAISE NOTICE 'Scheduled nightly rent billing (keja-generate-monthly-charges).';
  ELSE
    RAISE WARNING 'pg_cron is not available. Rent billing will rely on the in-app trigger only. Enable pg_cron under Database > Extensions and re-run this block.';
  END IF;
EXCEPTION WHEN insufficient_privilege OR undefined_object OR undefined_function THEN
  RAISE WARNING 'Could not schedule pg_cron job (%). Rent billing will rely on the in-app trigger only.', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 7) Backfill: give every existing tenant the months they are missing
-- ---------------------------------------------------------------------------

SELECT public.generate_monthly_charges(NULL);

COMMIT;
