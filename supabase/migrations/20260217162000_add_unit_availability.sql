-- Phase 3 UX/data: allow units to be marked unavailable

ALTER TABLE IF EXISTS public.units
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_units_is_available
  ON public.units(is_available);

