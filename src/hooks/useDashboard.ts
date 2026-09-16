// src/hooks/useDashboard.ts
//
// The rent roll for a month (or all time): what each occupied unit was billed,
// what has been applied to it, and what is still owed.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toMonthKey, type MonthKey } from "@/lib/month";

/* ============================================================================
   EXPORTED TYPES (used by UnitCard, Dashboard, Tenants, Reports)
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
}

export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;

  /** What was billed in the period. */
  totalCharges: number;
  /** What has been applied against those charges. */
  totalAllocated: number;
  /** Arrears only — the sum of positive balances. */
  totalBalance: number;
  /** Credit only — the sum of negative balances, as a positive number. */
  totalCredit: number;
  totalDeposits: number;
}


/**
 * An active tenant sharing a unit with someone else, so no unit card shows them.
 *
 * Their money still counts. Surfacing them is the point: a tenant hidden from
 * the rent roll used to be hidden from the totals too, which silently
 * understated arrears.
 */
export interface SharedUnitTenant {
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  balance: number;
  /** The tenant whose card the unit shows instead. */
  shownInstead: string;
}

export interface DashboardResult {
  units: DashboardUnit[];
  stats: DashboardStats;
  /** Empty in normal operation. Non-empty means data needs attention. */
  sharedUnitTenants: SharedUnitTenant[];
}

/* ============================================================================
   HELPERS
============================================================================ */

type ChargeRow = Database["public"]["Tables"]["charges"]["Row"];
type AllocationRow = Database["public"]["Tables"]["payment_allocations"]["Row"] & {
  payments?: { tenant_id: string } | null;
};

const EMPTY_STATS: DashboardStats = {
  totalUnits: 0,
  occupiedUnits: 0,
  vacantUnits: 0,
  totalCharges: 0,
  totalAllocated: 0,
  totalBalance: 0,
  totalCredit: 0,
  totalDeposits: 0,
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/**
 * Status for an occupied unit.
 *
 * `charged` is needed as well as `balance`: a tenant with no charge in the
 * period has a zero balance, which is not the same thing as having paid.
 */
export function calculatePaymentStatus(
  balance: number,
  charged: number
): PaymentStatus {
  if (charged <= 0) {
    // Nothing billed. Only a credit balance is meaningful here.
    return balance < 0 ? "overpaid" : "paid";
  }
  if (balance < 0) return "overpaid";
  if (balance === 0) return "paid";
  if (balance < charged) return "partial";
  return "unpaid";
}

/* ============================================================================
   MAIN DASHBOARD HOOK
============================================================================ */

export function useDashboardData(selectedDate: Date | null = new Date()) {
  // Local-time month key. Deriving this with toISOString() filed every query
  // against the previous month in Kenya. See src/lib/month.ts.
  const viewMonth: MonthKey | null = selectedDate ? toMonthKey(selectedDate) : null;
  const dateKey = viewMonth ?? "all-time";

  return useQuery<DashboardResult>({
    queryKey: ["dashboard", dateKey],
    queryFn: async () => {
      const userId = await getUserIdOrNull();
      if (!userId) return { units: [], stats: EMPTY_STATS, sharedUnitTenants: [] };

      /* --- 1. Properties --- */
      const { data: properties, error: propertiesError } = await supabase
        .from("properties")
        .select("id, name")
        .eq("user_id", userId);
      if (propertiesError) throw propertiesError;

      const propertyIds = (properties ?? []).map((p) => p.id);
      if (!propertyIds.length) return { units: [], stats: EMPTY_STATS, sharedUnitTenants: [] };

      /* --- 2. Units --- */
      const { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("id, unit_number, property_id, properties!inner(name)")
        .in("property_id", propertyIds)
        .order("unit_number");
      if (unitsError) throw unitsError;

      const units = unitsData ?? [];
      const unitIds = units.map((u) => u.id);
      if (!unitIds.length) return { units: [], stats: EMPTY_STATS, sharedUnitTenants: [] };

      /* --- 3. Tenants (current occupants only) --- */
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .in("unit_id", unitIds)
        .order("created_at", { ascending: false });
      if (tenantsError) throw tenantsError;

      const tenants = tenantsData ?? [];

      // A unit card can only show one occupant, so the most recently added
      // tenant wins the card. That is a DISPLAY rule and nothing more.
      //
      // It used to decide the money as well: only the winners' ids were passed
      // to the charges and allocations queries, so a tenant who shared a unit
      // had their arrears excluded from every total on the Dashboard and
      // Reports. Two tenants sharing two units hid 22,000 of real debt, while
      // the Tenants screen — which counts tenants directly — reported it
      // correctly, so the two screens disagreed with no explanation on either.
      //
      // Now every active tenant's money counts, and the ones without a card are
      // returned so the UI can say so out loud.
      const tenantByUnit = new Map<string, (typeof tenants)[number]>();
      const displaced: Array<{ tenant: (typeof tenants)[number]; shownInstead: string }> = [];

      tenants.forEach((tenant) => {
        if (!tenant.unit_id) return;
        const holder = tenantByUnit.get(tenant.unit_id);
        if (holder) {
          displaced.push({ tenant, shownInstead: holder.name });
          return;
        }
        tenantByUnit.set(tenant.unit_id, tenant);
      });

      // Every active tenant, card or no card.
      const tenantIds = tenants.map((t) => t.id);
      if (!tenantIds.length) {
        const dashboardUnits = units.map((unit) => vacantUnit(unit));
        return {
          units: dashboardUnits,
          stats: {
            ...EMPTY_STATS,
            totalUnits: dashboardUnits.length,
            vacantUnits: dashboardUnits.length,
          },
          sharedUnitTenants: [],
        };
      }

      /* --- 4. Charges --- */
      let chargesQuery = supabase.from("charges").select("*").in("tenant_id", tenantIds);
      if (viewMonth) chargesQuery = chargesQuery.eq("charge_month", viewMonth);

      const { data: charges, error: chargesError } = await chargesQuery;
      if (chargesError) throw chargesError;

      /* --- 5. Allocations --- */
      let allocationsQuery = supabase
        .from("payment_allocations")
        .select("*, payments!inner(tenant_id)")
        .in("payments.tenant_id", tenantIds);
      if (viewMonth) allocationsQuery = allocationsQuery.eq("applied_month", viewMonth);

      const { data: allocations, error: allocationsError } = await allocationsQuery;
      if (allocationsError) throw allocationsError;

      /* --- 6. Totals per tenant --- */
      const chargedByTenant = new Map<string, number>();
      ((charges ?? []) as ChargeRow[]).forEach((c) => {
        chargedByTenant.set(
          c.tenant_id,
          (chargedByTenant.get(c.tenant_id) ?? 0) + toNumber(c.amount)
        );
      });

      const allocatedByTenant = new Map<string, number>();
      ((allocations ?? []) as AllocationRow[]).forEach((a) => {
        const tid = a.payments?.tenant_id ?? a.tenant_id;
        if (!tid) return;
        allocatedByTenant.set(tid, (allocatedByTenant.get(tid) ?? 0) + toNumber(a.amount));
      });

      /* --- 7. Build rows --- */
      const dashboardUnits: DashboardUnit[] = units.map((unit) => {
        const tenant = tenantByUnit.get(unit.id);
        if (!tenant) return vacantUnit(unit);

        const totalCharges = chargedByTenant.get(tenant.id) ?? 0;
        const totalAllocated = allocatedByTenant.get(tenant.id) ?? 0;
        const balance = totalCharges - totalAllocated;

        return {
          id: unit.id,
          unit_number: unit.unit_number,
          property_id: unit.property_id,
          property_name: unit.properties?.name ?? "Unknown",
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_phone: tenant.phone,
          rent_amount: toNumber(tenant.rent_amount),
          payment_status: calculatePaymentStatus(balance, totalCharges),
          total_charges: Math.round(totalCharges),
          total_allocated: Math.round(totalAllocated),
          balance: Math.round(balance),
        };
      });

      /* --- 8. Stats --- */
      //
      // Unit counts come from units; money comes from tenants. Those are
      // different populations whenever a unit has two active tenants, and
      // conflating them is what hid the arrears.
      const occupied = dashboardUnits.filter((u) => u.tenant_id);

      const money = tenants.reduce(
        (acc, tenant) => {
          const charged = chargedByTenant.get(tenant.id) ?? 0;
          const allocated = allocatedByTenant.get(tenant.id) ?? 0;
          const balance = charged - allocated;

          acc.totalCharges += charged;
          acc.totalAllocated += allocated;
          acc.totalBalance += Math.max(balance, 0);
          acc.totalCredit += Math.max(-balance, 0);
          acc.totalDeposits += toNumber(tenant.security_deposit);
          return acc;
        },
        {
          totalCharges: 0,
          totalAllocated: 0,
          totalBalance: 0,
          totalCredit: 0,
          totalDeposits: 0,
        }
      );

      const stats: DashboardStats = {
        totalUnits: dashboardUnits.length,
        occupiedUnits: occupied.length,
        vacantUnits: dashboardUnits.length - occupied.length,
        totalCharges: Math.round(money.totalCharges),
        totalAllocated: Math.round(money.totalAllocated),
        totalBalance: Math.round(money.totalBalance),
        totalCredit: Math.round(money.totalCredit),
        totalDeposits: Math.round(money.totalDeposits),
      };

      const sharedUnitTenants: SharedUnitTenant[] = displaced.map(({ tenant, shownInstead }) => {
        const charged = chargedByTenant.get(tenant.id) ?? 0;
        const allocated = allocatedByTenant.get(tenant.id) ?? 0;
        const unit = tenant.unit_id
          ? units.find((u) => u.id === tenant.unit_id)
          : undefined;

        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          unitNumber: unit?.unit_number ?? "?",
          propertyName: unit?.properties?.name ?? "Unknown",
          balance: Math.round(charged - allocated),
          shownInstead,
        };
      });

      return { units: dashboardUnits, stats, sharedUnitTenants };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

type UnitRow = {
  id: string;
  unit_number: string;
  property_id: string;
  properties?: { name: string } | null;
};

function vacantUnit(unit: UnitRow): DashboardUnit {
  return {
    id: unit.id,
    unit_number: unit.unit_number,
    property_id: unit.property_id,
    property_name: unit.properties?.name ?? "Unknown",
    tenant_id: null,
    tenant_name: null,
    tenant_phone: null,
    rent_amount: null,
    payment_status: "paid",
    total_charges: 0,
    total_allocated: 0,
    balance: 0,
  };
}
