-- Phase 3 / Sprint 2: local AI report narrator storage

BEGIN;

CREATE TABLE IF NOT EXISTS public.report_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  input_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  narrative_text TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'ollama',
  model TEXT NOT NULL DEFAULT 'qwen2.5:7b-instruct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_report_narratives_user_month
  ON public.report_narratives(user_id, month_key);

ALTER TABLE public.report_narratives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_narratives_select_own" ON public.report_narratives;
DROP POLICY IF EXISTS "report_narratives_insert_own" ON public.report_narratives;
DROP POLICY IF EXISTS "report_narratives_update_own" ON public.report_narratives;
DROP POLICY IF EXISTS "report_narratives_delete_own" ON public.report_narratives;

CREATE POLICY "report_narratives_select_own"
ON public.report_narratives
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "report_narratives_insert_own"
ON public.report_narratives
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "report_narratives_update_own"
ON public.report_narratives
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "report_narratives_delete_own"
ON public.report_narratives
FOR DELETE
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_set_report_narratives_user_id ON public.report_narratives;
CREATE TRIGGER trg_set_report_narratives_user_id
  BEFORE INSERT ON public.report_narratives
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_report_narratives_updated_at ON public.report_narratives;

DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    CREATE TRIGGER trg_report_narratives_updated_at
      BEFORE UPDATE ON public.report_narratives
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

COMMIT;

