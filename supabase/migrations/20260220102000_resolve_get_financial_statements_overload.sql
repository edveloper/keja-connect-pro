-- Fix ambiguous RPC resolution (PGRST203) for get_financial_statements.
-- Some environments may contain multiple overloads:
--   public.get_financial_statements(text, uuid)
--   public.get_financial_statements(uuid, text)
-- PostgREST can fail to resolve named args when both exist.

DROP FUNCTION IF EXISTS public.get_financial_statements(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_financial_statements(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.get_financial_statements(
  p_month TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
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
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scope_user AS (
    SELECT COALESCE(p_user_id, auth.uid()) AS uid
  ),
  tenant_scope AS (
    SELECT
      t.id AS tenant_id,
      t.name AS tenant_name,
      u.unit_number,
      pr.name AS property_name
    FROM public.tenants t
    JOIN public.units u ON u.id = t.unit_id
    JOIN public.properties pr ON pr.id = u.property_id
    JOIN scope_user su ON su.uid = pr.user_id
  ),
  charges_by_month AS (
    SELECT
      c.tenant_id,
      c.charge_month,
      SUM(c.amount)::INTEGER AS total_charges
    FROM public.charges c
    JOIN tenant_scope ts ON ts.tenant_id = c.tenant_id
    WHERE p_month IS NULL OR c.charge_month = p_month
    GROUP BY c.tenant_id, c.charge_month
  ),
  allocations_by_month AS (
    SELECT
      p.tenant_id,
      pa.applied_month AS charge_month,
      SUM(pa.amount)::INTEGER AS total_collected
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
    COALESCE(cbm.total_charges, 0) AS total_charges,
    COALESCE(abm.total_collected, 0) AS total_collected,
    COALESCE(cbm.total_charges, 0) - COALESCE(abm.total_collected, 0) AS balance
  FROM month_union mu
  JOIN tenant_scope ts ON ts.tenant_id = mu.tenant_id
  LEFT JOIN charges_by_month cbm
    ON cbm.tenant_id = mu.tenant_id AND cbm.charge_month = mu.charge_month
  LEFT JOIN allocations_by_month abm
    ON abm.tenant_id = mu.tenant_id AND abm.charge_month = mu.charge_month
  ORDER BY ts.property_name, ts.unit_number, mu.charge_month;
$$;
