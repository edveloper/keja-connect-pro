import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import { formatMonthLabel, isMonthKey } from "@/lib/month";

type Props = {
  monthKey: string | null;
  intelligence?: {
    topRiskTenants?: Array<{ name: string; level: string; score: number; property?: string; unit?: string }>;
    anomalies?: string[];
  };
};

/**
 * The per-tenant, per-month ledger, for an accountant or auditor.
 *
 * Scoping is done inside the RPC from `auth.uid()`. It used to take a
 * `p_user_id` argument, which meant any caller could read another landlord's
 * statement by passing their id.
 */
export async function exportFinancialStatementExcel({ monthKey, intelligence }: Props) {
  const { data, error } = await supabase.rpc("get_financial_statements", {
    p_month: monthKey,
  });

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) {
    throw new Error(
      monthKey
        ? `No charges or payments recorded for ${formatMonthLabel(monthKey)}.`
        : "No charges or payments recorded yet."
    );
  }

  // Readable headers, and a running balance so the sheet can be read top to
  // bottom rather than reverse-engineered from raw column names.
  const ledgerRows = rows.map((row) => ({
    Property: row.property_name,
    Unit: row.unit_number,
    Tenant: row.tenant_name,
    Month: isMonthKey(row.charge_month) ? formatMonthLabel(row.charge_month) : row.charge_month,
    MonthKey: row.charge_month,
    Billed: Math.round(Number(row.total_charges || 0)),
    Paid: Math.round(Number(row.total_collected || 0)),
    Balance: Math.round(Number(row.balance || 0)),
  }));

  const totals = ledgerRows.reduce(
    (acc, r) => ({
      billed: acc.billed + r.Billed,
      paid: acc.paid + r.Paid,
      balance: acc.balance + r.Balance,
    }),
    { billed: 0, paid: 0, balance: 0 }
  );

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      ...ledgerRows,
      {} as (typeof ledgerRows)[number],
      {
        Property: "TOTAL",
        Unit: "",
        Tenant: "",
        Month: monthKey && isMonthKey(monthKey) ? formatMonthLabel(monthKey) : "All time",
        MonthKey: "",
        Billed: totals.billed,
        Paid: totals.paid,
        Balance: totals.balance,
      } as (typeof ledgerRows)[number],
    ]),
    "Ledger"
  );

  if (intelligence?.topRiskTenants?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        intelligence.topRiskTenants.map((row, index) => ({
          Rank: index + 1,
          Tenant: row.name,
          Property: row.property ?? "",
          Unit: row.unit ?? "",
          RiskLevel: row.level,
          RiskScore: row.score,
        }))
      ),
      "Risk"
    );
  }

  if (intelligence?.anomalies?.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        intelligence.anomalies.map((row, index) => ({ Index: index + 1, Anomaly: row }))
      ),
      "Anomalies"
    );
  }

  XLSX.writeFile(workbook, `statement_${monthKey ?? "all_time"}.xlsx`);
}
