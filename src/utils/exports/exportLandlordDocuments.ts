import * as XLSX from "xlsx";

type UnitRow = {
  id?: string;
  tenant_id?: string | null;
  property_name?: string | null;
  unit_number?: string | null;
  tenant_name?: string | null;
  rent_amount?: number | null;
  balance?: number | null;
  payment_status?: string | null;
  total_charges?: number | null;
  total_allocated?: number | null;
};

type PaymentRow = {
  amount: number;
  payment_date: string;
  payment_month?: string | null;
  tenant_id?: string | null;
  mpesa_code?: string | null;
  note?: string | null;
};

type ExpenseRow = {
  amount: number;
  expense_date: string;
  description?: string | null;
  expense_categories?: { name?: string | null } | null;
  properties?: { name?: string | null } | null;
  units?: { unit_number?: string | null } | null;
};

type RiskTenant = {
  name: string;
  property?: string;
  unit?: string;
  score: number;
  level: string;
};

type ReminderRow = {
  tenant_id: string;
  status: string;
  priority: number;
  scheduled_for?: string | null;
  notes?: string | null;
};

type ExportPayload = {
  monthKey: string | null;
  totalCollected: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  occupancyRate: number;
  outstandingBalance: number;
  expectedRent: number;
  units: UnitRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  topRiskTenants: RiskTenant[];
  reminders: ReminderRow[];
};

const toMoney = (v: number) => Math.round(Number(v || 0));
const toTitle = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const buildCoreSheets = (wb: XLSX.WorkBook, payload: ExportPayload) => {
  const summaryRows = [
    { Metric: "Period", Value: payload.monthKey ?? "all_time" },
    { Metric: "Total Collected", Value: toMoney(payload.totalCollected) },
    { Metric: "Total Expenses", Value: toMoney(payload.totalExpenses) },
    { Metric: "Net Income", Value: toMoney(payload.netIncome) },
    { Metric: "Collection Rate (%)", Value: Number(payload.collectionRate.toFixed(1)) },
    { Metric: "Occupancy Rate (%)", Value: Number(payload.occupancyRate.toFixed(1)) },
    { Metric: "Expected Rent", Value: toMoney(payload.expectedRent) },
    { Metric: "Outstanding Balance", Value: toMoney(payload.outstandingBalance) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "KPI Summary");

  const rentRollRows = payload.units.map((u) => ({
    Property: u.property_name ?? "",
    Unit: u.unit_number ?? "",
    Tenant: u.tenant_name ?? "Vacant",
    MonthlyRent: toMoney(Number(u.rent_amount || 0)),
    Charges: toMoney(Number(u.total_charges || 0)),
    Allocated: toMoney(Number(u.total_allocated || 0)),
    Balance: toMoney(Number(u.balance || 0)),
    Status: u.payment_status ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rentRollRows), "Rent Roll");

  const paymentRows = payload.payments.map((p) => ({
    Date: p.payment_date,
    Amount: toMoney(Number(p.amount || 0)),
    PaymentMonth: p.payment_month ?? "",
    MpesaCode: p.mpesa_code ?? "",
    Notes: p.note ?? "",
    TenantId: p.tenant_id ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "Collections");

  const expenseRows = payload.expenses.map((e) => ({
    Date: e.expense_date,
    Category: e.expense_categories?.name ?? "Other",
    Property: e.properties?.name ?? "",
    Unit: e.units?.unit_number ?? "",
    Description: e.description ?? "",
    Amount: toMoney(Number(e.amount || 0)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), "Expenses");
};

export async function exportLandlordOperationsPackExcel(payload: ExportPayload) {
  const wb = XLSX.utils.book_new();
  const period = payload.monthKey ?? "all_time";

  buildCoreSheets(wb, payload);

  const arrearsRows = payload.units
    .filter((u) => Number(u.balance || 0) > 0)
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
    .map((u, index) => ({
      Rank: index + 1,
      Property: u.property_name ?? "",
      Unit: u.unit_number ?? "",
      Tenant: u.tenant_name ?? "",
      Balance: toMoney(Number(u.balance || 0)),
      MonthlyRent: toMoney(Number(u.rent_amount || 0)),
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arrearsRows), "Arrears");

  const riskRows = payload.topRiskTenants.map((t, i) => ({
    Rank: i + 1,
    Tenant: t.name,
    Property: t.property ?? "",
    Unit: t.unit ?? "",
    RiskLevel: t.level,
    RiskScore: t.score,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riskRows), "Risk");

  const reminderRows = payload.reminders.map((r) => ({
    TenantId: r.tenant_id,
    Status: r.status,
    Priority: r.priority,
    ScheduledFor: r.scheduled_for ?? "",
    Notes: r.notes ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reminderRows), "Reminders");

  XLSX.writeFile(wb, `landlord_operations_pack_${period}.xlsx`);
}

export async function exportLoanApplicationPackExcel(payload: ExportPayload) {
  const wb = XLSX.utils.book_new();
  const period = payload.monthKey ?? "all_time";

  const lenderRows = [
    { Field: "Period", Value: period },
    { Field: "Total Collections", Value: toMoney(payload.totalCollected) },
    { Field: "Total Expenses", Value: toMoney(payload.totalExpenses) },
    { Field: "Net Income", Value: toMoney(payload.netIncome) },
    { Field: "Collection Rate (%)", Value: Number(payload.collectionRate.toFixed(1)) },
    { Field: "Occupancy Rate (%)", Value: Number(payload.occupancyRate.toFixed(1)) },
    { Field: "Expected Rent", Value: toMoney(payload.expectedRent) },
    { Field: "Outstanding Balance", Value: toMoney(payload.outstandingBalance) },
    { Field: "Total Active Units", Value: payload.units.length },
    { Field: "Top Risk Tenants", Value: payload.topRiskTenants.length },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lenderRows), "Loan Snapshot");

  const incomeRows = payload.payments.map((p) => ({
    Date: p.payment_date,
    Amount: toMoney(Number(p.amount || 0)),
    Reference: p.mpesa_code ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), "Income Evidence");

  const costRows = payload.expenses.map((e) => ({
    Date: e.expense_date,
    Category: e.expense_categories?.name ?? "Other",
    Description: e.description ?? "",
    Amount: toMoney(Number(e.amount || 0)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costRows), "Cost Evidence");

  XLSX.writeFile(wb, `loan_application_pack_${period}.xlsx`);
}

export async function exportTenantLedgerExcel(payload: ExportPayload) {
  const wb = XLSX.utils.book_new();
  const period = payload.monthKey ?? "all_time";

  const tenantMap = new Map<string, { name: string; property: string; unit: string; rent: number; charges: number; allocated: number; balance: number }>();
  payload.units.forEach((u) => {
    if (!u.tenant_id) return;
    tenantMap.set(u.tenant_id, {
      name: u.tenant_name ?? "Tenant",
      property: u.property_name ?? "",
      unit: u.unit_number ?? "",
      rent: Number(u.rent_amount || 0),
      charges: Number(u.total_charges || 0),
      allocated: Number(u.total_allocated || 0),
      balance: Number(u.balance || 0),
    });
  });

  const paymentsByTenant = new Map<string, number>();
  payload.payments.forEach((p) => {
    const key = p.tenant_id ?? "";
    if (!key) return;
    paymentsByTenant.set(key, (paymentsByTenant.get(key) || 0) + Number(p.amount || 0));
  });

  const rows = [...tenantMap.entries()]
    .map(([tenantId, t], index) => ({
      Rank: index + 1,
      TenantId: tenantId,
      Tenant: t.name,
      Property: t.property,
      Unit: t.unit,
      MonthlyRent: toMoney(t.rent),
      Charges: toMoney(t.charges),
      Allocated: toMoney(t.allocated),
      Balance: toMoney(t.balance),
      PaymentsLogged: toMoney(paymentsByTenant.get(tenantId) || 0),
      Status: t.balance <= 0 ? "Paid/Overpaid" : t.balance < t.rent ? "Partial" : "Unpaid",
    }))
    .sort((a, b) => b.Balance - a.Balance);

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Tenant Ledger");
  XLSX.writeFile(wb, `tenant_ledger_${period}.xlsx`);
}

export async function exportPropertyPerformancePackExcel(payload: ExportPayload) {
  const wb = XLSX.utils.book_new();
  const period = payload.monthKey ?? "all_time";

  const map = new Map<string, { units: number; occupied: number; expected: number; charges: number; allocated: number; arrears: number }>();
  payload.units.forEach((u) => {
    const key = u.property_name ?? "Unknown Property";
    const row = map.get(key) || { units: 0, occupied: 0, expected: 0, charges: 0, allocated: 0, arrears: 0 };
    row.units += 1;
    if (u.tenant_name) row.occupied += 1;
    row.expected += Number(u.rent_amount || 0);
    row.charges += Number(u.total_charges || 0);
    row.allocated += Number(u.total_allocated || 0);
    row.arrears += Math.max(0, Number(u.balance || 0));
    map.set(key, row);
  });

  const byPropertyRows = [...map.entries()].map(([property, r]) => ({
    Property: property,
    Units: r.units,
    OccupiedUnits: r.occupied,
    OccupancyRate: Number((r.units > 0 ? (r.occupied / r.units) * 100 : 0).toFixed(1)),
    ExpectedRent: toMoney(r.expected),
    Charges: toMoney(r.charges),
    Collected: toMoney(r.allocated),
    CollectionRate: Number((r.charges > 0 ? (r.allocated / r.charges) * 100 : 0).toFixed(1)),
    Arrears: toMoney(r.arrears),
  }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byPropertyRows), "Property Performance");

  const expensesByProperty = new Map<string, number>();
  payload.expenses.forEach((e) => {
    const key = e.properties?.name ?? "Unknown Property";
    expensesByProperty.set(key, (expensesByProperty.get(key) || 0) + Number(e.amount || 0));
  });
  const expenseRows = [...expensesByProperty.entries()].map(([property, amount]) => ({
    Property: property,
    TotalExpenses: toMoney(amount),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), "Property Expenses");

  XLSX.writeFile(wb, `property_performance_pack_${period}.xlsx`);
}

export async function exportMasterBusinessPackExcel(payload: ExportPayload) {
  const wb = XLSX.utils.book_new();
  const period = payload.monthKey ?? "all_time";

  buildCoreSheets(wb, payload);

  const arrearsRows = payload.units
    .filter((u) => Number(u.balance || 0) > 0)
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
    .map((u, index) => ({
      Rank: index + 1,
      Property: u.property_name ?? "",
      Unit: u.unit_number ?? "",
      Tenant: u.tenant_name ?? "",
      Balance: toMoney(Number(u.balance || 0)),
      MonthlyRent: toMoney(Number(u.rent_amount || 0)),
      PaymentStatus: toTitle(String(u.payment_status || "unknown")),
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arrearsRows), "Arrears");

  const byProperty = new Map<string, { units: number; occupied: number; expected: number; charges: number; allocated: number; arrears: number }>();
  payload.units.forEach((u) => {
    const key = u.property_name ?? "Unknown Property";
    const row = byProperty.get(key) || { units: 0, occupied: 0, expected: 0, charges: 0, allocated: 0, arrears: 0 };
    row.units += 1;
    if (u.tenant_name) row.occupied += 1;
    row.expected += Number(u.rent_amount || 0);
    row.charges += Number(u.total_charges || 0);
    row.allocated += Number(u.total_allocated || 0);
    row.arrears += Math.max(0, Number(u.balance || 0));
    byProperty.set(key, row);
  });
  const propertyRows = [...byProperty.entries()].map(([property, r]) => ({
    Property: property,
    Units: r.units,
    OccupiedUnits: r.occupied,
    OccupancyRate: Number((r.units > 0 ? (r.occupied / r.units) * 100 : 0).toFixed(1)),
    ExpectedRent: toMoney(r.expected),
    Charges: toMoney(r.charges),
    Collected: toMoney(r.allocated),
    CollectionRate: Number((r.charges > 0 ? (r.allocated / r.charges) * 100 : 0).toFixed(1)),
    Arrears: toMoney(r.arrears),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(propertyRows), "Property Performance");

  const riskRows = payload.topRiskTenants.map((t, i) => ({
    Rank: i + 1,
    Tenant: t.name,
    Property: t.property ?? "",
    Unit: t.unit ?? "",
    RiskLevel: t.level,
    RiskScore: t.score,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riskRows), "Risk");

  const reminderRows = payload.reminders.map((r) => ({
    TenantId: r.tenant_id,
    Status: r.status,
    Priority: r.priority,
    ScheduledFor: r.scheduled_for ?? "",
    Notes: r.notes ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reminderRows), "Reminders");

  XLSX.writeFile(wb, `master_business_pack_${period}.xlsx`);
}

const printHtmlDocument = (title: string, body: string) => {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin: 18px 0 8px; }
    .muted { color: #6b7280; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; margin-top: 12px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
    .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px; font-size: 12px; text-align: left; }
    th { background: #f9fafb; }
    @media print { body { margin: 10mm; } .page-break { page-break-before: always; } }
  </style>
</head>
<body>${body}</body>
</html>`;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!popup) throw new Error("Popup blocked. Allow popups to print PDF layout.");
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
};

export async function printLoanPackLayout(payload: ExportPayload) {
  const period = payload.monthKey ?? "all_time";
  const body = `
    <h1>Loan Application Pack</h1>
    <p class="muted">Period: ${period}</p>
    <div class="grid">
      <div class="card"><div class="label">Collections</div><div class="value">KES ${toMoney(payload.totalCollected).toLocaleString()}</div></div>
      <div class="card"><div class="label">Expenses</div><div class="value">KES ${toMoney(payload.totalExpenses).toLocaleString()}</div></div>
      <div class="card"><div class="label">Net Income</div><div class="value">KES ${toMoney(payload.netIncome).toLocaleString()}</div></div>
      <div class="card"><div class="label">Collection Rate</div><div class="value">${payload.collectionRate.toFixed(1)}%</div></div>
      <div class="card"><div class="label">Occupancy Rate</div><div class="value">${payload.occupancyRate.toFixed(1)}%</div></div>
      <div class="card"><div class="label">Outstanding</div><div class="value">KES ${toMoney(payload.outstandingBalance).toLocaleString()}</div></div>
    </div>
    <h2>Top Arrears</h2>
    <table><thead><tr><th>Tenant</th><th>Property</th><th>Unit</th><th>Balance</th></tr></thead><tbody>
    ${payload.units.filter((u) => Number(u.balance || 0) > 0).sort((a,b)=>Number(b.balance||0)-Number(a.balance||0)).slice(0,10).map((u)=>`<tr><td>${u.tenant_name ?? ""}</td><td>${u.property_name ?? ""}</td><td>${u.unit_number ?? ""}</td><td>KES ${toMoney(Number(u.balance || 0)).toLocaleString()}</td></tr>`).join("")}
    </tbody></table>
  `;
  printHtmlDocument("Loan Application Pack", body);
}

export async function printMasterPackLayout(payload: ExportPayload) {
  const period = payload.monthKey ?? "all_time";
  const body = `
    <h1>Master Business Pack</h1>
    <p class="muted">Period: ${period}</p>
    <div class="grid">
      <div class="card"><div class="label">Collections</div><div class="value">KES ${toMoney(payload.totalCollected).toLocaleString()}</div></div>
      <div class="card"><div class="label">Expenses</div><div class="value">KES ${toMoney(payload.totalExpenses).toLocaleString()}</div></div>
      <div class="card"><div class="label">Net Income</div><div class="value">KES ${toMoney(payload.netIncome).toLocaleString()}</div></div>
      <div class="card"><div class="label">Collection Rate</div><div class="value">${payload.collectionRate.toFixed(1)}%</div></div>
      <div class="card"><div class="label">Occupancy Rate</div><div class="value">${payload.occupancyRate.toFixed(1)}%</div></div>
      <div class="card"><div class="label">Outstanding</div><div class="value">KES ${toMoney(payload.outstandingBalance).toLocaleString()}</div></div>
    </div>
    <h2>Rent Roll</h2>
    <table><thead><tr><th>Property</th><th>Unit</th><th>Tenant</th><th>Rent</th><th>Balance</th></tr></thead><tbody>
    ${payload.units.map((u)=>`<tr><td>${u.property_name ?? ""}</td><td>${u.unit_number ?? ""}</td><td>${u.tenant_name ?? "Vacant"}</td><td>KES ${toMoney(Number(u.rent_amount || 0)).toLocaleString()}</td><td>KES ${toMoney(Number(u.balance || 0)).toLocaleString()}</td></tr>`).join("")}
    </tbody></table>
    <div class="page-break"></div>
    <h2>Collections</h2>
    <table><thead><tr><th>Date</th><th>Amount</th><th>Reference</th></tr></thead><tbody>
    ${payload.payments.map((p)=>`<tr><td>${p.payment_date}</td><td>KES ${toMoney(Number(p.amount || 0)).toLocaleString()}</td><td>${p.mpesa_code ?? ""}</td></tr>`).join("")}
    </tbody></table>
    <h2>Expenses</h2>
    <table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>
    ${payload.expenses.map((e)=>`<tr><td>${e.expense_date}</td><td>${e.expense_categories?.name ?? "Other"}</td><td>${e.description ?? ""}</td><td>KES ${toMoney(Number(e.amount || 0)).toLocaleString()}</td></tr>`).join("")}
    </tbody></table>
  `;
  printHtmlDocument("Master Business Pack", body);
}
