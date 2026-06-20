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

  // BR2 C4: documents WHY the historical scaduto FPA 1/23 is excluded from the
  // backfill. A doc with a single linked scaduto payment IS void-eligible (the
  // void gate has no app-emitted/provenance discriminator), so linking it would
  // surface a destructive "Annulla emissione" button on a 2023 historical
  // invoice. The 25 ricevuto are safe (a lone linked ricevuto is NOT voidable).
  it("true for a lone linked scaduto — the reason BR2 excludes FPA 1/23", () => {
    expect(canVoidInvoiceFromPayments(outbound, [pay("scaduto")])).toBe(true);
  });

  it("false for a lone linked ricevuto — the 25 backfilled docs stay safe", () => {
    expect(canVoidInvoiceFromPayments(outbound, [pay("ricevuto")])).toBe(false);
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
