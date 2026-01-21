// src/hooks/usePayments.ts
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// Types
type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

type Allocation = { applied_month: string; amount: number };

type CreatePaymentPayload = {
  tenant_id: string;
  amount: number;
  payment_month: string;
  mpesa_code?: string | null;
  note?: string | null;
  allocations?: Allocation[] | null; // pass null to let RPC auto-allocate
};

async function getUserIdOrThrow(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

function toNumberAmount(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetch all payments for the current user
 */
export function usePayments() {
  return useQuery<Payment[], Error>({
    queryKey: ['payments'],
    queryFn: async (): Promise<Payment[]> => {
      const userId = await getUserIdOrThrow();

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Fetch payments for the current month
 */
export function useCurrentMonthPayments() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return useQuery<Payment[], Error>({
    queryKey: ['payments', 'current-month', currentMonth],
    queryFn: async (): Promise<Payment[]> => {
      const userId = await getUserIdOrThrow();

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .eq('payment_month', currentMonth);

      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Create payment mutation using RPC insert_payment_with_allocations
 * Note: cast supabase.rpc to any to avoid narrow generated RPC name unions.
 */
export function useCreatePayment(): UseMutationResult<Payment, any, CreatePaymentPayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation<Payment, any, CreatePaymentPayload, unknown>({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const userId = await getUserIdOrThrow();

      // Build RPC parameters matching generated types
      const rpcParams: any = {
        p_tenant_id: payload.tenant_id,
        p_amount: payload.amount,
        p_payment_month: payload.payment_month,
        p_mpesa_code: payload.mpesa_code ?? null,
        p_note: payload.note ?? null,
        p_user_id: userId,
        p_allocations: payload.allocations && payload.allocations.length > 0 ? payload.allocations : null,
      };

      // Call RPC via any to avoid TS union mismatch
      const { data, error } = await (supabase as any).rpc('insert_payment_with_allocations', rpcParams);

      if (error) throw error;

      // Normalize RPC result safely
      const rpcResult = Array.isArray(data) ? data[0] : data;

      // Common RPC shapes:
      // 1) { payment: {...}, allocations: [...] }
      // 2) { payment_id: '...', created_at: '...' } (minimal)
      // 3) [{ payment: {...}, allocations: [...] }] (array)
      // We attempt to return a Payment row; if not present, fallback to fetching the created payment by id.
      const paymentRowCandidate = rpcResult?.payment ?? rpcResult?.payment_row ?? null;

      if (paymentRowCandidate && typeof paymentRowCandidate === 'object') {
        return paymentRowCandidate as Payment;
      }

      // If RPC returned a payment_id, fetch the payment row
      const paymentId = rpcResult?.payment_id ?? rpcResult?.paymentId ?? null;
      if (paymentId) {
        const { data: fetched, error: fetchErr } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .limit(1)
          .single();
        if (fetchErr) throw fetchErr;
        return fetched as Payment;
      }

      // Last-resort: fetch most recent payment for tenant + amount
      const { data: fallback, error: fallbackErr } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', payload.tenant_id)
        .eq('amount', payload.amount)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fallbackErr) throw fallbackErr;
      return fallback as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Payment recorded' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to record payment', variant: 'destructive' });
    },
  });
}

/**
 * Delete payment mutation
 */
export function useDeletePayment(): UseMutationResult<void, any, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation<void, any, string, unknown>({
    mutationFn: async (id: string) => {
      const userId = await getUserIdOrThrow();
      const { error } = await supabase
        .from('payments')
        .delete()
        .match({ id, user_id: userId });

      if (error) throw error;

      // Attempt to remove allocations tied to this payment if table exists
      try {
        await (supabase as any).from('payment_allocations').delete().eq('payment_id', id);
      } catch (err) {
        // ignore allocation deletion errors
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Removed', description: 'Payment record deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message ?? 'Failed to delete payment', variant: 'destructive' });
    },
  });
}

/**
 * Calculate payment status for a single month.
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
    ? paymentsThisMonth.reduce((sum, p) => sum + toNumberAmount(p.amount), 0)
    : 0;

  const balance = Math.round((rentAmount || 0) - totalPaid);

  if (totalPaid === 0) return { status: 'unpaid', totalPaid, balance };
  if (totalPaid < rentAmount) return { status: 'partial', totalPaid, balance };
  if (totalPaid === rentAmount) return { status: 'paid', totalPaid, balance };
  return { status: 'overpaid', totalPaid, balance };
}
