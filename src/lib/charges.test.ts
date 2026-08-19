import { describe, expect, it } from "vitest";
import { buildRentCharges, missingChargeMonths } from "./charges";

describe("buildRentCharges", () => {
  it("starts at the lease month, not the month before it", () => {
    // The F1 regression case. The old code produced a 2025-12 charge here.
    const charges = buildRentCharges({
      rentAmount: 20000,
      leaseStart: "2026-01-15",
      throughMonth: "2026-08",
    });

    expect(charges[0].charge_month).toBe("2026-01");
    expect(charges.map((c) => c.charge_month)).not.toContain("2025-12");
  });

  it("bills through the current month inclusive", () => {
    const charges = buildRentCharges({
      rentAmount: 20000,
      leaseStart: "2026-01-15",
      throughMonth: "2026-08",
    });

    expect(charges.at(-1)?.charge_month).toBe("2026-08");
    expect(charges).toHaveLength(8);
  });

  it("bills the lease month even when the lease starts on the 1st", () => {
    const charges = buildRentCharges({
      rentAmount: 20000,
      leaseStart: "2026-08-01",
      throughMonth: "2026-08",
    });

    expect(charges).toHaveLength(1);
    expect(charges[0].charge_month).toBe("2026-08");
  });

  it("charges full rent every month by default", () => {
    const charges = buildRentCharges({
      rentAmount: 20000,
      leaseStart: "2026-06-10",
      throughMonth: "2026-08",
    });

    expect(charges.map((c) => c.amount)).toEqual([20000, 20000, 20000]);
  });

  it("applies a pro rata first month when one is agreed", () => {
    const charges = buildRentCharges({
      rentAmount: 20000,
      leaseStart: "2026-06-20",
      isProrated: true,
      firstMonthOverride: 7000,
      throughMonth: "2026-08",
    });

    expect(charges.map((c) => c.amount)).toEqual([7000, 20000, 20000]);
    expect(charges[0].note).toBe("First month rent");
    expect(charges[1].note).toBe("Monthly rent");
  });

  it("ignores the override when pro rata is off", () => {
    const charges = buildRentCharges({
      rentAmount: 20000,
      leaseStart: "2026-08-01",
      isProrated: false,
      firstMonthOverride: 7000,
      throughMonth: "2026-08",
    });

    expect(charges[0].amount).toBe(20000);
  });

  it("ignores a zero or missing override", () => {
    const charges = buildRentCharges({
      rentAmount: 20000,
      leaseStart: "2026-08-01",
      isProrated: true,
      firstMonthOverride: 0,
      throughMonth: "2026-08",
    });

    expect(charges[0].amount).toBe(20000);
  });

  it("rounds to whole shillings", () => {
    const charges = buildRentCharges({
      rentAmount: 20000.6,
      leaseStart: "2026-08-01",
      throughMonth: "2026-08",
    });

    expect(charges[0].amount).toBe(20001);
  });

  it("produces nothing for zero rent", () => {
    expect(
      buildRentCharges({ rentAmount: 0, leaseStart: "2026-01-01", throughMonth: "2026-08" })
    ).toEqual([]);
  });

  it("produces nothing for an unusable lease start", () => {
    expect(
      buildRentCharges({ rentAmount: 20000, leaseStart: "", throughMonth: "2026-08" })
    ).toEqual([]);
    expect(
      buildRentCharges({ rentAmount: 20000, leaseStart: "rubbish", throughMonth: "2026-08" })
    ).toEqual([]);
  });

  it("produces nothing for a lease that has not started yet", () => {
    expect(
      buildRentCharges({
        rentAmount: 20000,
        leaseStart: "2027-01-01",
        throughMonth: "2026-08",
      })
    ).toEqual([]);
  });

  it("spans a year boundary without gaps", () => {
    const charges = buildRentCharges({
      rentAmount: 15000,
      leaseStart: "2025-11-05",
      throughMonth: "2026-02",
    });

    expect(charges.map((c) => c.charge_month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("missingChargeMonths", () => {
  it("returns only months not already billed", () => {
    const desired = buildRentCharges({
      rentAmount: 10000,
      leaseStart: "2026-01-01",
      throughMonth: "2026-04",
    });

    const missing = missingChargeMonths(desired, ["2026-01", "2026-02"]);

    expect(missing.map((c) => c.charge_month)).toEqual(["2026-03", "2026-04"]);
  });

  it("returns nothing when the ledger is already complete", () => {
    const desired = buildRentCharges({
      rentAmount: 10000,
      leaseStart: "2026-01-01",
      throughMonth: "2026-02",
    });

    expect(missingChargeMonths(desired, ["2026-01", "2026-02"])).toEqual([]);
  });
});
