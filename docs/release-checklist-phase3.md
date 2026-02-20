# Phase 3 Release Checklist

## 1) Pre-Release Preflight

- Confirm branch is up to date and app builds locally.
- Confirm required env vars are present:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_OLLAMA_BASE_URL`
  - `VITE_OLLAMA_MODEL`
- Confirm AI endpoint is reachable from app host:
  - `GET {VITE_OLLAMA_BASE_URL}/api/tags`
- Confirm Supabase project target is correct (staging vs production).

## 2) Migration Order (Phase 2 + 3)

Run in this order if environment is not fully current:

1. `supabase/migrations/20260217103000_harden_rls_and_ownership.sql`
2. `supabase/migrations/20260217111500_align_schema_and_rpcs.sql`
3. `supabase/migrations/20260217120000_add_delete_tenant_rpc.sql`
4. `supabase/migrations/20260217124500_add_user_migrations_tracking.sql`
5. `supabase/migrations/20260217150000_phase3_intelligence_foundation.sql`
6. `supabase/migrations/20260217154500_add_report_narratives.sql`
7. `supabase/migrations/20260217162000_add_unit_availability.sql`
8. `supabase/migrations/20260220102000_resolve_get_financial_statements_overload.sql`
9. `supabase/migrations/20260220110000_add_reminder_queue_notes.sql`
10. `supabase/migrations/20260220113000_add_structured_property_location.sql`

Notes:
- `20260217143000_reset_financial_data_for_user_699d013c.sql` is a targeted data-reset migration and should only be used intentionally.

## 3) Manual Smoke Test Matrix

### Auth + Navigation

- Sign in as landlord user.
- Move across tabs: Home, Properties, Tenants, Expenses, Reports.
- Confirm no blocking errors in browser console.

### Properties + Units

- Add property with structured location fields.
- Edit property and verify values persist.
- Add unit.
- Toggle unit `available/unavailable`.
- Confirm unavailable unit is not selectable for new tenant assignment.

### Tenants

- Add tenant to a unit.
- Edit tenant (phone/rent/etc.).
- Record payment.
- Delete tenant (confirm related data behavior is expected).
- Export tenant list (`Export Tenant List`) and verify columns.

### Expenses

- Add expense and category.
- Confirm totals update in Reports and Dashboard.

### Reports + Intelligence

- Generate AI summary.
- Verify AI status badge (`Ready/Offline/Retrying/Failed`) behaves correctly.
- Run risk scan and queue reminders.
- Use reminder actions:
  - `Mark Sent`
  - `Snooze 24h`
  - `Cancel`
- Confirm reminder status badges update.
- Export:
  - `Export Summary` (check intelligence sheets exist)
  - `Export Statement` (check base data + intelligence sheets)

## 4) Security / RLS Verification (Quick)

Validate ownership-sensitive tables are user-scoped:

- `properties`
- `units`
- `tenants`
- `payments`
- `charges`
- `payment_allocations`
- `expenses`
- `expense_categories`
- `tenant_risk_snapshots`
- `reminder_queue`
- `report_narratives`
- `user_migrations`

Quick SQL checks:

```sql
-- Confirm RLS enabled on critical tables
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in (
  'properties','units','tenants','payments','charges','payment_allocations',
  'expenses','expense_categories','tenant_risk_snapshots','reminder_queue',
  'report_narratives','user_migrations'
)
order by relname;
```

```sql
-- Confirm no duplicate get_financial_statements overloads
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_financial_statements';
```

Expected: only one function signature (month text, user_id uuid).

## 5) Deployment Checklist

- Run `npm run build`.
- Restart app service.
- Hard refresh browser client.
- Verify AI endpoint and model availability.
- Run smoke tests for:
  - Tenant add/edit/payment
  - Property edit + unit availability
  - Reports generation + export

## 6) Rollback Plan

If release must be rolled back:

1. Revert frontend deployment to previous stable commit.
2. For DB:
   - Avoid dropping newly added columns unless absolutely required.
   - Prefer forward-fix migration over destructive rollback.
3. If a specific migration causes breakage:
   - Create a corrective migration targeted to the issue.
   - Re-run smoke tests before re-deploy.

## 7) Known Operational Notes

- AI summaries depend on reachable Ollama endpoint and model availability.
- If `Export Statement` is blank, verify `charges` and `payment_allocations` data presence for selected period.
- If AI requests fail around timeout, tune model size and timeout values in:
  - `src/lib/ai/ollama.ts`
  - `.env` (`VITE_OLLAMA_MODEL`)
