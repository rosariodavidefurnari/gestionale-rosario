import { describe, it, expect, vi } from "vitest";

import { buildInvoiceEmitProviderMethods } from "./dataProviderInvoiceEmit";

const baseRequest = () => ({
  clientId: "client-1",
  source: { kind: "project" as const, id: "project-1" },
  documentNumber: "FT-1/2026",
  issueDate: "2026-06-16",
  grossTaxable: 1000,
  stampAmount: 2,
  grossTotal: 1002,
  netCollectable: 1000,
  serviceIds: ["s1"],
  expenseIds: [],
});

describe("emitInvoice provider method", () => {
  it("posts to the invoice_emit edge function and returns its data", async () => {
    const invokeEdgeFunction = vi.fn().mockResolvedValue({
      data: {
        data: {
          status: "emitted",
          financialDocumentId: "fd-1",
          paymentId: "pay-1",
          servicesMarked: 1,
          expensesMarked: 0,
        },
      },
      error: null,
    });

    const { emitInvoice } = buildInvoiceEmitProviderMethods({
      invokeEdgeFunction,
    });
    const result = await emitInvoice(baseRequest());

    expect(invokeEdgeFunction).toHaveBeenCalledWith("invoice_emit", {
      method: "POST",
      body: baseRequest(),
    });
    expect(result).toEqual({
      status: "emitted",
      financialDocumentId: "fd-1",
      paymentId: "pay-1",
      servicesMarked: 1,
      expensesMarked: 0,
    });
  });

  it("throws a readable error when the edge function fails", async () => {
    const invokeEdgeFunction = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("boom"),
    });
    const { emitInvoice } = buildInvoiceEmitProviderMethods({
      invokeEdgeFunction,
    });
    await expect(emitInvoice(baseRequest())).rejects.toThrow();
  });
});
