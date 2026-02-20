-- Phase 3 / Sprint 3: reminder queue lifecycle metadata
-- Adds optional operator notes and scheduling index.

ALTER TABLE IF EXISTS public.reminder_queue
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_reminder_queue_status_scheduled
  ON public.reminder_queue(status, scheduled_for);
