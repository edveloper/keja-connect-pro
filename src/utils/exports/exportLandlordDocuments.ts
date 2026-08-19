// src/utils/exports/exportLandlordDocuments.ts
//
// Two exports, each with a distinct job.
//
//   Operations Pack — everything about the current period, for the landlord.
//   Lender Pack     — twelve months of income history, for a bank.
//
// This file previously offered seven. Five of them (Operations, Loan, Tenant
// Ledger, Property and Master) received an identical payload and differed only
// in sheet names. Operations Pack is the merge of those five and is a superset
// of the old Master Pack: summary, rent roll, arrears, collections, expenses,
// per-property performance, reminders and risk.
//
// The lender pack is the one that changed most: it used to be a single-month
// snapshot, which no bank will accept as evidence of rental income.

import * as XLSX from "xlsx";

type UnitRow = {
  id?: string;
  tenant_id?: string | null;
  property_name?: string | null;
  unit_number?: string | null;
  tenant_name?: string | null;
  tenant_phone?: string | null;
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

export type OperationsPackPayload = {
  monthKey: string | null;
  periodLabel: string;
  businessName?: string | null;
  cashReceived: number;
  billed: number;
  applied: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  occupancyRate: number;
  outstandingBalance: number;
  units: UnitRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  topRiskTenants: RiskTenant[];
  reminders?: ReminderRow[];
  /** Tenant id -> display name, for sheets that only carry ids. */
  tenantNames?: Record<string, string>;
};

export type LenderPackPayload = {
  businessName?: string | null;
  from: string;
  to: string;
  months: Array<{
    month: string;
    label: string;
    billed: number;
    collected: number;
    expenses: number;
    net: number;
  }>;
  totalBilled: number;
  totalCollected: number;
  totalExpenses: number;
  totalNet: number;
  averageMonthlyNet: number;
  collectionRate: number;
  profitableMonths: number;
  units: UnitRow[];
};

const money = (v: unknown) => Math.round(Number(v || 0));
const rate = (v: number) => Number(v.toFixed(1));

function sheet(wb: XLSX.WorkBook, name: string, rows: object[]) {
  // Excel sheet names are capped at 31 characters and cannot be empty.
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Note: "No records for this period" }]),
    name.slice(0, 31)
  );
}

/**
 * Everything about one period: KPIs, rent roll, arrears, collections, costs.
 * This is the landlord's own month-end file.
 */
export async function exportOperationsPack(payload: OperationsPackPayload) {
  const wb = XLSX.utils.book_new();
  const period = payload.monthKey ?? "all_time";

  sheet(wb, "Summary", [
    { Metric: "Period", Value: payload.periodLabel },
    ...(payload.businessName ? [{ Metric: "Landlord", Value: payload.businessName }] : []),
    { Metric: "Cash Received", Value: money(payload.cashReceived) },
    { Metric: "Expenses Paid", Value: money(payload.totalExpenses) },
    { Metric: "Net Income", Value: money(payload.netIncome) },
    { Metric: "Rent Billed", Value: money(payload.billed) },
    { Metric: "Applied To Billed Rent", Value: money(payload.applied) },
    { Metric: "Arrears Outstanding", Value: money(payload.outstandingBalance) },
    { Metric: "Collection Rate (%)", Value: rate(payload.collectionRate) },
    { Metric: "Occupancy Rate (%)", Value: rate(payload.occupancyRate) },
  ]);

  sheet(
    wb,
    "Rent Roll",
    payload.units.map((u) => ({
      Property: u.property_name ?? "",
      Unit: u.unit_number ?? "",
      Tenant: u.tenant_name ?? "Vacant",
      Phone: u.tenant_phone ?? "",
      MonthlyRent: money(u.rent_amount),
      Billed: money(u.total_charges),
      Paid: money(u.total_allocated),
      Balance: money(u.balance),
      Status: u.payment_status ?? "",
    }))
  );

  sheet(
    wb,
    "Arrears",
    payload.units
      .filter((u) => Number(u.balance || 0) > 0)
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
      .map((u, index) => ({
        Rank: index + 1,
        Property: u.property_name ?? "",
        Unit: u.unit_number ?? "",
        Tenant: u.tenant_name ?? "",
        Phone: u.tenant_phone ?? "",
        Balance: money(u.balance),
        MonthlyRent: money(u.rent_amount),
        MonthsBehind:
          Number(u.rent_amount || 0) > 0
            ? Math.floor(Number(u.balance || 0) / Number(u.rent_amount))
            : "",
      }))
  );

  sheet(
    wb,
    "Collections",
    payload.payments.map((p) => ({
      Date: p.payment_date?.slice(0, 10) ?? "",
      Amount: money(p.amount),
      RentMonth: p.payment_month ?? "",
      MpesaCode: p.mpesa_code ?? "",
      Notes: p.note ?? "",
    }))
  );

  sheet(
    wb,
    "Expenses",
    payload.expenses.map((e) => ({
      Date: e.expense_date?.slice(0, 10) ?? "",
      Category: e.expense_categories?.name ?? "Other",
      Property: e.properties?.name ?? "",
      Unit: e.units?.unit_number ?? "",
      Description: e.description ?? "",
      Amount: money(e.amount),
    }))
  );

  // Per-property breakdown. This was the Master Pack's distinguishing sheet and
  // is the reason to reach for this export when you run more than one building.
  const byProperty = new Map<
    string,
    { units: number; occupied: number; rent: number; billed: number; paid: number; arrears: number }
  >();
  payload.units.forEach((u) => {
    const key = u.property_name ?? "Unknown Property";
    const row =
      byProperty.get(key) ?? { units: 0, occupied: 0, rent: 0, billed: 0, paid: 0, arrears: 0 };
    row.units += 1;
    if (u.tenant_id) row.occupied += 1;
    row.rent += money(u.rent_amount);
    row.billed += money(u.total_charges);
    row.paid += money(u.total_allocated);
    row.arrears += Math.max(0, money(u.balance));
    byProperty.set(key, row);
  });

  sheet(
    wb,
    "Property Performance",
    [...byProperty.entries()].map(([property, r]) => ({
      Property: property,
      Units: r.units,
      Occupied: r.occupied,
      Vacant: r.units - r.occupied,
      OccupancyRatePct: r.units > 0 ? rate((r.occupied / r.units) * 100) : 0,
      MonthlyRentRoll: r.rent,
      Billed: r.billed,
      Paid: r.paid,
      Arrears: r.arrears,
      CollectionRatePct: r.billed > 0 ? rate((r.paid / r.billed) * 100) : 0,
    }))
  );

  if (payload.reminders && payload.reminders.length > 0) {
    sheet(
      wb,
      "Reminders",
      payload.reminders.map((r) => ({
        Tenant: payload.tenantNames?.[r.tenant_id] ?? r.tenant_id,
        Status: r.status,
        Priority: r.priority,
        ScheduledFor: r.scheduled_for?.slice(0, 10) ?? "",
        Notes: r.notes ?? "",
      }))
    );
  }

  if (payload.topRiskTenants.length > 0) {
    sheet(
      wb,
      "Risk",
      payload.topRiskTenants.map((t, i) => ({
        Rank: i + 1,
        Tenant: t.name,
        Property: t.property ?? "",
        Unit: t.unit ?? "",
        RiskLevel: t.level,
        RiskScore: t.score,
      }))
    );
  }

  XLSX.writeFile(wb, `operations_pack_${period}.xlsx`);
}

/**
 * Twelve months of income history in the shape a lender asks for: a monthly
 * series, the averages they underwrite against, and the rent roll behind it.
 */
export async function exportLenderPack(payload: LenderPackPayload) {
  const wb = XLSX.utils.book_new();

  sheet(wb, "Income Summary", [
    ...(payload.businessName ? [{ Field: "Landlord", Value: payload.businessName }] : []),
    { Field: "Period From", Value: payload.from },
    { Field: "Period To", Value: payload.to },
    { Field: "Months Covered", Value: payload.months.length },
    { Field: "Total Rent Billed", Value: money(payload.totalBilled) },
    { Field: "Total Rent Collected", Value: money(payload.totalCollected) },
    { Field: "Total Expenses", Value: money(payload.totalExpenses) },
    { Field: "Total Net Income", Value: money(payload.totalNet) },
    { Field: "Average Monthly Net Income", Value: money(payload.averageMonthlyNet) },
    { Field: "Collection Rate (%)", Value: rate(payload.collectionRate) },
    { Field: "Profitable Months", Value: `${payload.profitableMonths} of ${payload.months.length}` },
    { Field: "Units In Portfolio", Value: payload.units.length },
    {
      Field: "Units Occupied",
      Value: payload.units.filter((u) => u.tenant_id).length,
    },
  ]);

  sheet(
    wb,
    "Monthly History",
    payload.months.map((m) => ({
      Month: m.month,
      Period: m.label,
      RentBilled: m.billed,
      RentCollected: m.collected,
      Expenses: m.expenses,
      NetIncome: m.net,
    }))
  );

  sheet(
    wb,
    "Rent Roll",
    payload.units.map((u) => ({
      Property: u.property_name ?? "",
      Unit: u.unit_number ?? "",
      Status: u.tenant_id ? "Occupied" : "Vacant",
      MonthlyRent: money(u.rent_amount),
      CurrentBalance: money(u.balance),
    }))
  );

  XLSX.writeFile(wb, `lender_pack_${payload.from}_to_${payload.to}.xlsx`);
}

/**
 * Opens the lender pack as a print layout so it can be saved as a PDF, which is
 * what most Kenyan banks actually accept over the counter.
 */
export async function printLenderPack(payload: LenderPackPayload) {
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Your browser blocked the print window. Allow pop-ups and try again.");
  }

  const fmt = (v: number) => `KES ${money(v).toLocaleString("en-KE")}`;

  const rows = payload.months
    .map(
      (m) => `<tr>
        <td>${m.label}</td>
        <td class="n">${money(m.billed).toLocaleString("en-KE")}</td>
        <td class="n">${money(m.collected).toLocaleString("en-KE")}</td>
        <td class="n">${money(m.expenses).toLocaleString("en-KE")}</td>
        <td class="n ${m.net >= 0 ? "pos" : "neg"}">${money(m.net).toLocaleString("en-KE")}</td>
      </tr>`
    )
    .join("");

  win.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Rental Income Statement</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #555; font-size: 13px; margin: 0 0 24px; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #ddd;
          border: 1px solid #ddd; margin-bottom: 24px; }
  .kpi { background: #fff; padding: 10px 12px; }
  .kpi .l { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #666; }
  .kpi .v { font-size: 16px; font-weight: bold; margin-top: 2px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e4e4e4; text-align: left; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #666;
       border-bottom: 1px solid #999; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  .pos { color: #14683f; } .neg { color: #a3141c; }
  tfoot td { font-weight: bold; border-top: 2px solid #111; border-bottom: none; }
  .foot { margin-top: 28px; font-size: 11px; color: #666; }
  @media print { body { margin: 12mm; } }
</style></head><body>
  <h1>Rental Income Statement</h1>
  <p class="sub">${payload.businessName ? `${payload.businessName} &middot; ` : ""}${payload.from} to ${payload.to} &middot; ${payload.months.length} months</p>

  <div class="kpis">
    <div class="kpi"><div class="l">Total Collected</div><div class="v">${fmt(payload.totalCollected)}</div></div>
    <div class="kpi"><div class="l">Total Expenses</div><div class="v">${fmt(payload.totalExpenses)}</div></div>
    <div class="kpi"><div class="l">Net Income</div><div class="v">${fmt(payload.totalNet)}</div></div>
    <div class="kpi"><div class="l">Average Monthly Net</div><div class="v">${fmt(payload.averageMonthlyNet)}</div></div>
    <div class="kpi"><div class="l">Collection Rate</div><div class="v">${rate(payload.collectionRate)}%</div></div>
    <div class="kpi"><div class="l">Profitable Months</div><div class="v">${payload.profitableMonths} / ${payload.months.length}</div></div>
  </div>

  <table>
    <thead><tr><th>Month</th><th class="n">Billed</th><th class="n">Collected</th><th class="n">Expenses</th><th class="n">Net</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td>Total</td>
      <td class="n">${money(payload.totalBilled).toLocaleString("en-KE")}</td>
      <td class="n">${money(payload.totalCollected).toLocaleString("en-KE")}</td>
      <td class="n">${money(payload.totalExpenses).toLocaleString("en-KE")}</td>
      <td class="n">${money(payload.totalNet).toLocaleString("en-KE")}</td>
    </tr></tfoot>
  </table>

  <p class="foot">
    Figures are on a cash basis: rent is counted in the month it was received, and expenses in
    the month they were paid. Generated by RentKonnect on ${new Date().toLocaleDateString("en-KE")}.
  </p>
</body></html>`);

  win.document.close();
  win.focus();
  win.print();
}
