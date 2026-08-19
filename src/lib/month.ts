// src/lib/month.ts
//
// All month and date keys in this app are LOCAL-time based.
//
// Do not use `Date.prototype.toISOString()` to derive a month or a date key.
// It converts to UTC first, so in Kenya (UTC+3) local midnight on the 1st of a
// month becomes 21:00 on the last day of the *previous* month, and every key
// comes out one month early.

/** A calendar month in `YYYY-MM` form, e.g. "2026-08". */
export type MonthKey = string;

/** A calendar date in `YYYY-MM-DD` form, e.g. "2026-08-17". */
export type DateKey = string;

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local-time `YYYY-MM` for a date. */
export function toMonthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** Local-time `YYYY-MM-DD` for a date. */
export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The current calendar month, in local time. */
export function currentMonthKey(): MonthKey {
  return toMonthKey(new Date());
}

/** Today's date, in local time. */
export function currentDateKey(): DateKey {
  return toDateKey(new Date());
}

/** True if `value` is a well-formed `YYYY-MM` key. */
export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && MONTH_KEY_PATTERN.test(value);
}

/** The first day of a month, as a local-time Date. */
export function monthKeyToDate(monthKey: MonthKey): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * Parse a `YYYY-MM-DD` string as a local-time Date.
 *
 * `new Date("2026-08-17")` parses as UTC midnight, which is the previous day in
 * any timezone west of Greenwich and shifts the clock in every other one. This
 * keeps the calendar date the user actually typed.
 */
export function parseDateKey(value: string): Date {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return new Date(NaN);
  return new Date(year, month - 1, day);
}

/** Shift a month key by `delta` months (negative goes backwards). */
export function addMonths(monthKey: MonthKey, delta: number): MonthKey {
  const date = monthKeyToDate(monthKey);
  date.setMonth(date.getMonth() + delta);
  return toMonthKey(date);
}

/**
 * Every month key from `start` to `end` inclusive, ascending.
 * Returns an empty array if `start` is after `end`.
 */
export function monthRange(start: MonthKey, end: MonthKey): MonthKey[] {
  if (start > end) return [];
  const months: MonthKey[] = [];
  const cursor = monthKeyToDate(start);
  const last = monthKeyToDate(end);
  while (cursor <= last) {
    months.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

/**
 * Month keys are zero-padded and fixed-width, so lexical order is chronological
 * order. This exists so call sites read as intent rather than a bare `<`.
 */
export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** True if `monthKey` is later than the current month. */
export function isFutureMonth(monthKey: MonthKey): boolean {
  return monthKey > currentMonthKey();
}

/** A human label for a month key, e.g. "August 2026". */
export function formatMonthLabel(monthKey: MonthKey): string {
  return monthKeyToDate(monthKey).toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });
}
