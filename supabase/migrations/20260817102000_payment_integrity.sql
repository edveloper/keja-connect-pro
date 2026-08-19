-- Audit remediation, part 3 of 3: payment integrity.
--
-- Fixes F5: nothing prevented the same M-Pesa confirmation being entered twice.
-- Re-keying a message you already recorded is the most common data-entry error
-- in this workflow, and it silently inflated collections and cleared real
-- arrears.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Normalise existing codes
-- ---------------------------------------------------------------------------
-- M-Pesa codes are case-insensitive in practice; "QWE123ABC" and "qwe123abc"
-- are the same transaction and must collide.

UPDATE public.payments
SET mpesa_code = NULLIF(TRIM(UPPER(mpesa_code)), '')
WHERE mpesa_code IS DISTINCT FROM NULLIF(TRIM(UPPER(mpesa_code)), '');

-- ---------------------------------------------------------------------------
-- 2) Release codes held by existing duplicates
-- ---------------------------------------------------------------------------
-- The payment rows are deliberately kept. They may be genuine double entries
-- the landlord needs to review and delete, or they may be legitimate payments
-- where the code was mistyped — that is not a call this migration can make.
-- The code is detached from all but the earliest so the constraint can apply,
-- and a note records what happened.

WITH ranked AS (
  SELECT
    id,
    mpesa_code,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, mpesa_code
      ORDER BY payment_date ASC, created_at ASC, id ASC
    ) AS rn
  FROM public.payments
  WHERE mpesa_code IS NOT NULL
)
UPDATE public.payments p
SET
  mpesa_code = NULL,
  note = TRIM(BOTH ' ' FROM
    COALESCE(p.note, '') ||
    CASE WHEN COALESCE(p.note, '') = '' THEN '' ELSE ' | ' END ||
    'Duplicate M-Pesa code ' || r.mpesa_code || ' released during data cleanup - please verify this payment'
  )
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- ---------------------------------------------------------------------------
-- 3) Enforce uniqueness going forward
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_user_mpesa_code
  ON public.payments(user_id, mpesa_code)
  WHERE mpesa_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4) Look up an existing payment by M-Pesa code
-- ---------------------------------------------------------------------------
-- Lets the app warn "already recorded on 3 Aug for John Kamau" before the user
-- submits, rather than surfacing a raw constraint violation afterwards.

CREATE OR REPLACE FUNCTION public.find_payment_by_mpesa_code(p_mpesa_code TEXT)
RETURNS TABLE(
  payment_id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  amount INTEGER,
  payment_date TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.tenant_id, t.name, p.amount, p.payment_date
  FROM public.payments p
  JOIN public.tenants t ON t.id = p.tenant_id
  WHERE p.user_id = auth.uid()
    AND p.mpesa_code = NULLIF(TRIM(UPPER(p_mpesa_code)), '')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_payment_by_mpesa_code(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Guard against nonsensical amounts
-- ---------------------------------------------------------------------------
-- Amounts are whole shillings. The ceiling stops an accidental extra zero (or a
-- pasted phone number) from overflowing the INTEGER column with a raw Postgres
-- error.

-- Added NOT VALID so historical rows that predate the rule do not block the
-- migration. New and updated rows are still checked.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_sane'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_amount_sane
      CHECK (amount > 0 AND amount <= 100000000) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'charges_amount_sane'
  ) THEN
    ALTER TABLE public.charges
      ADD CONSTRAINT charges_amount_sane
      CHECK (amount >= 0 AND amount <= 100000000) NOT VALID;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 6) Landlord settings
-- ---------------------------------------------------------------------------
-- Holds the paybill/till used in rent reminders, so the Settings page has
-- something real behind it instead of links dressed up as settings.

BEGIN;

CREATE TABLE IF NOT EXISTS public.landlord_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pay_to TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.landlord_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landlord_settings_select_own" ON public.landlord_settings;
DROP POLICY IF EXISTS "landlord_settings_upsert_own" ON public.landlord_settings;
DROP POLICY IF EXISTS "landlord_settings_update_own" ON public.landlord_settings;

CREATE POLICY "landlord_settings_select_own"
ON public.landlord_settings FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "landlord_settings_upsert_own"
ON public.landlord_settings FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "landlord_settings_update_own"
ON public.landlord_settings FOR UPDATE
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_set_landlord_settings_user_id ON public.landlord_settings;
CREATE TRIGGER trg_set_landlord_settings_user_id
  BEFORE INSERT ON public.landlord_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_row_user_id();

COMMIT;
