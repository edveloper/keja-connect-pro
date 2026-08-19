// src/lib/reminders.ts
//
// Rent reminders as WhatsApp deep links. The reminder queue previously let a
// landlord mark a reminder "sent" without anything being sent — this closes
// that gap without needing a paid messaging API.
//
// wa.me opens WhatsApp with the message pre-filled; the landlord still presses
// send, so it comes from their own number and stays inside a conversation the
// tenant already recognises.

import { normalizeKenyanPhone } from "@/lib/phone-validation";
import { formatKES } from "@/lib/number-formatter";

export interface ArrearsReminderInput {
  tenantName: string;
  unitNumber: string | null;
  /** Outstanding amount in shillings. */
  amount: number;
  /** How many months carry an unpaid balance. */
  monthsBehind: number;
  /** Optional paybill or till to include. */
  payTo?: string | null;
}

/**
 * Convert a Kenyan number to the international form wa.me expects
 * (`2547XXXXXXXX`, no plus sign).
 */
export function toWhatsAppNumber(phone: string): string | null {
  const normalized = normalizeKenyanPhone(phone);
  if (!/^0[17]\d{8}$/.test(normalized)) return null;
  return `254${normalized.slice(1)}`;
}

/** A wa.me link with the message pre-filled, or null if the number is unusable. */
export function whatsappLink(phone: string, message: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * A short, plain reminder. Deliberately not chatty: this goes to a real person
 * who owes money, and a polite, factual message gets paid faster than a
 * templated one.
 */
export function buildArrearsReminder(input: ArrearsReminderInput): string {
  const firstName = input.tenantName.trim().split(/\s+/)[0] || "there";
  const unit = input.unitNumber ? ` for house ${input.unitNumber}` : "";

  const period =
    input.monthsBehind > 1
      ? ` This covers ${input.monthsBehind} months.`
      : "";

  const payTo = input.payTo ? ` You can pay to ${input.payTo}.` : "";

  return (
    `Hi ${firstName}, this is a reminder that your rent balance${unit} is ` +
    `${formatKES(input.amount)}.${period}${payTo} ` +
    `Please let me know if you have already paid so I can update my records. Thank you.`
  );
}

/** A receipt-style confirmation for a payment just recorded. */
export function buildPaymentConfirmation(input: {
  tenantName: string;
  unitNumber: string | null;
  amount: number;
  monthsCleared: string[];
  balanceAfter: number;
}): string {
  const firstName = input.tenantName.trim().split(/\s+/)[0] || "there";
  const unit = input.unitNumber ? ` for house ${input.unitNumber}` : "";
  const cleared = input.monthsCleared.length
    ? ` This covers ${input.monthsCleared.join(", ")}.`
    : "";

  const closing =
    input.balanceAfter > 0
      ? ` Your remaining balance is ${formatKES(input.balanceAfter)}.`
      : input.balanceAfter < 0
        ? ` You are ${formatKES(Math.abs(input.balanceAfter))} in credit.`
        : " Your account is now fully settled.";

  return (
    `Hi ${firstName}, I have received your rent payment of ` +
    `${formatKES(input.amount)}${unit}.${cleared}${closing} Thank you.`
  );
}
