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
  totalArrearsValue: number;
  totalDeposits: number;
}

// Explicit interface to solve the SelectQueryError
interface Tenant {
  id: string;
  unit_id: string;
  name: string;
  phone: string | null;
  rent_amount: number;
  security_deposit: number | null;
}

export function useDashboardData(selectedDate: Date | null = new Date()) {
  const dateKey = selectedDate ? selectedDate.toISOString().slice(0, 7) : 'all-time';

  return useQuery({
    queryKey: ['dashboard', dateKey],
    queryFn: async () => {
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, property_id, properties(name)')
        .order('unit_number');

      if (unitsError) throw unitsError;

      // We cast this to Tenant[] to satisfy TypeScript
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, unit_id, name, phone, rent_amount, security_deposit');

      if (tenantsError) throw tenantsError;
      const tenants = tenantsData as unknown as Tenant[];

      let query = supabase.from('payments').select('tenant_id, amount');
      if (selectedDate) {
        query = query.eq('payment_month', dateKey);
      }

      const { data: payments, error: paymentsError } = await query;
      if (paymentsError) throw paymentsError;

      const tenantPayments = new Map<string, number>();
      (payments || []).forEach(p => {
        const current = tenantPayments.get(p.tenant_id) || 0;
        tenantPayments.set(p.tenant_id, current + p.amount);
      });

      const getPaymentStatus = (rent: number, paid: number): PaymentStatus => {
        if (paid === 0) return 'unpaid';
        if (paid < rent) return 'partial';
        if (paid > rent) return 'overpaid';
        return 'paid';
      };

      const dashboardUnits: DashboardUnit[] = (units || []).map(unit => {
        const tenant = tenants?.find(t => t.unit_id === unit.id);
        const rentAmount = tenant?.rent_amount || 0;
        const amountPaid = tenant ? (tenantPayments.get(tenant.id) || 0) : 0;
        const balance = rentAmount - amountPaid;
        
        return {
          id: unit.id,
          unit_number: unit.unit_number,
          property_id: unit.property_id,
          property_name: (unit.properties as any)?.name || 'Unknown',
          tenant_id: tenant?.id || null,
          tenant_name: tenant?.name || null,
          tenant_phone: tenant?.phone || null,
          rent_amount: rentAmount,
          payment_status: tenant ? getPaymentStatus(rentAmount, amountPaid) : 'unpaid',
          amount_paid: amountPaid,
          balance,
        };
      });

      const occupiedUnits = dashboardUnits.filter(u => u.tenant_id);
      const paidUnits = occupiedUnits.filter(u => u.payment_status === 'paid' || u.payment_status === 'overpaid');
      const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalArrearsValue = occupiedUnits.reduce((sum, u) => sum + (u.balance > 0 ? u.balance : 0), 0);
      const totalDeposits = tenants?.reduce((sum, t) => sum + (Number(t.security_deposit) || 0), 0) || 0;

      const stats: DashboardStats = {
        totalUnits: dashboardUnits.length,
        occupiedUnits: occupiedUnits.length,
        paidUnits: paidUnits.length,
        arrearsUnits: occupiedUnits.length - paidUnits.length,
        totalCollected,
        totalArrearsValue,
        totalDeposits,
      };

      return { units: dashboardUnits, stats };
    },
  });
}