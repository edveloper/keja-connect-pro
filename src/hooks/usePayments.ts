import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// Manually define simpler types
type Payment = Database['public']['Tables']['payments']['Row'];

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async (): Promise<Payment[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // @ts-ignore - Bypassing Supabase type inference
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function usePaymentsByTenant(tenantId: string) {
  return useQuery({
    queryKey: ['payments', tenantId],
    queryFn: async (): Promise<Payment[]> => {
      // @ts-ignore
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!tenantId,
  });
}

export function useCurrentMonthPayments() {
  const currentMonth = new Date().toISOString().slice(0, 7); 
  
  return useQuery({
    queryKey: ['payments', 'current-month', currentMonth],
    queryFn: async (): Promise<Payment[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // @ts-ignore
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', session?.user?.id)
        .eq('payment_month', currentMonth);
      
      if (error) throw error;
      return data as Payment[];
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
      // @ts-ignore
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
      toast({ title: 'Success', description: 'Payment recorded' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * EXPORTED HELPER: Calculates status for RecordPaymentDialog 
 */
export function calculatePaymentStatus(
  rentAmount: number,
  paymentsThisMonth: Payment[]
): {
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  totalPaid: number;
  balance: number;
} {
  const totalPaid = Array.isArray(paymentsThisMonth) 
    ? paymentsThisMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) 
    : 0;
    
  const balance = totalPaid - rentAmount;
  
  if (totalPaid === 0) return { status: 'unpaid', totalPaid, balance };
  if (totalPaid < rentAmount) return { status: 'partial', totalPaid, balance };
  if (totalPaid === rentAmount) return { status: 'paid', totalPaid, balance };
  return { status: 'overpaid', totalPaid, balance };
}