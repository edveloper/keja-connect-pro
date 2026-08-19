import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatCurrency,
  formatKES,
  getResponsiveFontClass,
} from "./number-formatter";

describe("formatCurrency", () => {
  it("never abbreviates — this is the F8 regression guard", () => {
    // The old implementation rendered these as "1M" and "254K".
    expect(formatCurrency(1_250_000)).toBe("1,250,000");
    expect(formatCurrency(254_300)).toBe("254,300");
    expect(formatCurrency(999_999)).toBe("999,999");
  });

  it("separates thousands", () => {
    expect(formatCurrency(1_000)).toBe("1,000");
    expect(formatCurrency(25_000)).toBe("25,000");
  });

  it("handles zero, negatives, and small values", () => {
    expect(formatCurrency(0)).toBe("0");
    expect(formatCurrency(-5_000)).toBe("-5,000");
    expect(formatCurrency(45)).toBe("45");
  });

  it("rounds to whole shillings by default", () => {
    expect(formatCurrency(1500.6)).toBe("1,501");
  });

  it("shows cents on request", () => {
    expect(formatCurrency(1500.5, { showDecimals: true })).toBe("1,500.50");
  });

  it("degrades safely on non-numbers", () => {
    expect(formatCurrency(Number.NaN)).toBe("0");
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

describe("formatKES", () => {
  it("prefixes the currency", () => {
    expect(formatKES(1_250_000)).toBe("KES 1,250,000");
    expect(formatKES(0)).toBe("KES 0");
  });
});

describe("formatCompact", () => {
  it("abbreviates for axis ticks only", () => {
    expect(formatCompact(1_250_000)).toBe("1.3M");
    expect(formatCompact(254_300)).toBe("254K");
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(-25_000)).toBe("-25K");
  });
});

describe("getResponsiveFontClass", () => {
  it("shrinks as the figure grows", () => {
    expect(getResponsiveFontClass("25,000")).toBe("text-2xl");
    expect(getResponsiveFontClass("1,250,000")).toBe("text-xl");
    expect(getResponsiveFontClass("125,000,000")).toBe("text-lg");
  });
});
