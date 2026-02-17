-- Phase 2: durable migration tracking (replaces localStorage-only flags)

-- Fallback helpers in case earlier bootstrap migrations were not applied
-- in this environment.
CREATE OR REPLACE FUNCTION public.set_row_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  migration_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, migration_key)
);

CREATE INDEX IF NOT EXISTS idx_user_migrations_user_key
  ON public.user_migrations(user_id, migration_key);

ALTER TABLE public.user_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_migrations_select_own" ON public.user_migrations;
DROP POLICY IF EXISTS "user_migrations_insert_own" ON public.user_migrations;
DROP POLICY IF EXISTS "user_migrations_update_own" ON public.user_migrations;
DROP POLICY IF EXISTS "user_migrations_delete_own" ON public.user_migrations;

CREATE POLICY "user_migrations_select_own"
ON public.user_migrations
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "user_migrations_insert_own"
ON public.user_migrations
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_migrations_update_own"
ON public.user_migrations
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_migrations_delete_own"
ON public.user_migrations
FOR DELETE
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_set_user_migrations_user_id ON public.user_migrations;
CREATE TRIGGER trg_set_user_migrations_user_id
  BEFORE INSERT ON public.user_migrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_user_migrations_updated_at ON public.user_migrations;
CREATE TRIGGER trg_user_migrations_updated_at
  BEFORE UPDATE ON public.user_migrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
