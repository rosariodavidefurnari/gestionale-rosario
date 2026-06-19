import { describe, it, expect } from "vitest";

import {
  buildExpectedPaymentInsert,
  buildFinancialDocumentInsert,
  decideEmitExpectedPayment,
  validateInvoiceEmitRequest,
  type EmitPendingCandidate,
} from "./invoiceEmit.ts";

const validPayload = () => ({
  clientId: "client-1",
  source: { kind: "project", id: "project-1" },
  documentNumber: "FT-1/2026",
  issueDate: "2026-06-16",
  grossTaxable: 1000,
  stampAmount: 2,
  grossTotal: 1002,
  netCollectable: 1000,
  serviceIds: ["s1"],
  expenseIds: [],
});

describe("validateInvoiceEmitRequest", () => {
  it("accepts a well-formed request with no prior acconto", () => {
    const r = validateInvoiceEmitRequest(validPayload());
    expect(r.error).toBeUndefined();
    expect(r.data?.documentNumber).toBe("FT-1/2026");
  });

  it("rejects a draft that carries a prior acconto (gross != net)", () => {
    const r = validateInvoiceEmitRequest({
      ...validPayload(),
      grossTaxable: 1000,
      netCollectable: 700,
    });
    expect(r.data).toBeUndefined();
    expect(r.error).toMatch(/acconto pregresso/i);
  });

  it("rejects a non project/client source", () => {
    const r = validateInvoiceEmitRequest({
      ...validPayload(),
      source: { kind: "quote", id: "q1" },
    });
    expect(r.error).toMatch(/sorgente/i);
  });

  it("rejects a missing document number", () => {
    const r = validateInvoiceEmitRequest({
      ...validPayload(),
      documentNumber: "  ",
    });
    expect(r.error).toMatch(/numero fattura/i);
  });

  it("rejects an invalid issue date", () => {
    const r = validateInvoiceEmitRequest({
      ...validPayload(),
      issueDate: "16/06/2026",
    });
    expect(r.error).toMatch(/data emissione/i);
  });

  it("rejects when nothing is selected to invoice", () => {
    const r = validateInvoiceEmitRequest({
      ...validPayload(),
      serviceIds: [],
      expenseIds: [],
    });
    expect(r.error).toMatch(/nessun lavoro/i);
  });

  it("rejects a non-positive collectable", () => {
    const r = validateInvoiceEmitRequest({
      ...validPayload(),
      grossTaxable: 0,
      grossTotal: 0,
      netCollectable: 0,
    });
    expect(r.error).toBeDefined();
  });
});

describe("buildFinancialDocumentInsert / buildExpectedPaymentInsert", () => {
  it("writes GROSS to the document and NET to the payment", () => {
    const { data } = validateInvoiceEmitRequest(validPayload());
    const doc = buildFinancialDocumentInsert(data!);
    expect(doc.direction).toBe("outbound");
    expect(doc.document_type).toBe("customer_invoice");
    expect(doc.taxable_amount).toBe(1000);
    expect(doc.total_amount).toBe(1002);
    expect(doc.stamp_amount).toBe(2);
    expect(doc.due_date).toBe("2026-06-16"); // defaults to issue_date

    const payment = buildExpectedPaymentInsert(data!, "fd-1");
    expect(payment.status).toBe("in_attesa");
    expect(payment.payment_type).toBe("saldo");
    expect(payment.amount).toBe(1000); // net collectable, NOT the gross total
    expect(payment.invoice_ref).toBe("FT-1/2026");
    expect(payment.financial_document_id).toBe("fd-1");
    expect(payment.project_id).toBe("project-1");
  });

  it("leaves project_id null for a client-level invoice", () => {
    const { data } = validateInvoiceEmitRequest({
      ...validPayload(),
      source: { kind: "client", id: "client-1" },
    });
    const payment = buildExpectedPaymentInsert(data!, "fd-2");
    expect(payment.project_id).toBeNull();
  });
});

describe("decideEmitExpectedPayment (FIX-4 absorb)", () => {
  const c = (
    id: string,
    o: Partial<EmitPendingCandidate> = {},
  ): EmitPendingCandidate => ({
    id,
    amount: 1000,
    payment_type: "saldo",
    project_id: "prj-1",
    financial_document_id: null,
    ...o,
  });

  const projectReq = {
    netCollectable: 1000,
    source: { kind: "project" as const, id: "prj-1" },
  };

  it("absorbs a single matching manual pending (same amount, absorbable type, same project)", () => {
    expect(decideEmitExpectedPayment([c("p1")], projectReq)).toEqual({
      action: "absorb",
      paymentId: "p1",
    });
  });

  it("absorbs within the cent tolerance", () => {
    expect(
      decideEmitExpectedPayment([c("p1", { amount: 1000.004 })], projectReq),
    ).toEqual({ action: "absorb", paymentId: "p1" });
  });

  it("creates when there is no candidate", () => {
    expect(decideEmitExpectedPayment([], projectReq)).toEqual({
      action: "create",
    });
  });

  it("creates when the amount is outside the cent tolerance", () => {
    expect(
      decideEmitExpectedPayment([c("p1", { amount: 950 })], projectReq),
    ).toEqual({ action: "create" });
  });

  it("creates when the candidate type is rimborso (never absorbable)", () => {
    expect(
      decideEmitExpectedPayment(
        [c("p1", { payment_type: "rimborso_spese" })],
        projectReq,
      ),
    ).toEqual({ action: "create" });
    expect(
      decideEmitExpectedPayment(
        [c("p1", { payment_type: "rimborso" })],
        projectReq,
      ),
    ).toEqual({ action: "create" });
  });

  it("creates when the candidate is already linked to a document", () => {
    expect(
      decideEmitExpectedPayment(
        [c("p1", { financial_document_id: "fd-9" })],
        projectReq,
      ),
    ).toEqual({ action: "create" });
  });

  it("creates when the candidate belongs to a different project", () => {
    expect(
      decideEmitExpectedPayment([c("p1", { project_id: "prj-2" })], projectReq),
    ).toEqual({ action: "create" });
  });

  // B2: client-level emit is out of scope v1 → never absorb (would cross-project
  // settle the wrong invoice; the seed has 4 saldo in_attesa on one client).
  it("creates for a client-level source even with matching candidates (B2 out-of-scope v1)", () => {
    expect(
      decideEmitExpectedPayment([c("p1", { project_id: "prj-1" })], {
        netCollectable: 1000,
        source: { kind: "client", id: "client-1" },
      }),
    ).toEqual({ action: "create" });
  });

  it("is ambiguous (no guess) when >1 candidate matches on the same project", () => {
    expect(decideEmitExpectedPayment([c("p1"), c("p2")], projectReq)).toEqual({
      action: "ambiguous",
    });
  });
});
