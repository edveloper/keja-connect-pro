import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonthKey,
  formatMonthLabel,
  isFutureMonth,
  isMonthKey,
  monthKeyToDate,
  monthRange,
  parseDateKey,
  toDateKey,
  toMonthKey,
} from "./month";

// These tests are the regression guard for F1. The suite runs under
// TZ=Africa/Nairobi (set in vite.config.ts) so a reintroduced toISOString()
// fails here rather than silently shifting every charge by one month.

describe("toMonthKey", () => {
  it("uses the local calendar month, not UTC", () => {
    // Local midnight on 1 Aug in UTC+3 is 21:00 on 31 Jul in UTC.
    expect(toMonthKey(new Date(2026, 7, 1))).toBe("2026-08");
  });

  it("holds at the last instant of a month", () => {
    expect(toMonthKey(new Date(2026, 7, 31, 23, 59, 59))).toBe("2026-08");
  });

  it("pads single-digit months", () => {
    expect(toMonthKey(new Date(2026, 0, 15))).toBe("2026-01");
    expect(toMonthKey(new Date(2026, 8, 15))).toBe("2026-09");
  });
});

describe("toDateKey", () => {
  it("uses the local calendar date", () => {
    expect(toDateKey(new Date(2026, 7, 1))).toBe("2026-08-01");
    expect(toDateKey(new Date(2026, 11, 31, 23, 30))).toBe("2026-12-31");
  });
});

describe("parseDateKey", () => {
  it("round-trips a date key without shifting the day", () => {
    expect(toDateKey(parseDateKey("2026-08-01"))).toBe("2026-08-01");
    expect(toDateKey(parseDateKey("2026-01-01"))).toBe("2026-01-01");
  });

  it("keeps the calendar month a lease start falls in", () => {
    expect(toMonthKey(parseDateKey("2026-01-15"))).toBe("2026-01");
  });

  it("tolerates a full timestamp", () => {
    expect(toDateKey(parseDateKey("2026-08-17T10:30:00"))).toBe("2026-08-17");
  });

  it("returns an invalid date for junk", () => {
    expect(Number.isNaN(parseDateKey("not-a-date").getTime())).toBe(true);
  });
});

describe("addMonths", () => {
  it("moves forward and backward", () => {
    expect(addMonths("2026-08", 1)).toBe("2026-09");
    expect(addMonths("2026-08", -1)).toBe("2026-07");
  });

  it("crosses year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("handles multi-month jumps", () => {
    expect(addMonths("2026-08", 12)).toBe("2027-08");
    expect(addMonths("2026-08", -12)).toBe("2025-08");
  });
});

describe("monthRange", () => {
  it("is inclusive of both ends", () => {
    expect(monthRange("2026-01", "2026-04")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  it("returns a single month when start equals end", () => {
    expect(monthRange("2026-08", "2026-08")).toEqual(["2026-08"]);
  });

  it("returns empty when start is after end", () => {
    expect(monthRange("2026-09", "2026-08")).toEqual([]);
  });

  it("spans a year boundary", () => {
    expect(monthRange("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("covers a lease from January to the current month with no gaps or drift", () => {
    // The F1 regression case: lease_start 2026-01-15, backfilled on 2026-08-17.
    const months = monthRange(toMonthKey(parseDateKey("2026-01-15")), "2026-08");
    expect(months[0]).toBe("2026-01");
    expect(months.at(-1)).toBe("2026-08");
    expect(months).toHaveLength(8);
    expect(months).not.toContain("2025-12");
  });
});

describe("isMonthKey", () => {
  it("accepts well-formed keys", () => {
    expect(isMonthKey("2026-01")).toBe(true);
    expect(isMonthKey("2026-12")).toBe(true);
  });

  it("rejects malformed keys", () => {
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-8")).toBe(false);
    expect(isMonthKey("2026-08-01")).toBe(false);
    expect(isMonthKey(null)).toBe(false);
  });
});

describe("monthKeyToDate", () => {
  it("returns the first of the month in local time", () => {
    const d = monthKeyToDate("2026-08");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });
});

describe("isFutureMonth", () => {
  it("is false for the current month and true for the next one", () => {
    const now = currentMonthKey();
    expect(isFutureMonth(now)).toBe(false);
    expect(isFutureMonth(addMonths(now, 1))).toBe(true);
    expect(isFutureMonth(addMonths(now, -1))).toBe(false);
  });
});

describe("formatMonthLabel", () => {
  it("renders a readable month and year", () => {
    expect(formatMonthLabel("2026-08")).toContain("2026");
    expect(formatMonthLabel("2026-08")).toMatch(/August/i);
  });
});
