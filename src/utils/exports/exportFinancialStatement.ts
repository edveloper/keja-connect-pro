import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

type Props = {
  monthKey: string | null;
  intelligence?: {
    topRiskTenants?: Array<{ name: string; level: string; score: number; property?: string; unit?: string }>;
    anomalies?: string[];
  };
};

export async function exportFinancialStatementExcel({ monthKey, intelligence }: Props) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

  const { data, error } = await supabase.rpc("get_financial_statements", {
    p_month: monthKey,
    p_user_id: userId,
  });

  if (error) {
    console.error("Failed to export financial statements", error);
    if (error.code === "PGRST203") {
      throw new Error(
        "Export RPC is ambiguous in this database (duplicate get_financial_statements overloads). Apply the latest migration and retry."
      );
    }
    throw new Error(error.message || "Failed to export financial statement");
  }

  const rows = Array.isArray(data) ? data : [];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Financial Statements"
  );

  if (intelligence) {
    const riskRows =
      intelligence.topRiskTenants?.map((row, index) => ({
        Rank: index + 1,
        Tenant: row.name,
        Property: row.property ?? "",
        Unit: row.unit ?? "",
        RiskLevel: row.level,
        RiskScore: row.score,
      })) ?? [];

    const anomalyRows =
      intelligence.anomalies?.map((row, index) => ({
        Index: index + 1,
        Anomaly: row,
      })) ?? [];

    if (riskRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(riskRows), "Risk Insights");
    }
    if (anomalyRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(anomalyRows), "Anomalies");
    }
  }

  XLSX.writeFile(
    workbook,
    `financial_statements_${monthKey ?? "all_time"}.xlsx`
  );
}
