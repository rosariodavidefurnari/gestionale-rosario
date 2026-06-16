import { describe, it, expect } from "vitest";

import {
  computeInvoiceDraftAmounts,
  computeInvoiceDraftTotals,
  type InvoiceDraftLineItem,
} from "./invoiceDraftTypes";

describe("computeInvoiceDraftAmounts", () => {
  it("computes gross document amount and stamp with no prior payment", () => {
    const lineItems: InvoiceDraftLineItem[] = [
      { description: "Servizio", quantity: 1, unitPrice: 1000, kind: "service" },
      { description: "Km", quantity: 1, unitPrice: 100, kind: "km" },
    ];
    const a = computeInvoiceDraftAmounts(lineItems);
    expect(a.grossTaxable).toBe(1100);
    expect(a.stampDuty).toBe(2); // > 77.47
    expect(a.grossTotal).toBe(1102);
    expect(a.netCollectable).toBe(1100);
    expect(a.hasPriorReceived).toBe(false);
  });

  it("separates gross document amount from net collectable with a prior payment", () => {
    const lineItems: InvoiceDraftLineItem[] = [
      { description: "Servizio", quantity: 1, unitPrice: 1000, kind: "service" },
      { description: "Km", quantity: 1, unitPrice: 100, kind: "km" },
      {
        description: "Pagamenti gia ricevuti",
        quantity: 1,
        unitPrice: -300,
        kind: "payment",
      },
    ];
    const a = computeInvoiceDraftAmounts(lineItems);
    expect(a.grossTaxable).toBe(1100); // excludes the payment line
    expect(a.stampDuty).toBe(2);
    expect(a.grossTotal).toBe(1102);
    expect(a.netCollectable).toBe(800); // 1100 - 300
    expect(a.hasPriorReceived).toBe(true);
  });

  it("no stamp below the 77.47 threshold", () => {
    const lineItems: InvoiceDraftLineItem[] = [
      { description: "Servizio", quantity: 1, unitPrice: 50, kind: "service" },
    ];
    const a = computeInvoiceDraftAmounts(lineItems);
    expect(a.grossTaxable).toBe(50);
    expect(a.stampDuty).toBe(0);
    expect(a.grossTotal).toBe(50);
    expect(a.netCollectable).toBe(50);
  });

  it("excludes any stamp_duty line from the gross taxable base", () => {
    const lineItems: InvoiceDraftLineItem[] = [
      { description: "Servizio", quantity: 1, unitPrice: 200, kind: "service" },
      { description: "Bollo", quantity: 1, unitPrice: 2, kind: "stamp_duty" },
    ];
    const a = computeInvoiceDraftAmounts(lineItems);
    expect(a.grossTaxable).toBe(200);
    expect(a.netCollectable).toBe(200);
  });

  it("leaves computeInvoiceDraftTotals (XML basis) unchanged", () => {
    const lineItems: InvoiceDraftLineItem[] = [
      { description: "Servizio", quantity: 1, unitPrice: 1000, kind: "service" },
      {
        description: "Pagamenti gia ricevuti",
        quantity: 1,
        unitPrice: -300,
        kind: "payment",
      },
    ];
    // Existing XML basis keeps the net behaviour (taxableAmount = 700).
    expect(computeInvoiceDraftTotals(lineItems).taxableAmount).toBe(700);
  });
});
