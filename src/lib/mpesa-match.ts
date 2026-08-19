// src/lib/mpesa-match.ts
//
// Matches parsed M-Pesa messages to tenants. Phone number is the reliable
// signal; the sender's name is a fallback, because M-Pesa reports the name on
// the SIM, which is often a spouse, a relative, or a business.

import type { ParsedMpesaPayment } from "@/lib/mpesa-parser";
import { normalizeKenyanPhone } from "@/lib/phone-validation";

export interface MatchableTenant {
  id: string;
  name: string;
  phone: string | null;
  unitNumber?: string | null;
  propertyName?: string | null;
}

export type MatchConfidence = "phone" | "name" | "account" | "none";

export interface MpesaMatch {
  payment: ParsedMpesaPayment;
  tenantId: string | null;
  confidence: MatchConfidence;
  /** Why this tenant was chosen, shown next to the row. */
  reason: string;
  /** Other plausible tenants, when the match was ambiguous. */
  alternatives: MatchableTenant[];
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Shared words between two names, ignoring very short tokens. */
function nameOverlap(a: string, b: string): number {
  const left = new Set(normalizeName(a).split(" ").filter((w) => w.length > 2));
  const right = normalizeName(b).split(" ").filter((w) => w.length > 2);
  if (left.size === 0 || right.length === 0) return 0;
  return right.filter((word) => left.has(word)).length;
}

export function matchMpesaPayments(
  payments: ParsedMpesaPayment[],
  tenants: MatchableTenant[]
): MpesaMatch[] {
  const byPhone = new Map<string, MatchableTenant[]>();
  tenants.forEach((tenant) => {
    if (!tenant.phone) return;
    const key = normalizeKenyanPhone(tenant.phone);
    if (!key) return;
    byPhone.set(key, [...(byPhone.get(key) ?? []), tenant]);
  });

  return payments.map((payment) => {
    // 1. Phone number.
    if (payment.phone) {
      const candidates = byPhone.get(normalizeKenyanPhone(payment.phone)) ?? [];
      if (candidates.length === 1) {
        return {
          payment,
          tenantId: candidates[0].id,
          confidence: "phone",
          reason: "Matched by phone number",
          alternatives: [],
        };
      }
      if (candidates.length > 1) {
        return {
          payment,
          tenantId: null,
          confidence: "none",
          reason: `${candidates.length} tenants share this phone number — pick one`,
          alternatives: candidates,
        };
      }
    }

    // 2. Paybill account reference against unit number.
    if (payment.accountRef) {
      const ref = payment.accountRef.trim().toLowerCase();
      const byUnit = tenants.filter(
        (t) => (t.unitNumber ?? "").trim().toLowerCase() === ref
      );
      if (byUnit.length === 1) {
        return {
          payment,
          tenantId: byUnit[0].id,
          confidence: "account",
          reason: `Matched by account reference "${payment.accountRef}"`,
          alternatives: [],
        };
      }
    }

    // 3. Sender name. Only accepted when exactly one tenant is plausible,
    //    since the SIM holder is frequently not the tenant.
    if (payment.senderName) {
      const scored = tenants
        .map((tenant) => ({ tenant, score: nameOverlap(payment.senderName, tenant.name) }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 1) {
        return {
          payment,
          tenantId: scored[0].tenant.id,
          confidence: "name",
          reason: "Matched by name — check before posting",
          alternatives: [],
        };
      }
      if (scored.length > 1 && scored[0].score > scored[1].score) {
        return {
          payment,
          tenantId: scored[0].tenant.id,
          confidence: "name",
          reason: "Matched by name — check before posting",
          alternatives: scored.slice(1, 4).map((row) => row.tenant),
        };
      }
      if (scored.length > 1) {
        return {
          payment,
          tenantId: null,
          confidence: "none",
          reason: "Several tenants have a similar name — pick one",
          alternatives: scored.slice(0, 4).map((row) => row.tenant),
        };
      }
    }

    return {
      payment,
      tenantId: null,
      confidence: "none",
      reason: payment.phone
        ? "No tenant has this phone number"
        : "No phone number in the message",
      alternatives: [],
    };
  });
}
