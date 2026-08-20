-- DIAGNOSTIC — run this when "Database error deleting user" blocks a deletion.
--
-- Nothing here changes data. STEP 1 and STEP 2 are read-only; STEP 3 alters
-- constraints only.
--
-- Deleting an auth user fails when some table points at auth.users with a
-- foreign key whose delete rule is NO ACTION or RESTRICT. Postgres refuses
-- rather than orphan the rows, and the dashboard surfaces that as a generic
-- "Database error deleting user".


-- ===========================================================================
-- STEP 1 — Which foreign keys point at auth.users, and what do they do?
-- ===========================================================================

SELECT
  src.relname                       AS table_name,
  a.attname                         AS column_name,
  c.conname                         AS constraint_name,
  CASE c.confdeltype
    WHEN 'c' THEN 'CASCADE      <- fine'
    WHEN 'n' THEN 'SET NULL     <- fine'
    WHEN 'd' THEN 'SET DEFAULT  <- fine'
    WHEN 'r' THEN 'RESTRICT     <- THIS BLOCKS THE DELETE'
    WHEN 'a' THEN 'NO ACTION    <- THIS BLOCKS THE DELETE'
  END                               AS on_delete
FROM pg_constraint c
JOIN pg_class      src ON src.oid = c.conrelid
JOIN pg_namespace  n   ON n.oid   = src.relnamespace
JOIN pg_class      tgt ON tgt.oid = c.confrelid
JOIN pg_namespace  tn  ON tn.oid  = tgt.relnamespace
JOIN LATERAL unnest(c.conkey) AS k(attnum) ON true
JOIN pg_attribute  a   ON a.attrelid = c.conrelid AND a.attnum = k.attnum
WHERE c.contype = 'f'
  AND tn.nspname  = 'auth'
  AND tgt.relname = 'users'
ORDER BY on_delete DESC, table_name;


-- ===========================================================================
-- STEP 2 — Which tables have a user_id with NO foreign key at all?
-- ===========================================================================
--
-- These do not block the delete. They are worse: the account goes and the
-- rows stay behind, unreachable and belonging to nobody. Under the Kenya Data
-- Protection Act that is personal data you no longer have a basis to hold.

SELECT
  col.table_name,
  'user_id present, no FK to auth.users' AS problem
FROM information_schema.columns col
WHERE col.table_schema = 'public'
  AND col.column_name  = 'user_id'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class      src ON src.oid = c.conrelid
    JOIN pg_namespace  n   ON n.oid   = src.relnamespace
    JOIN pg_class      tgt ON tgt.oid = c.confrelid
    JOIN pg_namespace  tn  ON tn.oid  = tgt.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname   = 'public'
      AND src.relname = col.table_name
      AND tn.nspname  = 'auth'
      AND tgt.relname = 'users'
  )
ORDER BY col.table_name;


-- ===========================================================================
-- STEP 2.5 — PRE-FLIGHT. Are there rows pointing at accounts that are gone?
-- ===========================================================================
--
-- STEP 3 drops each broken constraint and re-adds it. Re-adding validates
-- every existing row, so a single row whose user_id is not in auth.users
-- makes the ALTER fail and rolls the whole block back.
--
-- That is the safe outcome, but it is easier to know now than to read an
-- error later. Every count here should be 0.

SELECT 'expense_categories' AS table_name, COUNT(*) AS orphaned_rows
FROM public.expense_categories
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users)
UNION ALL SELECT 'expenses', COUNT(*)
FROM public.expenses
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users)
UNION ALL SELECT 'payments', COUNT(*)
FROM public.payments
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users)
UNION ALL SELECT 'tenants', COUNT(*)
FROM public.tenants
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users)
UNION ALL SELECT 'units', COUNT(*)
FROM public.units
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users)
ORDER BY table_name;

-- If any count is above 0, those rows belong to nobody and cannot be reached
-- by any landlord. Clear them before STEP 3 — substitute the table name:
--
-- DELETE FROM public.<table>
-- WHERE user_id IS NOT NULL
--   AND user_id NOT IN (SELECT id FROM auth.users);


-- ===========================================================================
-- STEP 3 — FIX. Converts every auth.users foreign key to ON DELETE CASCADE.
-- ===========================================================================
--
-- Run STEP 1 and STEP 2 first and read the output. Then uncomment and run.
--
-- This touches constraints, not rows: no data is deleted here. It is also the
-- correct permanent fix — "delete my account" has to work for every landlord,
-- not just this one, and right now it works for none of them.
--
-- Tables listed in STEP 2 are handled separately, below.

/*
DO $$
DECLARE
  r RECORD;
  fixed INTEGER := 0;
BEGIN
  FOR r IN
    SELECT
      n.nspname   AS schema_name,
      src.relname AS table_name,
      a.attname   AS column_name,
      c.conname   AS constraint_name
    FROM pg_constraint c
    JOIN pg_class      src ON src.oid = c.conrelid
    JOIN pg_namespace  n   ON n.oid   = src.relnamespace
    JOIN pg_class      tgt ON tgt.oid = c.confrelid
    JOIN pg_namespace  tn  ON tn.oid  = tgt.relnamespace
    JOIN LATERAL unnest(c.conkey) AS k(attnum) ON true
    JOIN pg_attribute  a   ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype     = 'f'
      AND tn.nspname    = 'auth'
      AND tgt.relname   = 'users'
      AND n.nspname     = 'public'
      AND c.confdeltype IN ('a', 'r')          -- only the ones that block
      AND array_length(c.conkey, 1) = 1        -- single-column keys only
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.schema_name, r.table_name, r.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) '
      'REFERENCES auth.users(id) ON DELETE CASCADE',
      r.schema_name, r.table_name, r.constraint_name, r.column_name
    );
    RAISE NOTICE 'CASCADE restored on %.% (%)',
      r.schema_name, r.table_name, r.constraint_name;
    fixed := fixed + 1;
  END LOOP;

  RAISE NOTICE '% constraint(s) fixed', fixed;
END $$;
*/

-- Re-run STEP 1. Nothing should read "THIS BLOCKS THE DELETE".
-- Then delete the user from the dashboard as normal.


-- ===========================================================================
-- STEP 4 — Only for tables STEP 2 listed (user_id, but no FK).
-- ===========================================================================
--
-- Adding the missing key fails if the table already holds rows whose user_id
-- points at an account that no longer exists. Clear those first, then add the
-- constraint so it cannot happen again. Substitute the real table name.
--
-- DELETE FROM public.<table>
-- WHERE user_id IS NOT NULL
--   AND user_id NOT IN (SELECT id FROM auth.users);
--
-- ALTER TABLE public.<table>
--   ADD CONSTRAINT <table>_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
