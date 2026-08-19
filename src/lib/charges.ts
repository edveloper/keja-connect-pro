// src/lib/charges.ts
//
// One implementation of "which rent charges does this tenant owe, and for which
// months". This previously existed three times over (tenant creation, the
// spreadsheet import, and the legacy migration script), each copy carrying the
// same timezone defect.

import { currentMonthKey, monthRange, parseDateKey, toMonthKey, type MonthKey } from "@/lib/month";

export interface RentChargeSpec {
  /** Monthly rent in whole shillings. */
  rentAmount: number;
  /** Lease start as `YYYY-MM-DD`. */
  leaseStart: string;
  /** Whether the first month was agreed at a different (pro rata) amount. */
  isProrated?: boolean | null;
  /** The agreed first-month amount, when `isProrated` is set. */
  firstMonthOverride?: number | null;
  /** Bill up to and including this month. Defaults to the current month. */
  throughMonth?: MonthKey;
}

export interface RentCharge {
  amount: number;
  charge_month: MonthKey;
  type: "rent";
  note: string;
}

/**
 * Every rent charge from the lease start month through `throughMonth`, inclusive.
 *
 * Returns an empty array when rent is zero or the lease start is unusable,
 * rather than writing junk charges into the ledger.
 */
export function buildRentCharges(spec: RentChargeSpec): RentCharge[] {
  const rent = Math.round(Number(spec.rentAmount) || 0);
  if (rent <= 0) return [];

  const start = parseDateKey(spec.leaseStart);
  if (Number.isNaN(start.getTime())) return [];

  const startMonth = toMonthKey(start);
  const endMonth = spec.throughMonth ?? currentMonthKey();

  const override = Math.round(Number(spec.firstMonthOverride) || 0);
  const useOverride = Boolean(spec.isProrated) && override > 0;

  return monthRange(startMonth, endMonth).map((charge_month, index) => {
    const isFirstMonth = index === 0;
    const amount = isFirstMonth && useOverride ? override : rent;
    return {
      amount,
      charge_month,
      type: "rent" as const,
      note: isFirstMonth ? "First month rent" : "Monthly rent",
    };
  });
}

/**
 * Month keys that `existing` is missing relative to `desired`.
 * Used to top up a ledger without duplicating months that already have a charge.
 */
export function missingChargeMonths(
  desired: RentCharge[],
  existingMonths: Iterable<MonthKey>
): RentCharge[] {
  const have = new Set(existingMonths);
  return desired.filter((charge) => !have.has(charge.charge_month));
}
