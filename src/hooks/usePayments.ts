import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export type Payment = Database["public"]["Tables"]["payments"]["Row"];

export type CreatePaymentPayload = {
  tenant_id: string;
  amount: number;
  payment_month: string;
  mpesa_code?: string | null;
  note?: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
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
  const month = new Date().toISOString().slice(0, 7);

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

export function useCreatePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const userId = await getUserId();

      const { error } = await supabase.rpc(
        "record_payment_with_smart_allocation",
        {
          p_tenant_id: payload.tenant_id,
          p_amount: payload.amount,
          p_payment_month: payload.payment_month,
          p_mpesa_code: payload.mpesa_code ?? null,
          p_note: payload.note ?? null,
          p_user_id: userId,
        }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["tenant-balance"] });

      toast({ title: "Payment recorded successfully" });
    },
    onError: (err: unknown) => {
      toast({
        title: "Failed to record payment",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const userId = await getUserId();

      const { error } = await supabase
        .from("payments")
        .delete()
        .match({ id, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["tenant-balance"] });
    },
  });
}

