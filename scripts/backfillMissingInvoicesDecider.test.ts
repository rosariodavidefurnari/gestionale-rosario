import { describe, expect, it } from "vitest";

import {
  decideMissingInvoiceBackfill,
  type BackfillDocumentCandidate,
  type BackfillPaymentCandidate,
} from "./backfillMissingInvoicesDecider";

const pay = (
  over: Partial<BackfillPaymentCandidate> = {},
): BackfillPaymentCandidate => ({
  id: "p1",
  client_id: "laurus",
  invoice_ref: "FPR 1/23",
  status: "ricevuto",
  financial_document_id: null,
  ...over,
});

const doc = (
  over: Partial<BackfillDocumentCandidate> = {},
): BackfillDocumentCandidate => ({
  client_id: "laurus",
  document_number: "FPR 1/23",
  direction: "outbound",
  document_type: "customer_invoice",
  source_path: "Fatture/2023/IT01879020517A2023_bhiYr.xml",
  ...over,
});

describe("decideMissingInvoiceBackfill", () => {
  it("creates and links when a received unlinked payment has exactly one XML-derived document candidate", () => {
    expect(decideMissingInvoiceBackfill(pay(), [doc()])).toEqual({
      action: "create_and_link",
      sourcePath: "Fatture/2023/IT01879020517A2023_bhiYr.xml",
    });
  });

  it("trims invoice_ref and document_number before matching", () => {
    expect(
      decideMissingInvoiceBackfill(pay({ invoice_ref: " FPR 1/23 " }), [
        doc({ document_number: "FPR 1/23  " }),
      ]),
    ).toEqual({
      action: "create_and_link",
      sourcePath: "Fatture/2023/IT01879020517A2023_bhiYr.xml",
    });
  });

  it("skips non-ricevuto payments", () => {
    expect(
      decideMissingInvoiceBackfill(pay({ status: "scaduto" }), [doc()]),
    ).toEqual({ action: "skip", reason: "not_ricevuto:scaduto" });
  });

  it("skips payments already linked to a financial document", () => {
    expect(
      decideMissingInvoiceBackfill(
        pay({ financial_document_id: "existing-doc" }),
        [doc()],
      ),
    ).toEqual({ action: "skip", reason: "already_linked" });
  });

  it("skips empty invoice_ref", () => {
    expect(
      decideMissingInvoiceBackfill(pay({ invoice_ref: null }), [doc()]),
    ).toEqual({ action: "skip", reason: "empty_invoice_ref" });
    expect(
      decideMissingInvoiceBackfill(pay({ invoice_ref: "" }), [doc()]),
    ).toEqual({ action: "skip", reason: "empty_invoice_ref" });
  });

  it("skips when the XML-derived candidate is missing", () => {
    expect(decideMissingInvoiceBackfill(pay(), [])).toEqual({
      action: "skip",
      reason: "no_xml_candidate",
    });
  });

  it("skips when more than one XML-derived candidate matches", () => {
    expect(
      decideMissingInvoiceBackfill(pay(), [
        doc({ source_path: "a.xml" }),
        doc({ source_path: "b.xml" }),
      ]),
    ).toEqual({ action: "skip", reason: "ambiguous_xml_candidate" });
  });

  it("skips inbound or non-customer candidate documents", () => {
    expect(
      decideMissingInvoiceBackfill(pay(), [
        doc({ direction: "inbound", document_type: "supplier_invoice" }),
      ]),
    ).toEqual({ action: "skip", reason: "no_xml_candidate" });
    expect(
      decideMissingInvoiceBackfill(pay(), [
        doc({ document_type: "customer_credit_note" }),
      ]),
    ).toEqual({ action: "skip", reason: "no_xml_candidate" });
  });
});
