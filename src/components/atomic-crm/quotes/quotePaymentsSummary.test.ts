import { describe, expect, it } from "vitest";

import { buildQuotePaymentsSummary } from "./quotePaymentsSummary";

describe("buildQuotePaymentsSummary", () => {
  it("splits linked payments by status and computes the remaining amount", () => {
    const summary = buildQuotePaymentsSummary({
      quoteAmount: 1000,
      payments: [
        { amount: 200, payment_type: "acconto", status: "ricevuto" },
        { amount: 300, payment_type: "saldo", status: "in_attesa" },
        { amount: 100, payment_type: "parziale", status: "scaduto" },
        { amount: 50, payment_type: "rimborso", status: "ricevuto" },
      ],
    });

    expect(summary).toEqual({
      paymentsCount: 4,
      receivedCount: 2,
      pendingCount: 1,
      overdueCount: 1,
      receivedTotal: 150,
      pendingTotal: 300,
      overdueTotal: 100,
      linkedTotal: 550,
      remainingAmount: 450,
    });
  });

  it("handles quotes with no linked payments", () => {
    expect(
      buildQuotePaymentsSummary({
        quoteAmount: 750,
        payments: [],
      }),
    ).toEqual({
      paymentsCount: 0,
      receivedCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      receivedTotal: 0,
      pendingTotal: 0,
      overdueTotal: 0,
      linkedTotal: 0,
      remainingAmount: 750,
    });
  });

  it("marks over-coverage when linked payments exceed the quote amount", () => {
    const summary = buildQuotePaymentsSummary({
      quoteAmount: 500,
      payments: [
        { amount: 300, payment_type: "acconto", status: "ricevuto" },
        { amount: 300, payment_type: "saldo", status: "in_attesa" },
      ],
    });

    expect(summary.linkedTotal).toBe(600);
    expect(summary.remainingAmount).toBe(-100);
  });
});
