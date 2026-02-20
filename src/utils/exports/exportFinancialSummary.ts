import * as XLSX from "xlsx";

type Props = {
  monthKey: string | null;
  totalCollected: number;
  totalExpenses: number;
  netIncome: number;
  intelligence?: {
    collectionRate?: number;
    topRiskTenants?: Array<{ name: string; level: string; score: number }>;
    anomalies?: string[];
    pendingReminders?: number;
  };
};

export async function exportFinancialSummaryExcel({
  monthKey,
  totalCollected,
  totalExpenses,
  netIncome,
  intelligence,
}: Props) {
  const rows = [
    { Metric: "Period", Value: monthKey ?? "All Time" },
    { Metric: "Total Revenue", Value: totalCollected },
    { Metric: "Total Expenses", Value: totalExpenses },
    { Metric: "Net Surplus", Value: netIncome },
    ...(typeof intelligence?.collectionRate === "number"
      ? [{ Metric: "Collection Efficiency (%)", Value: Number(intelligence.collectionRate.toFixed(1)) }]
      : []),
    ...(typeof intelligence?.pendingReminders === "number"
      ? [{ Metric: "Pending Reminders", Value: intelligence.pendingReminders }]
      : []),
  ];

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, "Financial Summary");

  if (intelligence) {
    const topRiskRows =
      intelligence.topRiskTenants?.map((t, index) => ({
        Rank: index + 1,
        Tenant: t.name,
        RiskLevel: t.level,
        RiskScore: t.score,
      })) ?? [];

    const anomalyRows =
      intelligence.anomalies?.map((text, index) => ({
        Index: index + 1,
        Anomaly: text,
      })) ?? [];

    if (topRiskRows.length > 0) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(topRiskRows),
        "Top Risk Tenants"
      );
    }

    if (anomalyRows.length > 0) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(anomalyRows),
        "Anomalies"
      );
    }
  }

  XLSX.writeFile(
    workbook,
    `financial_summary_${monthKey ?? "all_time"}.xlsx`
  );
}
