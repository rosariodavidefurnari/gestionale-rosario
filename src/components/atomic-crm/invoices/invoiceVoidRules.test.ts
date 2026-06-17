import { describe, it, expect } from "vitest";

import type { FinancialDocumentSummary, Payment } from "../types";
import { canVoidInvoiceFromPayments } from "./invoiceVoidRules";

const outbound = {
  direction: "outbound",
  document_type: "customer_invoice",
} as Pick<FinancialDocumentSummary, "direction" | "document_type">;

const pay = (status: string) => ({ status }) as Pick<Payment, "status">;

describe("canVoidInvoiceFromPayments", () => {
  it("true for outbound customer invoice with all uncollected payments", () => {
    expect(canVoidInvoiceFromPayments(outbound, [pay("in_attesa")])).toBe(true);
    expect(
      canVoidInvoiceFromPayments(outbound, [pay("in_attesa"), pay("scaduto")]),
    ).toBe(true);
  });

  it("false when any payment is ricevuto", () => {
    expect(
      canVoidInvoiceFromPayments(outbound, [pay("in_attesa"), pay("ricevuto")]),
    ).toBe(false);
  });

  it("false with no linked payments (historical/imported)", () => {
    expect(canVoidInvoiceFromPayments(outbound, [])).toBe(false);
  });

  it("false for inbound or credit notes", () => {
    expect(
      canVoidInvoiceFromPayments(
        {
          direction: "inbound",
          document_type: "supplier_invoice",
        } as Pick<FinancialDocumentSummary, "direction" | "document_type">,
        [pay("in_attesa")],
      ),
    ).toBe(false);
    expect(
      canVoidInvoiceFromPayments(
        {
          direction: "outbound",
          document_type: "customer_credit_note",
        } as Pick<FinancialDocumentSummary, "direction" | "document_type">,
        [pay("in_attesa")],
      ),
    ).toBe(false);
  });
});
