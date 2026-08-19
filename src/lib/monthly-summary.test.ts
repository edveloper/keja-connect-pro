import { describe, expect, it } from "vitest";
import { buildMonthlySummary, type MonthlySummaryInput } from "./monthly-summary";

function input(over: Partial<MonthlySummaryInput> = {}): MonthlySummaryInput {
  return {
    periodLabel: "August 2026",
    cashReceived: 100000,
    billed: 120000,
    applied: 100000,
    expenses: 30000,
    arrears: 20000,
    credit: 0,
    occupiedUnits: 5,
    totalUnits: 6,
    tenantsInArrears: 2,
    topExpenseCategory: { name: "Repairs", amount: 18000 },
    previous: null,
    ...over,
  };
}

describe("buildMonthlySummary", () => {
  it("leads with the surplus", () => {
    const summary = buildMonthlySummary(input());
    expect(summary.headline).toBe("August 2026: KES 70,000 surplus");
  });

  it("leads with the shortfall when costs exceed collections", () => {
    const summary = buildMonthlySummary(input({ cashReceived: 10000, expenses: 30000 }));
    expect(summary.headline).toBe("August 2026: KES 20,000 shortfall");
  });

  it("states collections, expenses and the net", () => {
    const [first] = buildMonthlySummary(input()).paragraphs;
    expect(first).toContain("KES 100,000");
    expect(first).toContain("KES 30,000");
    expect(first).toContain("KES 70,000");
  });

  it("compares against the previous period when there is one", () => {
    const up = buildMonthlySummary(
      input({ previous: { cashReceived: 80000, expenses: 30000 } })
    );
    expect(up.paragraphs[0]).toContain("KES 20,000 more than last month");

    const down = buildMonthlySummary(
      input({ previous: { cashReceived: 130000, expenses: 30000 } })
    );
    expect(down.paragraphs[0]).toContain("KES 30,000 less than last month");
  });

  it("reports the collection rate against what was billed", () => {
    const summary = buildMonthlySummary(input({ billed: 120000, applied: 60000 }));
    expect(summary.paragraphs[1]).toContain("50% of the rent roll");
  });

  it("says so plainly when everyone has paid", () => {
    const summary = buildMonthlySummary(
      input({ arrears: 0, tenantsInArrears: 0, applied: 120000 })
    );
    expect(summary.paragraphs[1]).toContain("Every tenant is up to date");
  });

  it("flags a period where nothing was billed", () => {
    const summary = buildMonthlySummary(input({ billed: 0, applied: 0, arrears: 0 }));
    expect(summary.paragraphs[1]).toContain("No rent was billed");
    expect(summary.paragraphs[1]).toContain("lease start date");
  });

  it("names the largest cost and its share", () => {
    const summary = buildMonthlySummary(input());
    expect(summary.paragraphs[2]).toContain("Repairs");
    expect(summary.paragraphs[2]).toContain("60%");
  });

  it("orders actions with arrears first", () => {
    const summary = buildMonthlySummary(input());
    expect(summary.actions[0]).toContain("arrears");
    expect(summary.actions.some((a) => a.includes("vacant"))).toBe(true);
  });

  it("mentions credit carried into next month", () => {
    const summary = buildMonthlySummary(input({ credit: 5000 }));
    expect(summary.actions.some((a) => a.includes("KES 5,000") && a.includes("credit"))).toBe(
      true
    );
  });

  it("says nothing needs attention when nothing does", () => {
    const summary = buildMonthlySummary(
      input({
        arrears: 0,
        tenantsInArrears: 0,
        applied: 120000,
        occupiedUnits: 6,
        totalUnits: 6,
        cashReceived: 120000,
        expenses: 10000,
        credit: 0,
      })
    );
    expect(summary.actions).toEqual(["Nothing needs attention. Rent is collected and every unit is let."]);
  });

  it("uses singular wording for one tenant and one unit", () => {
    const summary = buildMonthlySummary(
      input({ tenantsInArrears: 1, occupiedUnits: 5, totalUnits: 6 })
    );
    expect(summary.actions[0]).toContain("1 tenant.");
    expect(summary.actions[1]).toContain("1 vacant unit");
  });

  it("never abbreviates money", () => {
    const summary = buildMonthlySummary(
      input({ cashReceived: 1250000, expenses: 250000, billed: 1500000, applied: 1250000 })
    );
    const text = [summary.headline, ...summary.paragraphs, ...summary.actions].join(" ");
    expect(text).toContain("KES 1,000,000");
    expect(text).not.toMatch(/KES \d+(\.\d+)?M/);
  });

  it("copes with an empty portfolio", () => {
    const summary = buildMonthlySummary(
      input({
        cashReceived: 0,
        billed: 0,
        applied: 0,
        expenses: 0,
        arrears: 0,
        tenantsInArrears: 0,
        occupiedUnits: 0,
        totalUnits: 0,
        topExpenseCategory: null,
      })
    );
    expect(summary.paragraphs[2]).toContain("not added any units");
    expect(summary.actions.length).toBeGreaterThan(0);
  });
});
