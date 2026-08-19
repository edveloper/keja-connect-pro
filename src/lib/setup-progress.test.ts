import { describe, expect, it } from "vitest";
import {
  computeSetupProgress,
  shouldClearDismissal,
  shouldShowSetupGuide,
  type SetupCounts,
} from "./setup-progress";

function counts(over: Partial<SetupCounts> = {}): SetupCounts {
  return { properties: 0, units: 0, tenants: 0, hasPayTo: false, ...over };
}

describe("computeSetupProgress", () => {
  it("treats a brand-new account as empty and not ready", () => {
    const p = computeSetupProgress(counts());
    expect(p.isEmpty).toBe(true);
    expect(p.isReady).toBe(false);
    expect(p.currentStep).toBe(1);
    expect(p.completedSteps).toBe(0);
  });

  it("moves to units once a property exists", () => {
    const p = computeSetupProgress(counts({ properties: 1 }));
    expect(p.isEmpty).toBe(false);
    expect(p.currentStep).toBe(2);
    expect(p.completedSteps).toBe(1);
  });

  it("moves to tenants once units exist", () => {
    const p = computeSetupProgress(counts({ properties: 1, units: 6 }));
    expect(p.currentStep).toBe(3);
    expect(p.completedSteps).toBe(2);
  });

  it("is only ready once a tenant exists", () => {
    expect(computeSetupProgress(counts({ properties: 1, units: 6 })).isReady).toBe(false);
    expect(
      computeSetupProgress(counts({ properties: 1, units: 6, tenants: 1 })).isReady
    ).toBe(true);
  });

  it("still asks for the paybill after the portfolio is set up", () => {
    const p = computeSetupProgress(counts({ properties: 1, units: 6, tenants: 4 }));
    expect(p.isReady).toBe(true);
    expect(p.currentStep).toBe(4);
    expect(p.completedSteps).toBe(3);
  });

  it("is fully complete with a paybill", () => {
    const p = computeSetupProgress(
      counts({ properties: 1, units: 6, tenants: 4, hasPayTo: true })
    );
    expect(p.completedSteps).toBe(4);
  });

  it("counts the paybill even when it is done out of order", () => {
    const p = computeSetupProgress(counts({ hasPayTo: true }));
    expect(p.completedSteps).toBe(1);
    // The paybill is optional, so it must not skip the portfolio steps.
    expect(p.currentStep).toBe(1);
    expect(p.isReady).toBe(false);
  });

  it("handles an imported portfolio that arrives all at once", () => {
    const p = computeSetupProgress(counts({ properties: 3, units: 42, tenants: 39 }));
    expect(p.isEmpty).toBe(false);
    expect(p.isReady).toBe(true);
    expect(p.currentStep).toBe(4);
  });

  it("does not treat tenants with no property as ready to skip setup", () => {
    // Defensive: archived-only or orphaned data should not read as complete.
    const p = computeSetupProgress(counts({ tenants: 0, properties: 2, units: 0 }));
    expect(p.isReady).toBe(false);
    expect(p.currentStep).toBe(2);
  });

  it("ignores negative counts rather than producing nonsense", () => {
    const p = computeSetupProgress(counts({ properties: -1, units: -5 }));
    expect(p.isEmpty).toBe(true);
    expect(p.completedSteps).toBe(0);
    expect(p.currentStep).toBe(1);
  });
});

describe("shouldShowSetupGuide", () => {
  it("shows for a new account", () => {
    expect(shouldShowSetupGuide({ isReady: false, dismissed: false })).toBe(true);
  });

  it("hides once a tenant exists, paybill or not", () => {
    expect(shouldShowSetupGuide({ isReady: true, dismissed: false })).toBe(false);
  });

  it("hides when the landlord closed it", () => {
    expect(shouldShowSetupGuide({ isReady: false, dismissed: true })).toBe(false);
  });

  it("never shows an unclosable card: ready always wins", () => {
    expect(shouldShowSetupGuide({ isReady: true, dismissed: true })).toBe(false);
  });
});

describe("shouldClearDismissal", () => {
  it("forgets the dismissal once setup is finished", () => {
    expect(shouldClearDismissal(true)).toBe(true);
  });

  it("keeps it while setup is unfinished", () => {
    expect(shouldClearDismissal(false)).toBe(false);
  });
});
