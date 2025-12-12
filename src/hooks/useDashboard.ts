import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overpaid';

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
  amount_paid: number;
  balance: number;
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

      // Calculate payment totals per tenant
      const tenantPayments = new Map<string, number>();
      (payments || []).forEach(p => {
        const current = tenantPayments.get(p.tenant_id) || 0;
        tenantPayments.set(p.tenant_id, current + p.amount);
      });

      // Helper to calculate payment status
      const getPaymentStatus = (rentAmount: number, amountPaid: number): PaymentStatus => {
        if (amountPaid === 0) return 'unpaid';
        if (amountPaid < rentAmount) return 'partial';
        if (amountPaid > rentAmount) return 'overpaid';
        return 'paid';
      };

      // Build dashboard units
      const dashboardUnits: DashboardUnit[] = (units || []).map(unit => {
        const tenant = tenants?.find(t => t.unit_id === unit.id);
        const rentAmount = tenant?.rent_amount || 0;
        const amountPaid = tenant ? (tenantPayments.get(tenant.id) || 0) : 0;
        const balance = rentAmount - amountPaid;
        
        return {
          id: unit.id,
          unit_number: unit.unit_number,
          property_id: unit.property_id,
          property_name: (unit.properties as { name: string } | null)?.name || 'Unknown',
          tenant_id: tenant?.id || null,
          tenant_name: tenant?.name || null,
          tenant_phone: tenant?.phone || null,
          rent_amount: tenant?.rent_amount || null,
          payment_status: tenant ? getPaymentStatus(rentAmount, amountPaid) : 'unpaid',
          amount_paid: amountPaid,
          balance,
        };
      });

      // Calculate stats
      const occupiedUnits = dashboardUnits.filter(u => u.tenant_id);
      const paidUnits = occupiedUnits.filter(u => u.payment_status === 'paid' || u.payment_status === 'overpaid');
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
