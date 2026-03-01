import {
  buildInvoiceImportConfirmNotes,
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
        },
      ),
    ).toContain("cliente/progetto coerenti");
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
