import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { currentMonthKey, isMonthKey, parseDateKey } from "@/lib/month";
import { getSupabaseErrorMessage, isUniqueViolation } from "@/lib/supabase-errors";

export type Payment = Database["public"]["Tables"]["payments"]["Row"];

export type CreatePaymentPayload = {
  tenant_id: string;
  amount: number;
  payment_month: string;
  mpesa_code?: string | null;
  note?: string | null;
  /** Date the money was received, as `YYYY-MM-DD`. Defaults to today. */
  payment_date?: string | null;
};

export interface DuplicatePayment {
  paymentId: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  paymentDate: string;
}

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export function normalizeMpesaCode(code: string | null | undefined): string | null {
  const trimmed = (code ?? "").trim().toUpperCase();
  return trimmed === "" ? null : trimmed;
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCurrentMonthPayments() {
  const month = currentMonthKey();

  return useQuery({
    queryKey: ["payments", month],
    queryFn: async () => {
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("payment_month", month);

      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Check whether an M-Pesa code has already been recorded, so the user can be
 * warned before submitting rather than hitting a constraint violation after.
 */
export async function findPaymentByMpesaCode(
  code: string | null | undefined
): Promise<DuplicatePayment | null> {
  const normalized = normalizeMpesaCode(code);
  if (!normalized) return null;

  const { data, error } = await supabase.rpc("find_payment_by_mpesa_code", {
    p_mpesa_code: normalized,
  });

  if (error) return null;
  const row = (data ?? [])[0];
  if (!row) return null;

  return {
    paymentId: row.payment_id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    amount: row.amount,
    paymentDate: row.payment_date,
  };
}

export function useCreatePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const userId = await getUserId();

      // Amounts are whole shillings — the ledger columns are INTEGER, and a
      // fractional value would either be rejected or silently truncated.
      const amount = Math.round(Number(payload.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter an amount greater than zero.");
      }
      if (!isMonthKey(payload.payment_month)) {
        throw new Error("Pick a valid payment month.");
      }

      const paymentDate = payload.payment_date
        ? parseDateKey(payload.payment_date)
        : null;
      if (paymentDate && Number.isNaN(paymentDate.getTime())) {
        throw new Error("Pick a valid payment date.");
      }

      const { data, error } = await supabase.rpc(
        "record_payment_with_smart_allocation",
        {
          p_tenant_id: payload.tenant_id,
          p_amount: amount,
          p_payment_month: payload.payment_month,
          p_mpesa_code: normalizeMpesaCode(payload.mpesa_code),
          p_note: payload.note?.trim() || null,
          p_user_id: userId,
          p_payment_date: paymentDate ? paymentDate.toISOString() : null,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["tenant-ledger"] });
      qc.invalidateQueries({ queryKey: ["tenant-risk-snapshots"] });

      toast({ title: "Payment recorded" });
    },
    onError: (err: unknown) => {
      toast({
        title: "Could not record payment",
        description: isUniqueViolation(err)
          ? "That M-Pesa code has already been recorded. Check the tenant's payment history."
          : getSupabaseErrorMessage(err),
        variant: "destructive",
      });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Goes through the RPC so the tenant's allocations are rebuilt; a bare
      // delete would leave the remaining payments applied to the wrong months.
      const { error } = await supabase.rpc("delete_payment", { p_payment_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["tenant-ledger"] });
      toast({ title: "Payment removed" });
    },
    onError: (err: unknown) => {
      toast({
        title: "Could not remove payment",
        description: getSupabaseErrorMessage(err),
        variant: "destructive",
      });
    },
  });
}
