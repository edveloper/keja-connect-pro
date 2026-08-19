import { describe, expect, it } from "vitest";
import { matchMpesaPayments, type MatchableTenant } from "./mpesa-match";
import type { ParsedMpesaPayment } from "./mpesa-parser";

const tenants: MatchableTenant[] = [
  { id: "t1", name: "John Kamau", phone: "0712345678", unitNumber: "A1" },
  { id: "t2", name: "Mary Wanjiku", phone: "0723456789", unitNumber: "A2" },
  { id: "t3", name: "Peter Ochieng", phone: null, unitNumber: "B1" },
];

function payment(over: Partial<ParsedMpesaPayment> = {}): ParsedMpesaPayment {
  return {
    code: "ABC1234567",
    amount: 20000,
    senderName: "",
    phone: null,
    paidOn: "2026-08-01",
    accountRef: null,
    rawText: "",
    ...over,
  };
}

describe("matchMpesaPayments", () => {
  it("matches on phone number", () => {
    const [match] = matchMpesaPayments([payment({ phone: "0712345678" })], tenants);

    expect(match.tenantId).toBe("t1");
    expect(match.confidence).toBe("phone");
  });

  it("matches a phone written in any Kenyan format", () => {
    const [match] = matchMpesaPayments([payment({ phone: "254712345678" })], tenants);
    expect(match.tenantId).toBe("t1");
  });

  it("prefers phone over a conflicting name", () => {
    const [match] = matchMpesaPayments(
      [payment({ phone: "0712345678", senderName: "Mary Wanjiku" })],
      tenants
    );

    expect(match.tenantId).toBe("t1");
    expect(match.confidence).toBe("phone");
  });

  it("does not guess when two tenants share a phone", () => {
    const shared: MatchableTenant[] = [
      { id: "t1", name: "John Kamau", phone: "0712345678" },
      { id: "t2", name: "Jane Kamau", phone: "0712345678" },
    ];

    const [match] = matchMpesaPayments([payment({ phone: "0712345678" })], shared);

    expect(match.tenantId).toBeNull();
    expect(match.alternatives).toHaveLength(2);
  });

  it("falls back to the paybill account reference", () => {
    const [match] = matchMpesaPayments(
      [payment({ phone: "0799999999", accountRef: "B1" })],
      tenants
    );

    expect(match.tenantId).toBe("t3");
    expect(match.confidence).toBe("account");
  });

  it("falls back to the sender name and flags it for checking", () => {
    const [match] = matchMpesaPayments([payment({ senderName: "Peter Ochieng" })], tenants);

    expect(match.tenantId).toBe("t3");
    expect(match.confidence).toBe("name");
    expect(match.reason).toContain("check before posting");
  });

  it("does not match on a short or generic name token", () => {
    const [match] = matchMpesaPayments([payment({ senderName: "Mr X" })], tenants);
    expect(match.tenantId).toBeNull();
  });

  it("asks the user to choose when two tenants score equally on name", () => {
    const twins: MatchableTenant[] = [
      { id: "t1", name: "John Kamau", phone: "0700000001" },
      { id: "t2", name: "John Kamau", phone: "0700000002" },
    ];

    const [match] = matchMpesaPayments([payment({ senderName: "John Kamau" })], twins);

    expect(match.tenantId).toBeNull();
    expect(match.alternatives).toHaveLength(2);
  });

  it("picks the stronger name match and offers the others", () => {
    const similar: MatchableTenant[] = [
      { id: "t1", name: "John Peter Kamau", phone: "0700000001" },
      { id: "t2", name: "John Otieno", phone: "0700000002" },
    ];

    const [match] = matchMpesaPayments([payment({ senderName: "John Peter Kamau" })], similar);

    expect(match.tenantId).toBe("t1");
    expect(match.alternatives.map((t) => t.id)).toEqual(["t2"]);
  });

  it("explains an unmatched phone number", () => {
    const [match] = matchMpesaPayments([payment({ phone: "0799999999" })], tenants);

    expect(match.tenantId).toBeNull();
    expect(match.reason).toBe("No tenant has this phone number");
  });

  it("explains a message with nothing to match on", () => {
    const [match] = matchMpesaPayments([payment()], tenants);

    expect(match.tenantId).toBeNull();
    expect(match.reason).toBe("No phone number in the message");
  });

  it("returns one row per payment, in order", () => {
    const matches = matchMpesaPayments(
      [
        payment({ code: "A", phone: "0712345678" }),
        payment({ code: "B", phone: "0723456789" }),
        payment({ code: "C" }),
      ],
      tenants
    );

    expect(matches.map((m) => m.payment.code)).toEqual(["A", "B", "C"]);
    expect(matches.map((m) => m.tenantId)).toEqual(["t1", "t2", null]);
  });
});
