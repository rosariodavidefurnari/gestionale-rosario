import { describe, expect, it } from "vitest";

import {
  applyInvoiceImportWorkspaceHints,
  buildInvoiceImportRecordNotes,
  getInvoiceImportPaymentDate,
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

  it("flags invalid client ids when workspace is available", () => {
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
          clientId: "missing-client",
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
          projects: [],
        },
      ),
    ).toContain("cliente valido");
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
    ).toContain("File sorgente: fattura.pdf");
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
    ).toContain("Denominazione fiscale: LAURUS S.R.L.");
  });

  it("prefers due date for pending imported payments", () => {
    expect(
      getInvoiceImportPaymentDate({
        documentDate: "2026-02-20",
        dueDate: "2026-03-10",
        paymentStatus: "in_attesa",
      }),
    ).toBe("2026-03-10");

    expect(
      getInvoiceImportPaymentDate({
        documentDate: "2026-02-20",
        dueDate: "2026-03-10",
        paymentStatus: "ricevuto",
      }),
    ).toBe("2026-02-20");
  });

  it("autolinks a client from fiscal identifiers and billing name", () => {
    expect(
      applyInvoiceImportWorkspaceHints(
        {
          model: "gemini-2.5-pro",
          generatedAt: "2026-03-01T12:00:00.000Z",
          summary: "Bozza",
          warnings: [],
          records: [
            {
              id: "draft-1",
              sourceFileNames: ["fpr.xml"],
              resource: "payments",
              confidence: "high",
              documentType: "customer_invoice",
              counterpartyName: "Diego Caltabiano",
              billingName: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
              fiscalCode: "05416820875",
              amount: 997,
              documentDate: "2024-12-19",
            },
          ],
        },
        {
          clients: [
            {
              id: "client-gs",
              name: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
              email: null,
              billing_name: null,
              vat_number: null,
              fiscal_code: "05416820875",
              billing_city: "Adrano",
            },
          ],
          projects: [],
        },
      ).records[0]?.clientId,
    ).toBe("client-gs");
  });

  it("inherits the client from the selected project when missing", () => {
    expect(
      applyInvoiceImportWorkspaceHints(
        {
          model: "gemini-2.5-pro",
          generatedAt: "2026-03-01T12:00:00.000Z",
          summary: "Bozza",
          warnings: [],
          records: [
            {
              id: "draft-1",
              sourceFileNames: ["fpr.xml"],
              resource: "payments",
              confidence: "high",
              documentType: "customer_invoice",
              amount: 997,
              documentDate: "2024-12-19",
              projectId: "project-gs",
            },
          ],
        },
        {
          clients: [
            {
              id: "client-gs",
              name: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
              email: null,
              billing_name: null,
              vat_number: null,
              fiscal_code: "05416820875",
              billing_city: "Adrano",
            },
          ],
          projects: [
            {
              id: "project-gs",
              name: "Gustare Sicilia",
              client_id: "client-gs",
            },
          ],
        },
      ).records[0]?.clientId,
    ).toBe("client-gs");
  });
});
