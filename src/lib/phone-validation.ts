/**
 * Validate Kenyan phone numbers
 * Valid formats:
 * - 07XXXXXXXX (Safaricom, Airtel)
 * - 01XXXXXXXX (Safaricom)
 * - +254XXXXXXXXX
 * - 254XXXXXXXXX
 */
export function isValidKenyanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  
  // Pattern for Kenyan numbers
  const patterns = [
    /^0[17]\d{8}$/,           // 07XX or 01XX (10 digits)
    /^\+254[17]\d{8}$/,       // +254 7XX or 1XX (13 chars)
    /^254[17]\d{8}$/,         // 254 7XX or 1XX (12 digits)
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Normalize phone to 07XXXXXXXX format
 */
export function normalizeKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  
  // Remove +254 or 254 prefix and add 0
  if (cleaned.startsWith("+254")) {
    return "0" + cleaned.slice(4);
  }
  if (cleaned.startsWith("254") && cleaned.length === 12) {
    return "0" + cleaned.slice(3);
  }
  
  return cleaned;
}

/**
 * Format phone for display
 */
export function formatKenyanPhone(phone: string): string {
  const normalized = normalizeKenyanPhone(phone);
  if (normalized.length === 10) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
  }
  return phone;
}
