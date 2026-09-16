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

/** A payment that looks like the one being entered. Advisory, not a constraint. */
export interface PossibleDuplicate {
  paymentId: string;
  amount: number;
  paymentDate: string;
  recordedAt: string;
}

/**
 * Same tenant, same amount, same calendar day — the shape of a payment entered
 * twice.
 *
 * The M-Pesa code is a hard duplicate check, backed by a unique index, and it
 * works well. But it only fires when a code is typed, and most payments are
 * entered by hand with no code at all. That left the commonest duplicate of
 * all completely unguarded: the landlord records a payment, the dialog closes
 * without confirming anything, they are not sure it saved, and they record it
 * again. Three tenants were double-credited that way in a single morning,
 * 25 to 47 seconds apart.
 *
 * This is deliberately a warning rather than a block. A tenant genuinely can
 * pay the same amount twice in one day — two units, or two instalments — so
 * the landlord is told what already exists and decides for themselves.
 *
 * payment_date is TIMESTAMPTZ, so the day is bounded in local time rather than
 * compared as a string.
 */
export async function findPossibleDuplicatePayment(
  tenantId: string,
  amount: number,
  dateKey: string
): Promise<PossibleDuplicate | null> {
  if (!tenantId || !Number.isFinite(amount) || amount <= 0 || !dateKey) return null;

  // parseDateKey returns an Invalid Date rather than throwing on bad input.
  const dayStart = parseDateKey(dateKey);
  if (Number.isNaN(dayStart.getTime())) return null;

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, payment_date, created_at")
    .eq("tenant_id", tenantId)
    .eq("amount", Math.round(amount))
    .gte("payment_date", dayStart.toISOString())
    .lt("payment_date", dayEnd.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return null;
  const row = (data ?? [])[0];
  if (!row) return null;

  return {
    paymentId: row.id,
    amount: row.amount,
    paymentDate: row.payment_date,
    recordedAt: row.created_at,
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
