// src/hooks/useDashboard.ts
// ============================================================================
// CHARGES-BASED DASHBOARD HOOK (STABLE VERSION)
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ============================================================================
   EXPORTED TYPES (used by UnitCard, Dashboard, Tenants, etc.)
============================================================================ */

export type PaymentStatus = "unpaid" | "partial" | "paid" | "overpaid";

export interface DashboardUnit {
  id: string;
  unit_number: string;
  property_id: string;
  property_name: string;

  tenant_id: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;

  rent_amount: number | null;
  payment_status: PaymentStatus;

  total_charges: number;
  total_allocated: number;
  balance: number;

  current_month_charges?: number;
  current_month_allocated?: number;
}

export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;

  totalCharges: number;
  totalAllocated: number;
  totalBalance: number;
  totalDeposits: number;

  currentMonthCharges?: number;
  currentMonthAllocated?: number;
  currentMonthBalance?: number;
}

export interface DashboardResult {
  units: DashboardUnit[];
  stats: DashboardStats;
}

/* ============================================================================
   HELPERS
============================================================================ */

function toNumber(v: any): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

function calculatePaymentStatus(
  balance: number,
  monthlyRent: number
): PaymentStatus {
  if (balance <= 0) {
    return balance < 0 ? "overpaid" : "paid";
  }
  if (balance < monthlyRent) return "partial";
  return "unpaid";
}

/* ============================================================================
   MAIN DASHBOARD HOOK
============================================================================ */

export function useDashboardData(selectedDate: Date | null = new Date()) {
  const dateKey = selectedDate
    ? selectedDate.toISOString().slice(0, 7)
    : "all-time";

  return useQuery<DashboardResult>({
    queryKey: ["dashboard", dateKey],
    queryFn: async () => {
      const userId = await getUserIdOrNull();
      if (!userId) {
        return {
          units: [],
          stats: {
            totalUnits: 0,
            occupiedUnits: 0,
            vacantUnits: 0,
            totalCharges: 0,
            totalAllocated: 0,
            totalBalance: 0,
            totalDeposits: 0,
          },
        };
      }

      const viewMonth = selectedDate
        ? selectedDate.toISOString().slice(0, 7)
        : null;

      /* ------------------------------------------------------------------
         1. Properties
      ------------------------------------------------------------------ */
      const { data: properties } = await supabase
        .from("properties")
        .select("id, name")
        .eq("user_id", userId);

      const propertyIds = (properties ?? []).map(p => p.id);
      if (!propertyIds.length) {
        return {
          units: [],
          stats: {
            totalUnits: 0,
            occupiedUnits: 0,
            vacantUnits: 0,
            totalCharges: 0,
            totalAllocated: 0,
            totalBalance: 0,
            totalDeposits: 0,
          },
        };
      }

      /* ------------------------------------------------------------------
         2. Units
      ------------------------------------------------------------------ */
      const { data: unitsData } = await supabase
        .from("units")
        .select(`
          id,
          unit_number,
          property_id,
          properties!inner(name)
        `)
        .in("property_id", propertyIds)
        .order("unit_number");

      const units = unitsData ?? [];
      const unitIds = units.map(u => u.id);

      /* ------------------------------------------------------------------
         3. Tenants
      ------------------------------------------------------------------ */
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("*")
        .in("unit_id", unitIds);

      const tenants = tenantsData ?? [];
      const tenantIds = tenants.map(t => t.id);

      /* ------------------------------------------------------------------
         4. Charges
      ------------------------------------------------------------------ */
      let chargesQuery = supabase
        .from("charges")
        .select("*")
        .in("tenant_id", tenantIds);

      if (viewMonth) {
        chargesQuery = chargesQuery.lte("charge_month", viewMonth);
      }

      const { data: charges = [] } = await chargesQuery;

      /* ------------------------------------------------------------------
         5. Allocations
      ------------------------------------------------------------------ */
      let allocationsQuery = supabase
        .from("payment_allocations")
        .select("*, payments!inner(tenant_id)")
        .in("payments.tenant_id", tenantIds);

      if (viewMonth) {
        allocationsQuery = allocationsQuery.lte("applied_month", viewMonth);
      }

      const { data: allocations = [] } = await allocationsQuery;

      /* ------------------------------------------------------------------
         6. Group balances per tenant
      ------------------------------------------------------------------ */
      const chargesByTenant: Record<string, any[]> = {};
      const allocationsByTenant: Record<string, any[]> = {};

      charges.forEach(c => {
        if (!chargesByTenant[c.tenant_id]) chargesByTenant[c.tenant_id] = [];
        chargesByTenant[c.tenant_id].push(c);
      });

      allocations.forEach(a => {
        const tid = a.payments?.tenant_id;
        if (!tid) return;
        if (!allocationsByTenant[tid]) allocationsByTenant[tid] = [];
        allocationsByTenant[tid].push(a);
      });

      /* ------------------------------------------------------------------
         7. Build dashboard units
      ------------------------------------------------------------------ */
      const dashboardUnits: DashboardUnit[] = units.map(unit => {
        const tenant = tenants.find(t => t.unit_id === unit.id);
        const propertyName = unit.properties?.name ?? "Unknown";

        if (!tenant) {
          return {
            id: unit.id,
            unit_number: unit.unit_number,
            property_id: unit.property_id,
            property_name: propertyName,
            tenant_id: null,
            tenant_name: null,
            tenant_phone: null,
            rent_amount: null,
            payment_status: "unpaid",
            total_charges: 0,
            total_allocated: 0,
            balance: 0,
          };
        }

        const tenantCharges = chargesByTenant[tenant.id] ?? [];
        const tenantAllocations = allocationsByTenant[tenant.id] ?? [];

        const totalCharges = tenantCharges.reduce(
          (s, c) => s + toNumber(c.amount),
          0
        );
        const totalAllocated = tenantAllocations.reduce(
          (s, a) => s + toNumber(a.amount),
          0
        );

        const balance = totalCharges - totalAllocated;
        const rent = toNumber(tenant.rent_amount);

        return {
          id: unit.id,
          unit_number: unit.unit_number,
          property_id: unit.property_id,
          property_name: propertyName,
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_phone: tenant.phone,
          rent_amount: rent,
          payment_status: calculatePaymentStatus(balance, rent),
          total_charges: Math.round(totalCharges),
          total_allocated: Math.round(totalAllocated),
          balance: Math.round(balance),
        };
      });

      /* ------------------------------------------------------------------
         8. Stats
      ------------------------------------------------------------------ */
      const occupied = dashboardUnits.filter(u => u.tenant_id);

      const stats: DashboardStats = {
        totalUnits: dashboardUnits.length,
        occupiedUnits: occupied.length,
        vacantUnits: dashboardUnits.length - occupied.length,
        totalCharges: occupied.reduce((s, u) => s + u.total_charges, 0),
        totalAllocated: occupied.reduce((s, u) => s + u.total_allocated, 0),
        totalBalance: occupied.reduce(
          (s, u) => s + (u.balance > 0 ? u.balance : 0),
          0
        ),
        totalDeposits: tenants.reduce(
          (s, t) => s + toNumber(t.security_deposit),
          0
        ),
      };

      return { units: dashboardUnits, stats };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
