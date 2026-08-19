// src/lib/number-formatter.ts
//
// Money is never abbreviated. This file used to compact anything over 100,000,
// so an outstanding balance of KES 1,250,000 rendered as "KES 1M" — a quarter
// of a million shillings lost to rounding on a screen a landlord reconciles
// against. Figures are shown in full; `getResponsiveFontClass` handles fitting
// long numbers into narrow cards.

/** A whole-shilling figure with thousands separators, e.g. "1,250,000". */
export function formatCurrency(
  amount: number,
  options?: { showDecimals?: boolean }
): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "0";

  const decimals = options?.showDecimals ? 2 : 0;
  return value.toLocaleString("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** A figure prefixed with the currency, e.g. "KES 1,250,000". */
export function formatKES(
  amount: number,
  options?: { showDecimals?: boolean }
): string {
  return `KES ${formatCurrency(amount, options)}`;
}

/**
 * A compact figure for axis ticks and other places where an exact value is not
 * being read off the screen. Never use this for a balance, a total, or anything
 * a landlord might reconcile against — use `formatKES`.
 */
export function formatCompact(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value) || value === 0) return "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${abs.toLocaleString("en-KE")}`;
}

/**
 * A font-size class that keeps a long figure inside its card.
 * This is what makes showing full amounts practical on a phone.
 */
export function getResponsiveFontClass(value: string | number): string {
  const length = String(value).length;

  // Tuned against a half-width stat card on a 360px phone, the narrowest
  // layout the dashboard uses.
  if (length <= 7) return "text-2xl"; // up to "999,999"
  if (length <= 10) return "text-xl"; // up to "99,999,999"
  if (length <= 13) return "text-lg"; // up to "999,999,999"
  return "text-base";
}
