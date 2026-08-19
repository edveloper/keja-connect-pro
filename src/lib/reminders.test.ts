import { describe, expect, it } from "vitest";
import {
  buildArrearsReminder,
  buildPaymentConfirmation,
  toWhatsAppNumber,
  whatsappLink,
} from "./reminders";

describe("toWhatsAppNumber", () => {
  it("converts every Kenyan format to the wa.me form", () => {
    expect(toWhatsAppNumber("0712345678")).toBe("254712345678");
    expect(toWhatsAppNumber("+254712345678")).toBe("254712345678");
    expect(toWhatsAppNumber("254712345678")).toBe("254712345678");
    expect(toWhatsAppNumber("0110000000")).toBe("254110000000");
  });

  it("tolerates spaces and dashes", () => {
    expect(toWhatsAppNumber("0712 345 678")).toBe("254712345678");
    expect(toWhatsAppNumber("0712-345-678")).toBe("254712345678");
  });

  it("rejects anything that is not a Kenyan mobile number", () => {
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber("abc")).toBeNull();
    expect(toWhatsAppNumber("0812345678")).toBeNull();
    expect(toWhatsAppNumber("071234567")).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("builds a link with the message encoded", () => {
    const link = whatsappLink("0712345678", "Hi there, rent is due");
    expect(link).toBe("https://wa.me/254712345678?text=Hi%20there%2C%20rent%20is%20due");
  });

  it("returns null for an unusable number rather than a broken link", () => {
    expect(whatsappLink("nonsense", "Hi")).toBeNull();
  });
});

describe("buildArrearsReminder", () => {
  it("names the tenant, the house, and the amount", () => {
    const message = buildArrearsReminder({
      tenantName: "John Kamau",
      unitNumber: "A1",
      amount: 25000,
      monthsBehind: 1,
    });

    expect(message).toContain("Hi John,");
    expect(message).toContain("house A1");
    expect(message).toContain("KES 25,000");
  });

  it("mentions the number of months only when more than one", () => {
    expect(
      buildArrearsReminder({
        tenantName: "John Kamau",
        unitNumber: "A1",
        amount: 50000,
        monthsBehind: 2,
      })
    ).toContain("covers 2 months");

    expect(
      buildArrearsReminder({
        tenantName: "John Kamau",
        unitNumber: "A1",
        amount: 25000,
        monthsBehind: 1,
      })
    ).not.toContain("covers");
  });

  it("includes pay-to details when given", () => {
    const message = buildArrearsReminder({
      tenantName: "John",
      unitNumber: null,
      amount: 1000,
      monthsBehind: 1,
      payTo: "Paybill 247247, account 0700",
    });

    expect(message).toContain("Paybill 247247");
  });

  it("copes with a missing unit and a single-word name", () => {
    const message = buildArrearsReminder({
      tenantName: "Mary",
      unitNumber: null,
      amount: 1000,
      monthsBehind: 1,
    });

    expect(message).toContain("Hi Mary,");
    expect(message).not.toContain("house");
  });

  it("never abbreviates the amount", () => {
    const message = buildArrearsReminder({
      tenantName: "John",
      unitNumber: "A1",
      amount: 1250000,
      monthsBehind: 3,
    });

    expect(message).toContain("KES 1,250,000");
    expect(message).not.toContain("1M");
  });
});

describe("buildPaymentConfirmation", () => {
  it("confirms the amount and the months cleared", () => {
    const message = buildPaymentConfirmation({
      tenantName: "John Kamau",
      unitNumber: "A1",
      amount: 20000,
      monthsCleared: ["June 2026", "July 2026"],
      balanceAfter: 0,
    });

    expect(message).toContain("KES 20,000");
    expect(message).toContain("June 2026, July 2026");
    expect(message).toContain("fully settled");
  });

  it("states a remaining balance", () => {
    const message = buildPaymentConfirmation({
      tenantName: "John",
      unitNumber: "A1",
      amount: 10000,
      monthsCleared: ["June 2026"],
      balanceAfter: 5000,
    });

    expect(message).toContain("remaining balance is KES 5,000");
  });

  it("states a credit", () => {
    const message = buildPaymentConfirmation({
      tenantName: "John",
      unitNumber: "A1",
      amount: 30000,
      monthsCleared: ["June 2026"],
      balanceAfter: -5000,
    });

    expect(message).toContain("KES 5,000 in credit");
  });
});
