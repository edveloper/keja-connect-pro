-- Phase 2: Data/security hardening
-- 1) Backfill ownership
-- 2) Add ownership triggers
-- 3) Replace permissive RLS with user-scoped policies

-- Ensure required columns exist in case older environments are missing them.
ALTER TABLE IF EXISTS public.units
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.tenants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.expenses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.expense_categories
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill ownership from parent relationships.
UPDATE public.units u
SET user_id = p.user_id
FROM public.properties p
WHERE u.property_id = p.id
  AND u.user_id IS NULL;

UPDATE public.tenants t
SET user_id = u.user_id
FROM public.units u
WHERE t.unit_id = u.id
  AND t.user_id IS NULL;

UPDATE public.payments p
SET user_id = t.user_id
FROM public.tenants t
WHERE p.tenant_id = t.id
  AND p.user_id IS NULL;

UPDATE public.expenses e
SET user_id = p.user_id
FROM public.properties p
WHERE e.property_id = p.id
  AND e.user_id IS NULL;

-- Keep ownership columns populated on insert.
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

DROP TRIGGER IF EXISTS trg_set_properties_user_id ON public.properties;
CREATE TRIGGER trg_set_properties_user_id
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_set_units_user_id ON public.units;
CREATE TRIGGER trg_set_units_user_id
  BEFORE INSERT ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_set_tenants_user_id ON public.tenants;
CREATE TRIGGER trg_set_tenants_user_id
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_set_payments_user_id ON public.payments;
CREATE TRIGGER trg_set_payments_user_id
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_set_expenses_user_id ON public.expenses;
CREATE TRIGGER trg_set_expenses_user_id
  BEFORE INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS trg_set_expense_categories_user_id ON public.expense_categories;
CREATE TRIGGER trg_set_expense_categories_user_id
  BEFORE INSERT ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_user_id();

-- Drop broad/open policies created during initial bootstrap.
DROP POLICY IF EXISTS "Allow all access to properties" ON public.properties;
DROP POLICY IF EXISTS "Allow all access to units" ON public.units;
DROP POLICY IF EXISTS "Allow all access to tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all access to expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;

-- Safety: ensure RLS is enabled.
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Properties
CREATE POLICY "properties_select_own"
ON public.properties
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "properties_insert_own"
ON public.properties
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "properties_update_own"
ON public.properties
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "properties_delete_own"
ON public.properties
FOR DELETE
USING (user_id = auth.uid());

-- Units
CREATE POLICY "units_select_own"
ON public.units
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = units.property_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "units_insert_own"
ON public.units
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = units.property_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "units_update_own"
ON public.units
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = units.property_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = units.property_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "units_delete_own"
ON public.units
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = units.property_id
      AND p.user_id = auth.uid()
  )
);

-- Tenants
CREATE POLICY "tenants_select_own"
ON public.tenants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE u.id = tenants.unit_id
      AND p.user_id = auth.uid()
  )
  OR tenants.user_id = auth.uid()
);

CREATE POLICY "tenants_insert_own"
ON public.tenants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE u.id = tenants.unit_id
      AND p.user_id = auth.uid()
  )
  OR tenants.user_id = auth.uid()
);

CREATE POLICY "tenants_update_own"
ON public.tenants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE u.id = tenants.unit_id
      AND p.user_id = auth.uid()
  )
  OR tenants.user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE u.id = tenants.unit_id
      AND p.user_id = auth.uid()
  )
  OR tenants.user_id = auth.uid()
);

CREATE POLICY "tenants_delete_own"
ON public.tenants
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE u.id = tenants.unit_id
      AND p.user_id = auth.uid()
  )
  OR tenants.user_id = auth.uid()
);

-- Payments
CREATE POLICY "payments_select_own"
ON public.payments
FOR SELECT
USING (
  payments.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "payments_insert_own"
ON public.payments
FOR INSERT
WITH CHECK (
  payments.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "payments_update_own"
ON public.payments
FOR UPDATE
USING (
  payments.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  payments.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "payments_delete_own"
ON public.payments
FOR DELETE
USING (
  payments.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = payments.tenant_id
      AND t.user_id = auth.uid()
  )
);

-- Expense categories
-- Preset categories are globally readable, user categories are private.
CREATE POLICY "expense_categories_select_visible"
ON public.expense_categories
FOR SELECT
USING (is_preset = true OR user_id = auth.uid());

CREATE POLICY "expense_categories_insert_own"
ON public.expense_categories
FOR INSERT
WITH CHECK ((is_preset = false AND user_id = auth.uid()) OR user_id = auth.uid());

CREATE POLICY "expense_categories_update_own"
ON public.expense_categories
FOR UPDATE
USING (user_id = auth.uid() AND is_preset = false)
WITH CHECK (user_id = auth.uid() AND is_preset = false);

CREATE POLICY "expense_categories_delete_own"
ON public.expense_categories
FOR DELETE
USING (user_id = auth.uid() AND is_preset = false);

-- Expenses
CREATE POLICY "expenses_select_own"
ON public.expenses
FOR SELECT
USING (
  expenses.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "expenses_insert_own"
ON public.expenses
FOR INSERT
WITH CHECK (
  expenses.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "expenses_update_own"
ON public.expenses
FOR UPDATE
USING (
  expenses.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  expenses.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "expenses_delete_own"
ON public.expenses
FOR DELETE
USING (
  expenses.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()
  )
);

-- Performance indexes for ownership filters.
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_units_user_id ON public.units(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON public.expense_categories(user_id);
