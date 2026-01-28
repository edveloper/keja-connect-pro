import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

type Props = {
  monthKey: string | null;
};

export async function exportFinancialStatementExcel({ monthKey }: Props) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const userId = session.user.id;

  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args?: Record<string, any>
    ) => Promise<{ data: any[]; error: any }>
  )(
    "get_financial_statements",
    {
      p_month: monthKey,
      p_user_id: userId,
    }
  );

  if (error) {
    console.error("Failed to export financial statements", error);
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Financial Statements"
  );

  XLSX.writeFile(
    workbook,
    `financial_statements_${monthKey ?? "all_time"}.xlsx`
  );
}
