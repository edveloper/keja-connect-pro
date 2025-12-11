import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardUnit {
  id: string;
  unit_number: string;
  property_id: string;
  property_name: string;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  rent_amount: number | null;
  current_month_paid: boolean;
}

export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  paidUnits: number;
  arrearsUnits: number;
  totalCollected: number;
}

export function useDashboardData() {
  const currentMonth = new Date().toISOString().slice(0, 7);

  return useQuery({
    queryKey: ['dashboard', currentMonth],
    queryFn: async () => {
      // Fetch all units with property info
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, property_id, properties(name)')
        .order('unit_number');

      if (unitsError) throw unitsError;

      // Fetch all tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, unit_id, name, phone, rent_amount');

      if (tenantsError) throw tenantsError;

      // Fetch payments for current month
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('tenant_id, amount')
        .eq('payment_month', currentMonth);

      if (paymentsError) throw paymentsError;

      // Map tenant IDs that have paid this month
      const paidTenantIds = new Set(payments?.map(p => p.tenant_id) || []);

      // Build dashboard units
      const dashboardUnits: DashboardUnit[] = (units || []).map(unit => {
        const tenant = tenants?.find(t => t.unit_id === unit.id);
        return {
          id: unit.id,
          unit_number: unit.unit_number,
          property_id: unit.property_id,
          property_name: (unit.properties as { name: string } | null)?.name || 'Unknown',
          tenant_id: tenant?.id || null,
          tenant_name: tenant?.name || null,
          tenant_phone: tenant?.phone || null,
          rent_amount: tenant?.rent_amount || null,
          current_month_paid: tenant ? paidTenantIds.has(tenant.id) : false,
        };
      });

      // Calculate stats
      const occupiedUnits = dashboardUnits.filter(u => u.tenant_id);
      const paidUnits = occupiedUnits.filter(u => u.current_month_paid);
      const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      const stats: DashboardStats = {
        totalUnits: dashboardUnits.length,
        occupiedUnits: occupiedUnits.length,
        paidUnits: paidUnits.length,
        arrearsUnits: occupiedUnits.length - paidUnits.length,
        totalCollected,
      };

      return { units: dashboardUnits, stats };
    },
  });
}
