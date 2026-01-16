import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMonths, startOfMonth, parseISO, getDaysInMonth, differenceInDays, endOfMonth, addMonths } from 'date-fns';

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

interface Tenant {
  id: string;
  unit_id: string;
  name: string;
  phone: string | null;
  rent_amount: number;
  security_deposit: number | null;
  lease_start: string | null;
  opening_balance: number | null;
  is_prorated: boolean;
  first_month_override: number | null;
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

      const { data: tenantsData, error: tenantsError } = await supabase.from('tenants').select('*');
      if (tenantsError) throw tenantsError;
      const tenants = tenantsData as unknown as Tenant[];

      let paymentsQuery = supabase.from('payments').select('tenant_id, amount, payment_month');
      if (selectedDate) paymentsQuery = paymentsQuery.lte('payment_month', dateKey);

      const { data: allPayments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      const dashboardUnits: DashboardUnit[] = (units || []).map(unit => {
        const tenant = tenants?.find(t => t.unit_id === unit.id);
        
        if (!tenant) return {
          id: unit.id, unit_number: unit.unit_number, property_id: unit.property_id,
          property_name: (unit.properties as any)?.name || 'Unknown',
          tenant_id: null, tenant_name: null, tenant_phone: null,
          rent_amount: 0, payment_status: 'unpaid', amount_paid: 0, balance: 0,
        };

        const monthlyRent = Number(tenant.rent_amount) || 0;
        const leaseStart = tenant.lease_start ? parseISO(tenant.lease_start) : new Date();
        const comparisonDate = selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date());

        // --- CALCULATION LOGIC ---
        let firstMonthCharge = monthlyRent;

        if (tenant.first_month_override !== null) {
          firstMonthCharge = Number(tenant.first_month_override);
        } else if (tenant.is_prorated) {
          const daysInMonth = getDaysInMonth(leaseStart);
          const daysRemaining = differenceInDays(endOfMonth(leaseStart), leaseStart) + 1;
          firstMonthCharge = (monthlyRent / daysInMonth) * daysRemaining;
        }

        const nextMonthStart = startOfMonth(addMonths(startOfMonth(leaseStart), 1));
        const fullMonthsCount = Math.max(0, differenceInMonths(comparisonDate, nextMonthStart) + 1);
        
        const cumulativeExpected = firstMonthCharge + (monthlyRent * fullMonthsCount) + (Number(tenant.opening_balance) || 0);
        const totalPaidToDate = allPayments?.filter(p => p.tenant_id === tenant.id).reduce((s, p) => s + p.amount, 0) || 0;
        const balance = Math.round(cumulativeExpected - totalPaidToDate);

        return {
          id: unit.id, unit_number: unit.unit_number, property_id: unit.property_id,
          property_name: (unit.properties as any)?.name || 'Unknown',
          tenant_id: tenant.id, tenant_name: tenant.name, tenant_phone: tenant.phone,
          rent_amount: monthlyRent,
          payment_status: totalPaidToDate >= cumulativeExpected - 5 ? 'paid' : totalPaidToDate > 0 ? 'partial' : 'unpaid',
          amount_paid: allPayments?.filter(p => p.tenant_id === tenant.id && p.payment_month === dateKey).reduce((s, p) => s + p.amount, 0) || 0,
          balance: balance,
        };
      });

      return {
        units: dashboardUnits,
        stats: {
          totalUnits: dashboardUnits.length,
          occupiedUnits: dashboardUnits.filter(u => u.tenant_id).length,
          paidUnits: dashboardUnits.filter(u => u.payment_status === 'paid').length,
          arrearsUnits: dashboardUnits.filter(u => u.tenant_id && u.payment_status !== 'paid').length,
          totalCollected: allPayments?.filter(p => p.payment_month === dateKey).reduce((s, p) => s + p.amount, 0) || 0,
          totalArrearsValue: dashboardUnits.reduce((sum, u) => sum + (u.balance > 0 ? u.balance : 0), 0),
          totalDeposits: tenants?.reduce((sum, t) => sum + (Number(t.security_deposit) || 0), 0) || 0,
        },
      };
    },
  });
}