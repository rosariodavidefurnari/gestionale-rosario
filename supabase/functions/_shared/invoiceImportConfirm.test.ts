import {
  buildInvoiceImportConfirmNotes,
  decideEmittedPaymentReconciliation,
  getInvoiceImportConfirmPaymentDate,
  getInvoiceImportConfirmValidationErrors,
  validateInvoiceImportConfirmPayload,
} from "./invoiceImportConfirm.ts";

describe("invoiceImportConfirm", () => {
  it("validates and normalizes a confirm payload", () => {
    const result = validateInvoiceImportConfirmPayload({
      draft: {
        model: "gemini-2.5-pro",
        generatedAt: "2026-03-01T10:00:00.000Z",
        summary: "Bozza pronta",
        warnings: [],
        records: [
          {
            sourceFileNames: ["fattura-1.pdf"],
            resource: "payments",
            confidence: "high",
            documentType: "customer_invoice",
            amount: 900,
            documentDate: "2026-02-20",
            dueDate: "2026-03-10",
            clientId: "client-1",
          },
        ],
      },
    });

    expect(result.error).toBeNull();
    expect(result.data?.draft.records[0]).toEqual(
      expect.objectContaining({
        id: "invoice-draft-1",
        paymentType: "saldo",
        paymentMethod: "bonifico",
        paymentStatus: "in_attesa",
      }),
    );
  });

  it("prefers due date for pending payments", () => {
    expect(
      getInvoiceImportConfirmPaymentDate({
        documentDate: "2026-02-20",
        dueDate: "2026-03-10",
        paymentStatus: "in_attesa",
      }),
    ).toBe("2026-03-10");

    expect(
      getInvoiceImportConfirmPaymentDate({
        documentDate: "2026-02-20",
        dueDate: "2026-03-10",
        paymentStatus: "ricevuto",
      }),
    ).toBe("2026-02-20");
  });

  it("flags invalid client and project links on confirm", () => {
    expect(
      getInvoiceImportConfirmValidationErrors(
        {
          id: "draft-1",
          sourceFileNames: ["fattura.pdf"],
          resource: "payments",
          confidence: "medium",
          documentType: "customer_invoice",
          amount: 800,
          documentDate: "2026-02-20",
          clientId: "client-a",
          projectId: "project-b",
          paymentType: "saldo",
          paymentMethod: "bonifico",
          paymentStatus: "in_attesa",
        },
        {
          clients: [{ id: "client-a" }],
          projects: [{ id: "project-b", client_id: "client-b" }],
          billingProfiles: [],
        },
      ),
    ).toContain("cliente/progetto coerenti");
  });

  it("flags billing profile/client mismatches on confirm", () => {
    expect(
      getInvoiceImportConfirmValidationErrors(
        {
          id: "draft-1",
          sourceFileNames: ["fattura.pdf"],
          resource: "payments",
          confidence: "medium",
          documentType: "customer_invoice",
          amount: 800,
          documentDate: "2026-02-20",
          clientId: "client-other",
          billingProfileId: "profile-live",
          paymentType: "saldo",
          paymentMethod: "bonifico",
          paymentStatus: "in_attesa",
        },
        {
          clients: [{ id: "client-other" }, { id: "client-gs" }],
          projects: [],
          billingProfiles: [{ id: "profile-live", client_id: "client-gs" }],
        },
      ),
    ).toContain("profilo fatturazione coerente");
  });

  it("builds audit notes with file and model metadata", () => {
    expect(
      buildInvoiceImportConfirmNotes({
        model: "gemini-2.5-pro",
        record: {
          id: "draft-1",
          sourceFileNames: ["fattura.pdf"],
          resource: "payments",
          confidence: "medium",
          documentType: "customer_invoice",
          amount: 500,
          documentDate: "2026-02-20",
          dueDate: "2026-03-10",
          clientId: "client-1",
          paymentType: "saldo",
          paymentMethod: "bonifico",
          paymentStatus: "in_attesa",
          billingName: "LAURUS S.R.L.",
        },
      }),
    ).toContain("File sorgente: fattura.pdf");
    expect(
      buildInvoiceImportConfirmNotes({
        model: "gemini-2.5-pro",
        record: {
          id: "draft-1",
          sourceFileNames: ["fattura.pdf"],
          resource: "payments",
          confidence: "medium",
          documentType: "customer_invoice",
          amount: 500,
          documentDate: "2026-02-20",
          clientId: "client-1",
          paymentType: "saldo",
          paymentMethod: "bonifico",
          paymentStatus: "in_attesa",
        },
      }),
    ).toContain("Modello estrazione: gemini-2.5-pro");
  });
});

describe("decideEmittedPaymentReconciliation", () => {
  it("settles the single expected payment and skips all N import records", () => {
    const decision = decideEmittedPaymentReconciliation({
      recordsForInvoiceRef: [{ line: 1 }, { line: 2 }, { line: 3 }],
      emittedPayments: [{ id: "pay-emit-1" }],
    });
    expect(decision).toEqual({
      action: "settle",
      paymentIdToSettle: "pay-emit-1",
      settleFromRecordIndex: 0,
      skipRecordIndexes: [0, 1, 2],
    });
  });

  it("still settles when the only match is already 'ricevuto' (second re-import idempotent)", () => {
    // The caller's query is STATUS-AGNOSTIC: an already-settled payment is still
    // returned, so a second re-import re-settles it instead of creating a dup.
    const decision = decideEmittedPaymentReconciliation({
      recordsForInvoiceRef: [{ line: 1 }],
      emittedPayments: [{ id: "pay-emit-1" }],
    });
    expect(decision.action).toBe("settle");
  });

  it("creates (historical path) when there is no emitted payment", () => {
    const decision = decideEmittedPaymentReconciliation({
      recordsForInvoiceRef: [{ line: 1 }],
      emittedPayments: [],
    });
    expect(decision).toEqual({ action: "create" });
  });

  it("creates when there are no records to reconcile", () => {
    const decision = decideEmittedPaymentReconciliation({
      recordsForInvoiceRef: [],
      emittedPayments: [{ id: "pay-emit-1" }],
    });
    expect(decision).toEqual({ action: "create" });
  });

  it("is ambiguous (no guess) when more than one emitted payment matches", () => {
    const decision = decideEmittedPaymentReconciliation({
      recordsForInvoiceRef: [{ line: 1 }],
      emittedPayments: [{ id: "pay-emit-1" }, { id: "pay-emit-2" }],
    });
    expect(decision).toEqual({ action: "ambiguous", matchCount: 2 });
  });
});
