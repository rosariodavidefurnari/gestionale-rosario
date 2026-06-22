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

  it("forwards the optional billingProfileId to invoice_emit", async () => {
    const invokeEdgeFunction = vi.fn().mockResolvedValue({
      data: {
        data: {
          status: "already_emitted",
          financialDocumentId: "fd-1",
        },
      },
      error: null,
    });

    const { emitInvoice } = buildInvoiceEmitProviderMethods({
      invokeEdgeFunction,
    });
    const request = { ...baseRequest(), billingProfileId: "profile-live" };
    await emitInvoice(request);

    expect(invokeEdgeFunction).toHaveBeenCalledWith("invoice_emit", {
      method: "POST",
      body: request,
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

describe("voidEmittedInvoice provider method", () => {
  it("posts the documentId to invoice_void and returns its data", async () => {
    const invokeEdgeFunction = vi.fn().mockResolvedValue({
      data: {
        data: {
          status: "voided",
          servicesUnmarked: 2,
          expensesUnmarked: 0,
          paymentsDeleted: 1,
        },
      },
      error: null,
    });
    const { voidEmittedInvoice } = buildInvoiceEmitProviderMethods({
      invokeEdgeFunction,
    });
    const result = await voidEmittedInvoice("fd-1");

    expect(invokeEdgeFunction).toHaveBeenCalledWith("invoice_void", {
      method: "POST",
      body: { documentId: "fd-1" },
    });
    expect(result).toEqual({
      status: "voided",
      servicesUnmarked: 2,
      expensesUnmarked: 0,
      paymentsDeleted: 1,
    });
  });

  it("throws a readable error when the edge function fails", async () => {
    const invokeEdgeFunction = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("boom"),
    });
    const { voidEmittedInvoice } = buildInvoiceEmitProviderMethods({
      invokeEdgeFunction,
    });
    await expect(voidEmittedInvoice("fd-1")).rejects.toThrow();
  });
});
