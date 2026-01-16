// src/lib/number-formatter.ts

/**
 * Formats currency amounts intelligently based on size
 * - Shows full number with commas for amounts under 100K
 * - Uses K suffix for thousands (100K+)
 * - Uses M suffix for millions
 * - Preserves accuracy while keeping display compact
 */
export function formatCurrency(amount: number, options?: { 
  showDecimals?: boolean;
  forceCompact?: boolean;
}): string {
  const { showDecimals = false, forceCompact = false } = options || {};
  
  // Handle zero and small numbers
  if (amount === 0) return "0";
  
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  const prefix = isNegative ? "-" : "";
  
  // For amounts under 100,000, show full number with commas (unless forced compact)
  if (absAmount < 100000 && !forceCompact) {
    return `${prefix}${absAmount.toLocaleString('en-KE')}`;
  }
  
  // For amounts 100K to 999K, show as XXX.XK
  if (absAmount < 1000000) {
    const thousands = absAmount / 1000;
    if (showDecimals && thousands % 1 !== 0) {
      return `${prefix}${thousands.toFixed(1)}K`;
    }
    return `${prefix}${Math.round(thousands)}K`;
  }
  
  // For amounts 1M+, show as X.XXM
  const millions = absAmount / 1000000;
  if (showDecimals && millions % 1 !== 0) {
    return `${prefix}${millions.toFixed(2)}M`;
  }
  return `${prefix}${Math.round(millions)}M`;
}

/**
 * Formats currency with KES prefix
 */
export function formatKES(amount: number, options?: { 
  showDecimals?: boolean;
  forceCompact?: boolean;
}): string {
  return `KES ${formatCurrency(amount, options)}`;
}

/**
 * Gets responsive font size class based on number length
 * Useful for making sure numbers fit in their containers
 */
export function getResponsiveFontClass(value: string | number): string {
  const str = String(value);
  const length = str.length;
  
  if (length <= 5) return "text-2xl";
  if (length <= 7) return "text-xl";
  if (length <= 9) return "text-lg";
  return "text-base";
}