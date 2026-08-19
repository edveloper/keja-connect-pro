// src/lib/monthly-summary.ts
//
// The written month-end summary.
//
// This replaced an LLM-generated narrative that called a local Ollama server
// from the browser. On a deployed HTTPS site that request is blocked as mixed
// content and by CORS, and it also required the landlord to be running Ollama
// on their own machine — so the panel read "Offline" for every real user.
//
// The figures were always deterministic anyway. Writing the sentences directly
// means the summary is correct, instant, free, and works on a phone with no
// connection to anything but the database.

import { formatKES } from "@/lib/number-formatter";

export interface MonthlySummaryInput {
  periodLabel: string;
  /** Cash that arrived in the period. */
  cashReceived: number;
  /** Rent charged for the period. */
  billed: number;
  /** Money applied against those charges. */
  applied: number;
  expenses: number;
  arrears: number;
  credit: number;
  occupiedUnits: number;
  totalUnits: number;
  tenantsInArrears: number;
  topExpenseCategory: { name: string; amount: number } | null;
  /** The same figures for the previous period, when there is one. */
  previous?: { cashReceived: number; expenses: number } | null;
}

export interface MonthlySummary {
  headline: string;
  paragraphs: string[];
  /** Things worth acting on, most important first. */
  actions: string[];
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function buildMonthlySummary(input: MonthlySummaryInput): MonthlySummary {
  const net = input.cashReceived - input.expenses;
  const collectionRate = pct(input.applied, input.billed);
  const occupancy = pct(input.occupiedUnits, input.totalUnits);

  const headline =
    net >= 0
      ? `${input.periodLabel}: ${formatKES(net)} surplus`
      : `${input.periodLabel}: ${formatKES(Math.abs(net))} shortfall`;

  const paragraphs: string[] = [];

  // 1. What happened to the money.
  const movement = (() => {
    if (!input.previous) return "";
    const delta = input.cashReceived - input.previous.cashReceived;
    if (Math.abs(delta) < 1) return " That is level with last month.";
    return delta > 0
      ? ` That is ${formatKES(delta)} more than last month.`
      : ` That is ${formatKES(Math.abs(delta))} less than last month.`;
  })();

  paragraphs.push(
    `You collected ${formatKES(input.cashReceived)} and spent ` +
      `${formatKES(input.expenses)}, leaving ` +
      `${net >= 0 ? "a surplus of " : "a shortfall of "}${formatKES(Math.abs(net))}.` +
      movement
  );

  // 2. How the rent roll actually performed.
  if (input.billed > 0) {
    paragraphs.push(
      `Of the ${formatKES(input.billed)} billed, ${formatKES(input.applied)} has been ` +
        `settled — ${collectionRate}% of the rent roll. ` +
        (input.arrears > 0
          ? `${formatKES(input.arrears)} is still outstanding across ` +
            `${input.tenantsInArrears} ${plural(input.tenantsInArrears, "tenant", "tenants")}.`
          : `Every tenant is up to date.`)
    );
  } else {
    paragraphs.push(
      `No rent was billed for this period. If that is unexpected, check that your ` +
        `tenants have a lease start date and a monthly rent set.`
    );
  }

  // 3. Occupancy and costs.
  const occupancyLine =
    input.totalUnits > 0
      ? `${input.occupiedUnits} of ${input.totalUnits} units are occupied (${occupancy}%).`
      : `You have not added any units yet.`;

  const expenseLine = input.topExpenseCategory
    ? ` Your largest cost was ${input.topExpenseCategory.name} at ` +
      `${formatKES(input.topExpenseCategory.amount)}, ` +
      `${pct(input.topExpenseCategory.amount, input.expenses)}% of everything you spent.`
    : input.expenses === 0
      ? ` You recorded no expenses this period.`
      : "";

  paragraphs.push(occupancyLine + expenseLine);

  // 4. What to do next, ordered by what costs the most to ignore.
  const actions: string[] = [];

  if (input.arrears > 0) {
    actions.push(
      `Chase ${formatKES(input.arrears)} in arrears from ` +
        `${input.tenantsInArrears} ${plural(input.tenantsInArrears, "tenant", "tenants")}.`
    );
  }
  if (input.totalUnits > input.occupiedUnits) {
    const vacant = input.totalUnits - input.occupiedUnits;
    actions.push(
      `Fill ${vacant} vacant ${plural(vacant, "unit", "units")} — each empty month is ` +
        `rent you cannot recover.`
    );
  }
  if (input.billed > 0 && collectionRate < 70) {
    actions.push(
      `Collection is at ${collectionRate}%. Below 70% usually means reminders are ` +
        `going out too late in the month.`
    );
  }
  if (net < 0) {
    actions.push(
      `You spent more than you collected. Check whether a large one-off cost landed ` +
        `this month or whether collections slipped.`
    );
  }
  if (input.credit > 0) {
    actions.push(
      `${formatKES(input.credit)} is sitting as tenant credit and will be applied to ` +
        `next month's rent automatically.`
    );
  }
  if (actions.length === 0) {
    actions.push(`Nothing needs attention. Rent is collected and every unit is let.`);
  }

  return { headline, paragraphs, actions };
}
