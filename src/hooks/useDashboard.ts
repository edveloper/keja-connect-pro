// src/hooks/useDashboard.ts
// ============================================================================
// CHARGES-BASED DASHBOARD HOOK
// ============================================================================
// This replaces the old calculation logic with the new charges system
// Balance = sum(charges) - sum(allocations)
// Much simpler and more accurate!

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardUnit, DashboardResult, PaymentStatus } from '@/types';

/** Normalize numeric values from database */
function toNumber(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/** Get current authenticated user ID */
async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/**
 * Calculate payment status based on balance and monthly rent
 */
function calculatePaymentStatus(balance: number, monthlyRent: number): PaymentStatus {
  if (balance <= 0) {
    return balance < 0 ? 'overpaid' : 'paid';
  }
  
  // If balance is less than monthly rent, they've made partial payment
  if (balance < monthlyRent) {
    return 'partial';
  }
  
  return 'unpaid';
}

/**
 * useDashboardData - Charges-Based Version
 * 
 * Fetches dashboard data using the new charges + allocations system.
 * Much simpler than the old approach!
 * 
 * @param selectedDate - Date to view (null = all-time)
 * @returns Dashboard units and aggregated stats
 */
export function useDashboardData(selectedDate: Date | null = new Date()) {
  const dateKey = selectedDate ? selectedDate.toISOString().slice(0, 7) : 'all-time';

  return useQuery<DashboardResult, Error>({
    queryKey: ['dashboard', dateKey],
    queryFn: async (): Promise<DashboardResult> => {
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

      const viewMonth = selectedDate ? selectedDate.toISOString().slice(0, 7) : null;

      // ======================================================================
      // STEP 1: Get all properties for this user
      // ======================================================================
      const { data: properties, error: propErr } = await supabase
        .from('properties')
        .select('id, name')
        .eq('user_id', userId);

      if (propErr) throw propErr;
      
      const propertyIds = (properties ?? []).map(p => p.id).filter(Boolean);
      if (propertyIds.length === 0) {
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

      // ======================================================================
      // STEP 2: Get all units with property names
      // ======================================================================
      const { data: unitsData, error: unitsErr } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          property_id,
          properties!inner(name)
        `)
        .in('property_id', propertyIds)
        .order('unit_number', { ascending: true });

      if (unitsErr) throw unitsErr;

      const units = (unitsData ?? []) as any[];
      if (units.length === 0) {
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

      const unitIds = units.map(u => u.id).filter(Boolean);

      // ======================================================================
      // STEP 3: Get all tenants for these units
      // ======================================================================
      const { data: tenantsData, error: tenantsErr } = await supabase
        .from('tenants')
        .select('*')
        .in('unit_id', unitIds);

      if (tenantsErr) throw tenantsErr;

      const tenants = tenantsData ?? [];
      const tenantIds = tenants.map(t => t.id).filter(Boolean);

      // ======================================================================
      // STEP 4: Calculate balances for each tenant using charges system
      // ======================================================================
      
      // Get all charges up to the viewed month
      let chargesQuery = supabase
        .from('charges')
        .select('*')
        .in('tenant_id', tenantIds);
      
      if (viewMonth) {
        chargesQuery = chargesQuery.lte('charge_month', viewMonth);
      }

      const { data: chargesData, error: chargesErr } = await chargesQuery;
      if (chargesErr) throw chargesErr;
      const charges = chargesData ?? [];

      // Get all payment allocations up to the viewed month
      let allocationsQuery = supabase
        .from('payment_allocations')
        .select(`
          *,
          payments!inner(tenant_id)
        `)
        .in('payments.tenant_id', tenantIds);
      
      if (viewMonth) {
        allocationsQuery = allocationsQuery.lte('applied_month', viewMonth);
      }

      const { data: allocationsData, error: allocErr } = await allocationsQuery;
      if (allocErr) throw allocErr;
      const allocations = (allocationsData ?? []) as any[];

      // ======================================================================
      // STEP 5: Calculate balance per tenant
      // ======================================================================
      
      // Group charges by tenant
      const chargesByTenant = charges.reduce((acc, charge) => {
        if (!acc[charge.tenant_id]) acc[charge.tenant_id] = [];
        acc[charge.tenant_id].push(charge);
        return acc;
      }, {} as Record<string, any[]>);

      // Group allocations by tenant
      const allocationsByTenant = allocations.reduce((acc, alloc) => {
        const tenantId = alloc.payments?.tenant_id;
        if (!tenantId) return acc;
        if (!acc[tenantId]) acc[tenantId] = [];
        acc[tenantId].push(alloc);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate balances
      const tenantBalances = tenants.reduce((acc, tenant) => {
        const tenantCharges = chargesByTenant[tenant.id] ?? [];
        const tenantAllocations = allocationsByTenant[tenant.id] ?? [];

        const totalCharges = tenantCharges.reduce((sum, c) => sum + toNumber(c.amount), 0);
        const totalAllocated = tenantAllocations.reduce((sum, a) => sum + toNumber(a.amount), 0);
        const balance = totalCharges - totalAllocated;

        // Current month specific calculations
        let currentMonthCharges = 0;
        let currentMonthAllocated = 0;

        if (viewMonth) {
          currentMonthCharges = tenantCharges
            .filter(c => c.charge_month === viewMonth)
            .reduce((sum, c) => sum + toNumber(c.amount), 0);
          
          currentMonthAllocated = tenantAllocations
            .filter(a => a.applied_month === viewMonth)
            .reduce((sum, a) => sum + toNumber(a.amount), 0);
        }

        acc[tenant.id] = {
          totalCharges,
          totalAllocated,
          balance,
          currentMonthCharges,
          currentMonthAllocated,
        };

        return acc;
      }, {} as Record<string, any>);

      // ======================================================================
      // STEP 6: Build dashboard units
      // ======================================================================
      
      const dashboardUnits: DashboardUnit[] = units.map(unit => {
        const propertyName = unit.properties?.name ?? 'Unknown';
        const tenant = tenants.find(t => t.unit_id === unit.id);

        // Base unit info
        const baseUnit = {
          id: unit.id,
          unit_number: unit.unit_number,
          property_id: unit.property_id,
          property_name: propertyName,
        };

        // Vacant unit
        if (!tenant) {
          return {
            ...baseUnit,
            tenant_id: null,
            tenant_name: null,
            tenant_phone: null,
            rent_amount: null,
            payment_status: 'unpaid' as PaymentStatus,
            total_charges: 0,
            total_allocated: 0,
            balance: 0,
            current_month_charges: 0,
            current_month_allocated: 0,
          };
        }

        // Occupied unit
        const balance = tenantBalances[tenant.id] ?? {
          totalCharges: 0,
          totalAllocated: 0,
          balance: 0,
          currentMonthCharges: 0,
          currentMonthAllocated: 0,
        };

        const monthlyRent = toNumber(tenant.rent_amount);
        const paymentStatus = calculatePaymentStatus(balance.balance, monthlyRent);

        return {
          ...baseUnit,
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_phone: tenant.phone,
          rent_amount: monthlyRent,
          payment_status: paymentStatus,
          total_charges: Math.round(balance.totalCharges),
          total_allocated: Math.round(balance.totalAllocated),
          balance: Math.round(balance.balance),
          current_month_charges: Math.round(balance.currentMonthCharges),
          current_month_allocated: Math.round(balance.currentMonthAllocated),
        };
      });

      // ======================================================================
      // STEP 7: Calculate aggregate stats
      // ======================================================================
      
      const occupiedUnits = dashboardUnits.filter(u => u.tenant_id !== null);
      
      const stats = {
        totalUnits: dashboardUnits.length,
        occupiedUnits: occupiedUnits.length,
        vacantUnits: dashboardUnits.length - occupiedUnits.length,
        
        // Financial totals
        totalCharges: Math.round(
          occupiedUnits.reduce((sum, u) => sum + u.total_charges, 0)
        ),
        totalAllocated: Math.round(
          occupiedUnits.reduce((sum, u) => sum + u.total_allocated, 0)
        ),
        totalBalance: Math.round(
          occupiedUnits.reduce((sum, u) => sum + (u.balance > 0 ? u.balance : 0), 0)
        ),
        
        // Security deposits
        totalDeposits: Math.round(
          tenants.reduce((sum, t) => sum + toNumber(t.security_deposit), 0)
        ),
        
        // Current month specific (if viewing a specific month)
        currentMonthCharges: viewMonth ? Math.round(
          occupiedUnits.reduce((sum, u) => sum + (u.current_month_charges ?? 0), 0)
        ) : undefined,
        currentMonthAllocated: viewMonth ? Math.round(
          occupiedUnits.reduce((sum, u) => sum + (u.current_month_allocated ?? 0), 0)
        ) : undefined,
        currentMonthBalance: viewMonth ? Math.round(
          occupiedUnits.reduce((sum, u) => {
            const monthBalance = (u.current_month_charges ?? 0) - (u.current_month_allocated ?? 0);
            return sum + (monthBalance > 0 ? monthBalance : 0);
          }, 0)
        ) : undefined,
      };

      return {
        units: dashboardUnits,
        stats,
      };
    },
    staleTime: 1000 * 30, // Cache for 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Get detailed balance for a specific tenant
 * Useful for tenant detail pages or ledgers
 */
export function useTenantBalance(tenantId: string | null, upToMonth?: string | null) {
  return useQuery({
    queryKey: ['tenant-balance', tenantId, upToMonth],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await (supabase as any).rpc(
        'calculate_tenant_balance',
        {
          p_tenant_id: tenantId,
          p_up_to_month: upToMonth ?? null,
        }
      );

      if (error) throw error;
      
      // RPC returns array with single row
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 30,
  });
}

/**
 * Get dashboard summary using optimized RPC function
 * Alternative to useDashboardData for just getting stats
 */
export function useDashboardSummary(upToMonth?: string | null) {
  return useQuery({
    queryKey: ['dashboard-summary', upToMonth],
    queryFn: async () => {
      const userId = await getUserIdOrNull();
      if (!userId) return null;

      const { data, error } = await (supabase as any).rpc(
        'get_dashboard_summary',
        {
          p_user_id: userId,
          p_up_to_month: upToMonth ?? null,
        }
      );

      if (error) throw error;
      
      return Array.isArray(data) ? data[0] : data;
    },
    staleTime: 1000 * 30,
  });
}