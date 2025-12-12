import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Payment = Tables<'payments'>;

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function usePaymentsByTenant(tenantId: string) {
  return useQuery({
    queryKey: ['payments', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCurrentMonthPayments() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  
  return useQuery({
    queryKey: ['payments', 'current-month', currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_month', currentMonth);
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payment: { 
      tenant_id: string; 
      amount: number; 
      payment_month: string;
      mpesa_code?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Payment recorded successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Helper to calculate payment status for a tenant for current month
export function calculatePaymentStatus(
  rentAmount: number,
  paymentsThisMonth: Payment[]
): {
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  totalPaid: number;
  balance: number; // negative = arrears, positive = credit
} {
  const totalPaid = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalPaid - rentAmount;
  
  if (totalPaid === 0) {
    return { status: 'unpaid', totalPaid, balance };
  } else if (totalPaid < rentAmount) {
    return { status: 'partial', totalPaid, balance };
  } else if (totalPaid === rentAmount) {
    return { status: 'paid', totalPaid, balance };
  } else {
    return { status: 'overpaid', totalPaid, balance };
  }
}
