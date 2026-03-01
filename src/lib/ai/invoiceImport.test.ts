import { describe, expect, it } from "vitest";

import {
  buildInvoiceImportRecordNotes,
  getInvoiceImportRecordValidationErrors,
  normalizeInvoiceImportRecord,
} from "./invoiceImport";

describe("invoiceImport", () => {
  it("adds sensible defaults to extracted records", () => {
    const record = normalizeInvoiceImportRecord({
      id: "draft-1",
      sourceFileNames: ["fattura.pdf"],
      resource: "payments",
      confidence: "medium",
      documentType: "customer_invoice",
      amount: 1200,
      billingName: "  LAURUS S.R.L.  ",
      vatNumber: "  12345678901 ",
    });

    expect(record.paymentType).toBe("saldo");
    expect(record.paymentMethod).toBe("bonifico");
    expect(record.paymentStatus).toBe("in_attesa");
    expect(record.expenseType).toBe("acquisto_materiale");
    expect(record.billingName).toBe("LAURUS S.R.L.");
    expect(record.vatNumber).toBe("12345678901");
  });

  it("reports blocking fields before confirmation", () => {
    expect(
      getInvoiceImportRecordValidationErrors({
        id: "draft-1",
        sourceFileNames: ["fattura.pdf"],
        resource: "payments",
        confidence: "medium",
        documentType: "customer_invoice",
        amount: null,
      }),
    ).toEqual(
      expect.arrayContaining([
        "importo valido",
        "data documento",
        "cliente",
      ]),
    );
  });

  it("flags mismatched client/project links when workspace is available", () => {
    expect(
      getInvoiceImportRecordValidationErrors(
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
        },
        {
          clients: [
            {
              id: "client-a",
              name: "Cliente A",
              email: null,
              billing_name: null,
              vat_number: null,
              fiscal_code: null,
              billing_city: null,
            },
          ],
          projects: [
            { id: "project-b", name: "Progetto B", client_id: "client-b" },
          ],
        },
      ),
    ).toContain("cliente/progetto coerenti");
  });

  it("builds CRM notes with due date and import trace", () => {
    expect(
      buildInvoiceImportRecordNotes({
        id: "draft-1",
        sourceFileNames: ["fattura.pdf"],
        resource: "payments",
        confidence: "medium",
        documentType: "customer_invoice",
        amount: 500,
        dueDate: "2026-03-10",
        notes: "Documento letto via OCR",
        billingName: "LAURUS S.R.L.",
      }),
    ).toContain("Importato dalla chat AI fatture");
    expect(
      buildInvoiceImportRecordNotes({
        id: "draft-1",
        sourceFileNames: ["fattura.pdf"],
        resource: "payments",
        confidence: "medium",
        documentType: "customer_invoice",
        amount: 500,
        billingName: "LAURUS S.R.L.",
      }),
    ).toContain("Denominazione fatturazione: LAURUS S.R.L.");
  });
});
