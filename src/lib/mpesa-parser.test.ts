import { describe, expect, it } from "vitest";
import { parseMpesaMessages } from "./mpesa-parser";

const RECEIVED =
  "TFF4XY9ABC Confirmed.You have received Ksh2,000.00 from JOHN KAMAU 254712345678 " +
  "on 15/6/26 at 10:30 AM New M-PESA balance is Ksh5,000.00.";

const PAYBILL =
  "QGH7YT8KL9 Confirmed. Ksh25,000.00 received from MARY WANJIKU 0723456789 " +
  "Account 12A on 3/8/26 at 9:05 AM";

describe("parseMpesaMessages", () => {
  it("reads a received-money message", () => {
    const { payments } = parseMpesaMessages(RECEIVED);

    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      code: "TFF4XY9ABC",
      amount: 2000,
      senderName: "John Kamau",
      phone: "0712345678",
      paidOn: "2026-06-15",
    });
  });

  it("reads a paybill message with an account reference", () => {
    const { payments } = parseMpesaMessages(PAYBILL);

    expect(payments[0]).toMatchObject({
      code: "QGH7YT8KL9",
      amount: 25000,
      senderName: "Mary Wanjiku",
      phone: "0723456789",
      accountRef: "12A",
      paidOn: "2026-08-03",
    });
  });

  it("separates several messages pasted together", () => {
    const { payments } = parseMpesaMessages(`${RECEIVED}\n\n${PAYBILL}`);

    expect(payments).toHaveLength(2);
    expect(payments.map((p) => p.code)).toEqual(["TFF4XY9ABC", "QGH7YT8KL9"]);
    expect(payments.map((p) => p.amount)).toEqual([2000, 25000]);
  });

  it("does not double-count a message pasted twice", () => {
    const { payments } = parseMpesaMessages(`${RECEIVED}\n${RECEIVED}`);
    expect(payments).toHaveLength(1);
  });

  it("keeps decimal amounts as whole shillings", () => {
    const { payments } = parseMpesaMessages(
      "ABC1234567 Confirmed.You have received Ksh1,500.50 from A B 254700000000 on 1/1/26 at 1:00 PM"
    );
    expect(payments[0].amount).toBe(1501);
  });

  it("handles a 01xx number", () => {
    const { payments } = parseMpesaMessages(
      "ABC1234567 Confirmed.You have received Ksh900.00 from A B 254110000000 on 1/1/26 at 1:00 PM"
    );
    expect(payments[0].phone).toBe("0110000000");
  });

  it("skips outgoing payments rather than posting them as rent", () => {
    const { payments, skipped } = parseMpesaMessages(
      "TFF4XY9ABC Confirmed. Ksh2,000.00 sent to KPLC PREPAID on 15/6/26 at 10:30 AM"
    );

    expect(payments).toHaveLength(0);
    expect(skipped[0].reason).toBe("Outgoing payment");
  });

  it("skips airtime purchases and balance checks", () => {
    const airtime = parseMpesaMessages(
      "ABC1234567 Confirmed.You bought Ksh100.00 of airtime on 1/1/26 at 1:00 PM"
    );
    expect(airtime.payments).toHaveLength(0);
    expect(airtime.skipped[0].reason).toBe("Airtime or bundle purchase");

    const withdrawal = parseMpesaMessages(
      "ABC1234567 Confirmed.on 1/1/26 at 1:00 PM Withdraw Ksh500.00 from AGENT"
    );
    expect(withdrawal.payments).toHaveLength(0);
  });

  it("reports text with no confirmation code instead of failing silently", () => {
    const { payments, skipped } = parseMpesaMessages("just some notes I typed");
    expect(payments).toHaveLength(0);
    expect(skipped[0].reason).toBe("No M-Pesa confirmation code found");
  });

  it("reports a message whose amount cannot be read", () => {
    const { payments, skipped } = parseMpesaMessages(
      "ABC1234567 Confirmed.You have received some money from JOHN KAMAU 254712345678"
    );
    expect(payments).toHaveLength(0);
    expect(skipped[0].reason).toBe("Could not read the amount");
  });

  it("returns nothing for empty input", () => {
    expect(parseMpesaMessages("")).toEqual({ payments: [], skipped: [] });
    expect(parseMpesaMessages("   ")).toEqual({ payments: [], skipped: [] });
  });

  it("still reads a message with no date", () => {
    const { payments } = parseMpesaMessages(
      "ABC1234567 Confirmed.You have received Ksh1,000.00 from JOHN KAMAU 254712345678"
    );
    expect(payments[0].amount).toBe(1000);
    expect(payments[0].paidOn).toBeNull();
  });

  it("rejects an impossible date rather than inventing one", () => {
    const { payments } = parseMpesaMessages(
      "ABC1234567 Confirmed.You have received Ksh1,000.00 from A B 254712345678 on 31/2/26 at 1:00 PM"
    );
    expect(payments[0].paidOn).toBeNull();
  });

  it("does not mistake the transaction code for a phone number", () => {
    const { payments } = parseMpesaMessages(
      "TFF4XY9ABC Confirmed.You have received Ksh2,000.00 from JOHN KAMAU 254712345678 on 15/6/26 at 10:30 AM"
    );
    expect(payments[0].phone).toBe("0712345678");
  });
});
