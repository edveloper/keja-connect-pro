// src/hooks/useAnnualStatement.ts
//
// Twelve months of collections, expenses and arrears.
//
// The old "Loan Pack" export was a single-month snapshot, which no lender will
// accept as income evidence — banks want six to twelve months of history. This
// assembles that history from the ledger.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  addMonths,
  currentMonthKey,
  formatMonthLabel,
  monthRange,
  toMonthKey,
  type MonthKey,
} from "@/lib/month";

export interface AnnualMonthRow {
  month: MonthKey;
  label: string;
  billed: number;
  collected: number;
  expenses: number;
  net: number;
}

export interface AnnualStatement {
  months: AnnualMonthRow[];
  from: MonthKey;
  to: MonthKey;
  totalBilled: number;
  totalCollected: number;
  totalExpenses: number;
  totalNet: number;
  /** Average monthly net across months that had any activity. */
  averageMonthlyNet: number;
  /** Collected as a share of billed, across the whole period. */
  collectionRate: number;
  /** Months with a positive net, out of the months covered. */
  profitableMonths: number;
}

function round(n: number): number {
  return Math.round(n);
}

export function useAnnualStatement(months = 12) {
  const to = currentMonthKey();
  const from = addMonths(to, -(months - 1));

  return useQuery<AnnualStatement, Error>({
    queryKey: ["annual-statement", from, to],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      const window = monthRange(from, to);
      const empty: AnnualStatement = {
        months: window.map((month) => ({
          month,
          label: formatMonthLabel(month),
          billed: 0,
          collected: 0,
          expenses: 0,
          net: 0,
        })),
        from,
        to,
        totalBilled: 0,
        totalCollected: 0,
        totalExpenses: 0,
        totalNet: 0,
        averageMonthlyNet: 0,
        collectionRate: 0,
        profitableMonths: 0,
      };

      if (!userId) return empty;

      // Statements cover every month; payments and expenses are filtered to the
      // window below.
      const [statementsRes, paymentsRes, expensesRes] = await Promise.all([
        supabase.rpc("get_financial_statements", { p_month: null }),
        supabase
          .from("payments")
          .select("amount, payment_date")
          .eq("user_id", userId),
        supabase
          .from("expenses")
          .select("amount, expense_month")
          .eq("user_id", userId)
          .gte("expense_month", from)
          .lte("expense_month", to),
      ]);

      if (statementsRes.error) throw statementsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const billedByMonth = new Map<MonthKey, number>();
      (statementsRes.data ?? []).forEach((row) => {
        if (row.charge_month < from || row.charge_month > to) return;
        billedByMonth.set(
          row.charge_month,
          (billedByMonth.get(row.charge_month) ?? 0) + Number(row.total_charges || 0)
        );
      });

      // Cash basis: money is counted in the month it actually arrived.
      const collectedByMonth = new Map<MonthKey, number>();
      (paymentsRes.data ?? []).forEach((row) => {
        const paidDate = new Date(row.payment_date);
        if (Number.isNaN(paidDate.getTime())) return;
        const month = toMonthKey(paidDate);
        if (month < from || month > to) return;
        collectedByMonth.set(
          month,
          (collectedByMonth.get(month) ?? 0) + Number(row.amount || 0)
        );
      });

      const expensesByMonth = new Map<MonthKey, number>();
      (expensesRes.data ?? []).forEach((row) => {
        expensesByMonth.set(
          row.expense_month,
          (expensesByMonth.get(row.expense_month) ?? 0) + Number(row.amount || 0)
        );
      });

      const rows: AnnualMonthRow[] = window.map((month) => {
        const billed = billedByMonth.get(month) ?? 0;
        const collected = collectedByMonth.get(month) ?? 0;
        const expenses = expensesByMonth.get(month) ?? 0;
        return {
          month,
          label: formatMonthLabel(month),
          billed: round(billed),
          collected: round(collected),
          expenses: round(expenses),
          net: round(collected - expenses),
        };
      });

      const totalBilled = rows.reduce((s, r) => s + r.billed, 0);
      const totalCollected = rows.reduce((s, r) => s + r.collected, 0);
      const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0);
      const totalNet = totalCollected - totalExpenses;

      // Averaged over months with activity, so a portfolio started six months
      // ago is not made to look half as profitable as it is.
      const activeMonths = rows.filter(
        (r) => r.billed > 0 || r.collected > 0 || r.expenses > 0
      ).length;

      return {
        months: rows,
        from,
        to,
        totalBilled,
        totalCollected,
        totalExpenses,
        totalNet,
        averageMonthlyNet: activeMonths > 0 ? round(totalNet / activeMonths) : 0,
        collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
        profitableMonths: rows.filter((r) => r.net > 0).length,
      };
    },
  });
}
