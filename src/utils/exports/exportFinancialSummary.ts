import * as XLSX from "xlsx";

type Props = {
  monthKey: string | null;
  totalCollected: number;
  totalExpenses: number;
  netIncome: number;
};

export async function exportFinancialSummaryExcel({
  monthKey,
  totalCollected,
  totalExpenses,
  netIncome,
}: Props) {
  const rows = [
    { Metric: "Period", Value: monthKey ?? "All Time" },
    { Metric: "Total Revenue", Value: totalCollected },
    { Metric: "Total Expenses", Value: totalExpenses },
    { Metric: "Net Surplus", Value: netIncome },
  ];

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, "Financial Summary");

  XLSX.writeFile(
    workbook,
    `financial_summary_${monthKey ?? "all_time"}.xlsx`
  );
}
