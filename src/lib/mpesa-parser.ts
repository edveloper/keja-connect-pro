// src/lib/mpesa-parser.ts
//
// Turns pasted M-Pesa confirmation messages into payments the landlord can
// review and post. Handles the two shapes Safaricom sends for money in:
//
//   "TFF4XY9ABC Confirmed.You have received Ksh2,000.00 from JOHN KAMAU
//    254712345678 on 15/6/26 at 10:30 AM New M-PESA balance is Ksh5,000.00"
//
//   "TFF4XY9ABC Confirmed. Ksh2,000.00 received from JOHN KAMAU 0712345678
//    Account 12A on 15/6/26 at 10:30 AM"
//
// Anything it cannot read is reported rather than dropped, so a landlord can
// see what was skipped instead of silently losing a payment.

import { normalizeKenyanPhone } from "@/lib/phone-validation";
import { toDateKey } from "@/lib/month";

export interface ParsedMpesaPayment {
  /** The M-Pesa transaction code, e.g. "TFF4XY9ABC". */
  code: string;
  amount: number;
  /** Sender name as it appeared, title-cased. Empty when absent. */
  senderName: string;
  /** Normalised to `07XXXXXXXX` when present. */
  phone: string | null;
  /** `YYYY-MM-DD` when the message carried a date. */
  paidOn: string | null;
  /** Paybill account reference, when the message had one. */
  accountRef: string | null;
  /** The message this was read from, for display. */
  rawText: string;
}

export interface MpesaParseResult {
  payments: ParsedMpesaPayment[];
  /** Message fragments that looked like transactions but could not be read. */
  skipped: Array<{ text: string; reason: string }>;
}

/**
 * M-Pesa codes are 10 characters: uppercase letters and digits. Anchoring on
 * the code followed by "Confirmed" is what lets several pasted messages be
 * separated reliably.
 */
const TRANSACTION_SPLIT = /\b([A-Z0-9]{10})\b(?=\s*Confirmed)/gi;

const AMOUNT = /(?:Ksh|KES|Kshs)\.?\s*([\d,]+(?:\.\d{1,2})?)/i;

// "from JOHN KAMAU 254712345678" / "from JOHN KAMAU 0712345678"
const SENDER = /\bfrom\s+([A-Za-z][A-Za-z.'\- ]{1,60}?)\s+(?:\+?254|0)(1\d{8}|7\d{8})\b/i;
// Fallback when no phone follows the name.
const SENDER_NAME_ONLY = /\bfrom\s+([A-Za-z][A-Za-z.'\- ]{1,60}?)(?=\s+(?:on|Account)\b)/i;

const PHONE = /(?:\+?254|\b0)(1\d{8}|7\d{8})\b/;
const ACCOUNT_REF = /\bAccount\s+([A-Za-z0-9\-/]+)/i;
const DATE = /\bon\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;

function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function parseAmount(block: string): number | null {
  const match = block.match(AMOUNT);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function parseDate(block: string): string | null {
  const match = block.match(DATE);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== month - 1) return null;

  return toDateKey(date);
}

/**
 * Only "money in" messages become payments. A landlord's inbox is full of
 * outgoing payments, balance checks and airtime purchases; posting those as
 * rent would be worse than skipping them.
 */
function isIncoming(block: string): boolean {
  if (/\byou have received\b/i.test(block)) return true;
  if (/\breceived\s+from\b/i.test(block)) return true;
  if (/\bKsh[\d,. ]+received\b/i.test(block)) return true;
  return false;
}

function describeUnreadable(block: string): string | null {
  if (/\bsent to\b/i.test(block)) return "Outgoing payment";
  if (/\byou bought\b/i.test(block)) return "Airtime or bundle purchase";
  if (/\bwithdraw/i.test(block)) return "Withdrawal";
  if (/\byour account balance\b/i.test(block)) return "Balance enquiry";
  if (!isIncoming(block)) return "Not a received-payment message";
  return null;
}

export function parseMpesaMessages(text: string): MpesaParseResult {
  const payments: ParsedMpesaPayment[] = [];
  const skipped: MpesaParseResult["skipped"] = [];
  const seenCodes = new Set<string>();

  if (!text || !text.trim()) return { payments, skipped };

  // Split into one block per transaction, keeping each code with its message.
  const matches = [...text.matchAll(TRANSACTION_SPLIT)];

  const blocks: Array<{ code: string; body: string }> =
    matches.length > 0
      ? matches.map((match, index) => {
          const start = match.index ?? 0;
          const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
          return { code: match[1].toUpperCase(), body: text.slice(start, end).trim() };
        })
      : [];

  if (blocks.length === 0) {
    const trimmed = text.trim();
    if (trimmed) {
      skipped.push({
        text: trimmed.slice(0, 140),
        reason: "No M-Pesa confirmation code found",
      });
    }
    return { payments, skipped };
  }

  for (const { code, body } of blocks) {
    const problem = describeUnreadable(body);
    if (problem) {
      skipped.push({ text: body.slice(0, 140), reason: problem });
      continue;
    }

    const amount = parseAmount(body);
    if (amount === null) {
      skipped.push({ text: body.slice(0, 140), reason: "Could not read the amount" });
      continue;
    }

    // A pasted thread often repeats the same message.
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const senderMatch = body.match(SENDER);
    const senderName = senderMatch
      ? titleCase(senderMatch[1])
      : titleCase(body.match(SENDER_NAME_ONLY)?.[1] ?? "");

    // Take the phone from the sender clause when possible; a bare search would
    // also match numbers elsewhere in the message.
    const phoneDigits = senderMatch?.[2] ?? body.match(PHONE)?.[1] ?? null;

    payments.push({
      code,
      amount,
      senderName,
      phone: phoneDigits ? normalizeKenyanPhone(`0${phoneDigits}`) : null,
      paidOn: parseDate(body),
      accountRef: body.match(ACCOUNT_REF)?.[1] ?? null,
      rawText: body.replace(/\s+/g, " ").slice(0, 200),
    });
  }

  return { payments, skipped };
}
