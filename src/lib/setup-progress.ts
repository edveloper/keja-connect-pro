// src/lib/setup-progress.ts
//
// Which setup step a landlord is on, given what they have created.
//
// Split out from the hook so it can be tested without a database: what a brand
// new user sees on their first screen is worth having a regression guard on.

export interface SetupCounts {
  properties: number;
  units: number;
  tenants: number;
  hasPayTo: boolean;
}

export interface SetupProgress {
  /** Nothing at all has been set up yet. */
  isEmpty: boolean;
  /** At least one tenant exists, so the dashboard has something real to show. */
  isReady: boolean;
  /** 1 property, 2 units, 3 tenant, 4 paybill. */
  currentStep: 1 | 2 | 3 | 4;
  /** 0-4, for the progress line. */
  completedSteps: number;
}

export function computeSetupProgress(counts: SetupCounts): SetupProgress {
  const properties = Math.max(0, counts.properties);
  const units = Math.max(0, counts.units);
  const tenants = Math.max(0, counts.tenants);

  return {
    isEmpty: properties === 0 && units === 0 && tenants === 0,
    isReady: tenants > 0,
    currentStep: properties === 0 ? 1 : units === 0 ? 2 : tenants === 0 ? 3 : 4,
    completedSteps:
      (properties > 0 ? 1 : 0) +
      (units > 0 ? 1 : 0) +
      (tenants > 0 ? 1 : 0) +
      (counts.hasPayTo ? 1 : 0),
  };
}

/**
 * Whether the dashboard should hand the whole page over to the setup guide.
 *
 * Three rules, in order:
 *
 *   1. Once a tenant exists there is real data to show, so the guide goes away
 *      permanently. The optional paybill step never keeps it alive — a card you
 *      cannot complete and cannot close is worse than not asking.
 *   2. If the landlord closed it, respect that and let them into the app.
 *   3. Otherwise show it, because a dashboard of zeroes reads as "all clear"
 *      rather than "not set up yet".
 */
export function shouldShowSetupGuide(input: {
  isReady: boolean;
  dismissed: boolean;
}): boolean {
  if (input.isReady) return false;
  if (input.dismissed) return false;
  return true;
}

/**
 * Whether a stored dismissal should be forgotten.
 *
 * Clearing it on completion means the flag can never get wedged: a landlord who
 * hides the guide, finishes setup, then later adds a second property sees the
 * guide again rather than silently nothing.
 */
export function shouldClearDismissal(isReady: boolean): boolean {
  return isReady;
}
