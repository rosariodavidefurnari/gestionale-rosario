import { describe, it, expect } from "vitest";

import {
  decidePaymentDocumentLink,
  type DeciderDoc,
  type DeciderPayment,
} from "./br2LinkDecider";

const pay = (over: Partial<DeciderPayment> = {}): DeciderPayment => ({
  id: "p1",
  client_id: "c1",
  invoice_ref: "FPR 5/23",
  status: "ricevuto",
  financial_document_id: null,
  ...over,
});

const doc = (over: Partial<DeciderDoc> = {}): DeciderDoc => ({
  id: "d1",
  client_id: "c1",
  document_number: "FPR 5/23",
  direction: "outbound",
  document_type: "customer_invoice",
  ...over,
});

describe("decidePaymentDocumentLink (BR2 C5 safety branches)", () => {
  it("links a ricevuto payment to its single outbound customer invoice", () => {
    expect(decidePaymentDocumentLink(pay(), [doc()])).toEqual({
      action: "link",
      docId: "d1",
    });
  });

  it("trims whitespace on both sides of the match key", () => {
    expect(
      decidePaymentDocumentLink(pay({ invoice_ref: " FPR 5/23 " }), [
        doc({ document_number: "FPR 5/23  " }),
      ]),
    ).toEqual({ action: "link", docId: "d1" });
  });

  // Branch 1 — the real FPA 1/23 scenario: a scaduto payment is never linked.
  it("skips a non-ricevuto (scaduto) payment even with an exact match", () => {
    expect(
      decidePaymentDocumentLink(pay({ status: "scaduto" }), [doc()]),
    ).toEqual({ action: "skip", reason: "not_ricevuto:scaduto" });
    expect(
      decidePaymentDocumentLink(pay({ status: "in_attesa" }), [doc()]),
    ).toEqual({ action: "skip", reason: "not_ricevuto:in_attesa" });
  });

  // Branch 2 — two outbound docs with the same (client, number): fail-closed.
  it("skips when more than one outbound doc matches (ambiguous)", () => {
    expect(
      decidePaymentDocumentLink(pay(), [doc({ id: "d1" }), doc({ id: "d2" })]),
    ).toEqual({ action: "skip", reason: "ambiguous_multi_doc" });
  });

  // Branch 3 — an inbound doc shares the document_number: must NOT match.
  it("skips when only an inbound/non-customer doc shares the number", () => {
    expect(
      decidePaymentDocumentLink(pay(), [
        doc({ direction: "inbound", document_type: "supplier_invoice" }),
      ]),
    ).toEqual({ action: "skip", reason: "no_outbound_doc" });
    expect(
      decidePaymentDocumentLink(pay(), [
        doc({ document_type: "customer_credit_note" }),
      ]),
    ).toEqual({ action: "skip", reason: "no_outbound_doc" });
  });

  it("skips when no document matches at all", () => {
    expect(
      decidePaymentDocumentLink(pay({ invoice_ref: "FPR 999/99" }), [doc()]),
    ).toEqual({ action: "skip", reason: "no_outbound_doc" });
  });

  it("skips a payment that is already linked (idempotency guard)", () => {
    expect(
      decidePaymentDocumentLink(pay({ financial_document_id: "d1" }), [doc()]),
    ).toEqual({ action: "skip", reason: "already_linked" });
  });

  it("skips a payment with an empty invoice_ref", () => {
    expect(
      decidePaymentDocumentLink(pay({ invoice_ref: "" }), [doc()]),
    ).toEqual({ action: "skip", reason: "empty_invoice_ref" });
    expect(
      decidePaymentDocumentLink(pay({ invoice_ref: null }), [doc()]),
    ).toEqual({ action: "skip", reason: "empty_invoice_ref" });
  });

  // Must only match within the same client.
  it("skips when the only matching number belongs to another client", () => {
    expect(
      decidePaymentDocumentLink(pay({ client_id: "c1" }), [
        doc({ client_id: "c2" }),
      ]),
    ).toEqual({ action: "skip", reason: "no_outbound_doc" });
  });
});
