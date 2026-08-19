// src/hooks/useTenantLedger.ts
//
// A single tenant's account: what they were billed each month, what has been
// applied against it, and the balance carried forward. This is the view a
// landlord needs when a tenant disputes a figure, and the app previously had
// no way to show it.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatMonthLabel, type MonthKey } from "@/lib/month";

type ChargeRow = Database["public"]["Tables"]["charges"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type AllocationRow = Database["public"]["Tables"]["payment_allocations"]["Row"];

export interface LedgerCharge {
  id: string;
  amount: number;
  type: string;
  note: string | null;
}

export interface LedgerMonth {
  month: MonthKey;
  label: string;
  charged: number;
  applied: number;
  /** Charged minus applied for this month alone. Positive means owed. */
  movement: number;
  /** Cumulative balance through the end of this month. Positive means owed. */
  balance: number;
  charges: LedgerCharge[];
}

export interface LedgerPayment {
  id: string;
  amount: number;
  paidOn: string;
  statedMonth: MonthKey;
  mpesaCode: string | null;
  note: string | null;
  /** Which months this payment was actually applied to, oldest first. */
  appliedTo: Array<{ month: MonthKey; label: string; amount: number }>;
}

export interface TenantLedger {
  months: LedgerMonth[];
  payments: LedgerPayment[];
  totalCharged: number;
  totalApplied: number;
  /** Positive means the tenant owes; negative means they are in credit. */
  balance: number;
}

const EMPTY_LEDGER: TenantLedger = {
  months: [],
  payments: [],
  totalCharged: 0,
  totalApplied: 0,
  balance: 0,
};

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

export function useTenantLedger(tenantId: string | null | undefined) {
  return useQuery<TenantLedger, Error>({
    queryKey: ["tenant-ledger", tenantId ?? "none"],
    enabled: Boolean(tenantId),
    staleTime: 30_000,
    queryFn: async (): Promise<TenantLedger> => {
      if (!tenantId) return EMPTY_LEDGER;

      const [chargesRes, paymentsRes] = await Promise.all([
        supabase
          .from("charges")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("charge_month", { ascending: true }),
        supabase
          .from("payments")
          .select("*, payment_allocations(*)")
          .eq("tenant_id", tenantId)
          .order("payment_date", { ascending: false }),
      ]);

      if (chargesRes.error) throw chargesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const charges = (chargesRes.data ?? []) as ChargeRow[];
      const paymentRows = (paymentsRes.data ?? []) as Array<
        PaymentRow & { payment_allocations?: AllocationRow[] | null }
      >;

      const chargesByMonth = new Map<MonthKey, ChargeRow[]>();
      charges.forEach((charge) => {
        const list = chargesByMonth.get(charge.charge_month) ?? [];
        list.push(charge);
        chargesByMonth.set(charge.charge_month, list);
      });

      const appliedByMonth = new Map<MonthKey, number>();
      paymentRows.forEach((payment) => {
        (payment.payment_allocations ?? []).forEach((allocation) => {
          appliedByMonth.set(
            allocation.applied_month,
            (appliedByMonth.get(allocation.applied_month) ?? 0) + toNumber(allocation.amount)
          );
        });
      });

      // Month keys are fixed-width, so lexical sort is chronological.
      const allMonths = Array.from(
        new Set([...chargesByMonth.keys(), ...appliedByMonth.keys()])
      ).sort();

      let running = 0;
      const months: LedgerMonth[] = allMonths.map((month) => {
        const monthCharges = chargesByMonth.get(month) ?? [];
        const charged = monthCharges.reduce((sum, c) => sum + toNumber(c.amount), 0);
        const applied = appliedByMonth.get(month) ?? 0;
        const movement = charged - applied;
        running += movement;

        return {
          month,
          label: formatMonthLabel(month),
          charged: Math.round(charged),
          applied: Math.round(applied),
          movement: Math.round(movement),
          balance: Math.round(running),
          charges: monthCharges.map((c) => ({
            id: c.id,
            amount: Math.round(toNumber(c.amount)),
            type: c.type,
            note: c.note,
          })),
        };
      });

      const payments: LedgerPayment[] = paymentRows.map((payment) => ({
        id: payment.id,
        amount: Math.round(toNumber(payment.amount)),
        paidOn: payment.payment_date,
        statedMonth: payment.payment_month,
        mpesaCode: payment.mpesa_code,
        note: payment.note,
        appliedTo: (payment.payment_allocations ?? [])
          .slice()
          .sort((a, b) => a.applied_month.localeCompare(b.applied_month))
          .map((allocation) => ({
            month: allocation.applied_month,
            label: formatMonthLabel(allocation.applied_month),
            amount: Math.round(toNumber(allocation.amount)),
          })),
      }));

      const totalCharged = charges.reduce((sum, c) => sum + toNumber(c.amount), 0);
      const totalApplied = Array.from(appliedByMonth.values()).reduce((a, b) => a + b, 0);

      return {
        months,
        payments,
        totalCharged: Math.round(totalCharged),
        totalApplied: Math.round(totalApplied),
        balance: Math.round(totalCharged - totalApplied),
      };
    },
  });
}
