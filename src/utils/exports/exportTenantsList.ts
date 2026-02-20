import * as XLSX from "xlsx";

export interface TenantExportRow {
  tenant_name: string;
  phone: string;
  property_name: string;
  unit_number: string;
  rent_amount: number;
  balance: number;
  payment_status: string;
  risk_level: string;
  risk_score: number;
  lease_start: string | null;
}

export async function exportTenantsListExcel(rows: TenantExportRow[]) {
  const exportRows = rows.map((row) => ({
    Tenant: row.tenant_name,
    Phone: row.phone,
    Property: row.property_name,
    Unit: row.unit_number,
    Rent: row.rent_amount,
    Balance: row.balance,
    PaymentStatus: row.payment_status,
    RiskLevel: row.risk_level,
    RiskScore: row.risk_score,
    LeaseStart: row.lease_start ?? "",
  }));

  const sheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Tenants");
  XLSX.writeFile(workbook, `tenants_list_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
