import { describe, expect, it, vi } from "vitest";

import { confirmInvoiceImportDraftWithCreate } from "./invoiceImportProvider";

describe("invoiceImportProvider", () => {
  it("creates CRM payments and expenses from the confirmed draft", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: "payment-1" } })
      .mockResolvedValueOnce({ data: { id: "expense-1" } });

    const result = await confirmInvoiceImportDraftWithCreate({
      create,
      draft: {
        model: "gemini-2.5-pro",
        generatedAt: "2026-02-28T22:00:00.000Z",
        summary: "Bozza pronta",
        warnings: [],
        records: [
          {
            id: "draft-1",
            sourceFileNames: ["cliente.pdf"],
            resource: "payments",
            confidence: "high",
            documentType: "customer_invoice",
            amount: 1200,
            documentDate: "2026-02-20",
            clientId: "client-1",
            paymentType: "saldo",
            paymentMethod: "bonifico",
            paymentStatus: "in_attesa",
            invoiceRef: "FAT-1",
          },
          {
            id: "draft-2",
            sourceFileNames: ["fornitore.pdf"],
            resource: "expenses",
            confidence: "high",
            documentType: "supplier_invoice",
            amount: 300,
            documentDate: "2026-02-19",
            expenseType: "noleggio",
            invoiceRef: "SUP-9",
            description: "Noleggio luci",
          },
        ],
      },
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.created).toEqual([
      {
        resource: "payments",
        id: "payment-1",
        invoiceRef: "FAT-1",
        amount: 1200,
      },
      {
        resource: "expenses",
        id: "expense-1",
        invoiceRef: "SUP-9",
        amount: 300,
      },
    ]);
  });
});
