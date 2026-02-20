-- Phase 3 / Sprint 1: intelligence foundation
-- Adds risk snapshots, reminder queue, ops events, and deterministic RPCs.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  factors_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, month_key)
);

CREATE TABLE IF NOT EXISTS public.reminder_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 1 AND priority <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'cancelled', 'failed')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, month_key, channel)
);

CREATE TABLE IF NOT EXISTS public.ops_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_risk_snapshots_user_month
  ON public.tenant_risk_snapshots(user_id, month_key);

CREATE INDEX IF NOT EXISTS idx_tenant_risk_snapshots_tenant_month
  ON public.tenant_risk_snapshots(tenant_id, month_key);

CREATE INDEX IF NOT EXISTS idx_reminder_queue_user_month_status
  ON public.reminder_queue(user_id, month_key, status);

CREATE INDEX IF NOT EXISTS idx_reminder_queue_tenant_month
  ON public.reminder_queue(tenant_id, month_key);

CREATE INDEX IF NOT EXISTS idx_ops_events_user_created
  ON public.ops_events(user_id, created_at DESC);

ALTER TABLE public.tenant_risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_risk_snapshots_select_own" ON public.tenant_risk_snapshots;
DROP POLICY IF EXISTS "tenant_risk_snapshots_insert_own" ON public.tenant_risk_snapshots;
DROP POLICY IF EXISTS "tenant_risk_snapshots_update_own" ON public.tenant_risk_snapshots;
DROP POLICY IF EXISTS "tenant_risk_snapshots_delete_own" ON public.tenant_risk_snapshots;

CREATE POLICY "tenant_risk_snapshots_select_own"
ON public.tenant_risk_snapshots
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "tenant_risk_snapshots_insert_own"
ON public.tenant_risk_snapshots
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_risk_snapshots_update_own"
ON public.tenant_risk_snapshots
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_risk_snapshots_delete_own"
ON public.tenant_risk_snapshots
FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reminder_queue_select_own" ON public.reminder_queue;
DROP POLICY IF EXISTS "reminder_queue_insert_own" ON public.reminder_queue;
DROP POLICY IF EXISTS "reminder_queue_update_own" ON public.reminder_queue;
DROP POLICY IF EXISTS "reminder_queue_delete_own" ON public.reminder_queue;

CREATE POLICY "reminder_queue_select_own"
ON public.reminder_queue
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "reminder_queue_insert_own"
ON public.reminder_queue
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminder_queue_update_own"
ON public.reminder_queue
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminder_queue_delete_own"
ON public.reminder_queue
FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ops_events_select_own" ON public.ops_events;
DROP POLICY IF EXISTS "ops_events_insert_own" ON public.ops_events;
DROP POLICY IF EXISTS "ops_events_update_own" ON public.ops_events;
DROP POLICY IF EXISTS "ops_events_delete_own" ON public.ops_events;

CREATE POLICY "ops_events_select_own"
ON public.ops_events
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "ops_events_insert_own"
ON public.ops_events
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "ops_events_update_own"
ON public.ops_events
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "ops_events_delete_own"
ON public.ops_events
FOR DELETE
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_set_tenant_risk_snapshots_user_id ON public.tenant_risk_snapshots;
CREATE TRIGGER trg_set_tenant_risk_snapshots_user_id
  BEFORE INSERT ON public.tenant_risk_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_set_reminder_queue_user_id ON public.reminder_queue;
CREATE TRIGGER trg_set_reminder_queue_user_id
  BEFORE INSERT ON public.reminder_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_set_ops_events_user_id ON public.ops_events;
CREATE TRIGGER trg_set_ops_events_user_id
  BEFORE INSERT ON public.ops_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_tenant_risk_snapshots_updated_at ON public.tenant_risk_snapshots;
DROP TRIGGER IF EXISTS trg_reminder_queue_updated_at ON public.reminder_queue;

DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    CREATE TRIGGER trg_tenant_risk_snapshots_updated_at
      BEFORE UPDATE ON public.tenant_risk_snapshots
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER trg_reminder_queue_updated_at
      BEFORE UPDATE ON public.reminder_queue
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) Deterministic risk scoring RPC
-- ---------------------------------------------------------------------------

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

  IF p_month_key IS NULL OR p_month_key !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid month key. Expected YYYY-MM';
  END IF;

  WITH tenant_agg AS (
    SELECT
      t.id AS tenant_id,
      COALESCE(t.rent_amount, 0) AS rent_amount,
      COALESCE(SUM(CASE WHEN c.charge_month <= p_month_key THEN c.amount ELSE 0 END), 0) AS total_charged,
      COALESCE(SUM(CASE WHEN pa.applied_month <= p_month_key THEN pa.amount ELSE 0 END), 0) AS total_allocated
    FROM public.tenants t
    LEFT JOIN public.charges c ON c.tenant_id = t.id
    LEFT JOIN public.payments p ON p.tenant_id = t.id
    LEFT JOIN public.payment_allocations pa ON pa.payment_id = p.id
    WHERE t.user_id = v_user_id
    GROUP BY t.id, t.rent_amount
  ),
  calculated AS (
    SELECT
      tenant_id,
      GREATEST(total_charged - total_allocated, 0)::INTEGER AS outstanding,
      GREATEST(
        FLOOR(
          GREATEST(total_charged - total_allocated, 0)::NUMERIC
          / NULLIF(GREATEST(rent_amount, 1), 0)
        ),
        0
      )::INTEGER AS months_overdue
    FROM tenant_agg
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
      user_id,
      tenant_id,
      month_key,
      risk_score,
      risk_level,
      factors_json
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
      END AS risk_level,
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

  INSERT INTO public.ops_events (
    user_id,
    event_type,
    entity_type,
    payload_json
  )
  VALUES (
    v_user_id,
    'risk_calculated',
    'tenant_risk_snapshots',
    jsonb_build_object('month_key', p_month_key, 'affected_rows', v_count)
  );

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Reminder queue RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_risk_reminders(p_month_key TEXT)
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

  IF p_month_key IS NULL OR p_month_key !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid month key. Expected YYYY-MM';
  END IF;

  WITH source_rows AS (
    SELECT
      trs.tenant_id,
      p_month_key AS month_key,
      'whatsapp'::TEXT AS channel,
      CASE
        WHEN trs.risk_level = 'high' THEN 90
        WHEN trs.risk_level = 'medium' THEN 60
        ELSE 30
      END AS priority,
      jsonb_build_object(
        'risk_level', trs.risk_level,
        'risk_score', trs.risk_score
      ) AS metadata_json
    FROM public.tenant_risk_snapshots trs
    WHERE trs.user_id = v_user_id
      AND trs.month_key = p_month_key
      AND trs.risk_level IN ('medium', 'high')
  ),
  upserted AS (
    INSERT INTO public.reminder_queue (
      user_id,
      tenant_id,
      month_key,
      channel,
      priority,
      status,
      metadata_json
    )
    SELECT
      v_user_id,
      s.tenant_id,
      s.month_key,
      s.channel,
      s.priority,
      'pending',
      s.metadata_json
    FROM source_rows s
    ON CONFLICT (tenant_id, month_key, channel)
    DO UPDATE SET
      priority = EXCLUDED.priority,
      metadata_json = EXCLUDED.metadata_json,
      updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM upserted;

  INSERT INTO public.ops_events (
    user_id,
    event_type,
    entity_type,
    payload_json
  )
  VALUES (
    v_user_id,
    'reminders_enqueued',
    'reminder_queue',
    jsonb_build_object('month_key', p_month_key, 'affected_rows', v_count)
  );

  RETURN v_count;
END;
$$;

COMMIT;

