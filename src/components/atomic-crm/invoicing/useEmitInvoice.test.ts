// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

import type { InvoiceDraftInput } from "./invoiceDraftTypes";
import {
  buildEmitConfirmMessage,
  getInvoiceEmitGate,
  runEmitInvoice,
  type EmitInvoiceDeps,
} from "./useEmitInvoice";

const draftFixture = (): InvoiceDraftInput =>
  ({
    client: { id: "c1", name: "Cliente" },
    source: { kind: "project", id: "p1", label: "Progetto" },
    lineItems: [
      {
        description: "Servizio",
        quantity: 1,
        unitPrice: 1000,
        kind: "service",
      },
    ],
    serviceIds: ["s1"],
    expenseIds: [],
  }) as unknown as InvoiceDraftInput;

describe("runEmitInvoice", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits with amounts derived from the draft when no duplicate exists", async () => {
    const emitInvoice = vi
      .fn()
      .mockResolvedValue({ status: "emitted", financialDocumentId: "fd1" });
    const getList = vi.fn().mockResolvedValue({ data: [], total: 0 });
    const deps = { getList, emitInvoice } as unknown as EmitInvoiceDeps;

    const outcome = await runEmitInvoice(deps, draftFixture(), {
      documentNumber: "FT-1",
      issueDate: "2026-06-17",
    });

    expect(getList).toHaveBeenCalledWith(
      "financial_documents_summary",
      expect.objectContaining({
        filter: {
          "client_id@eq": "c1",
          "document_number@eq": "FT-1",
          "direction@eq": "outbound",
        },
      }),
    );
    expect(emitInvoice).toHaveBeenCalledWith({
      clientId: "c1",
      source: { kind: "project", id: "p1" },
      documentNumber: "FT-1",
      issueDate: "2026-06-17",
      grossTaxable: 1000,
      stampAmount: 2,
      grossTotal: 1002,
      netCollectable: 1000,
      serviceIds: ["s1"],
      expenseIds: [],
    });
    expect(outcome.status).toBe("emitted");
  });

  it("sends billingProfileId when the draft has a selected billing profile", async () => {
    const emitInvoice = vi
      .fn()
      .mockResolvedValue({ status: "emitted", financialDocumentId: "fd1" });
    const getList = vi.fn().mockResolvedValue({ data: [], total: 0 });
    const deps = { getList, emitInvoice } as unknown as EmitInvoiceDeps;
    const draft = {
      ...draftFixture(),
      billingProfile: { id: "profile-live" },
    } as unknown as InvoiceDraftInput;

    await runEmitInvoice(deps, draft, {
      documentNumber: "FT-1",
      issueDate: "2026-06-17",
    });

    expect(emitInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ billingProfileId: "profile-live" }),
    );
  });

  it("returns cancelled and does NOT emit when the user declines the duplicate confirm", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const emitInvoice = vi.fn();
    const getList = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "x" }], total: 1 });
    const deps = { getList, emitInvoice } as unknown as EmitInvoiceDeps;

    const outcome = await runEmitInvoice(deps, draftFixture(), {
      documentNumber: "FT-1",
      issueDate: "2026-06-17",
    });

    expect(outcome).toEqual({ status: "cancelled" });
    expect(emitInvoice).not.toHaveBeenCalled();
  });
});

describe("buildEmitConfirmMessage", () => {
  it("mentions the document number and asks to confirm", () => {
    const message = buildEmitConfirmMessage("FT-1/2026");
    expect(message).toContain("FT-1/2026");
    expect(message).toMatch(/emettere comunque/i);
  });
});

describe("getInvoiceEmitGate", () => {
  const okBilling = { ok: true, missing: [] as string[] };

  it("allows emit for a project source with complete data", () => {
    const gate = getInvoiceEmitGate({
      sourceKind: "project",
      hasPriorReceived: false,
      billing: okBilling,
      documentNumber: "FT-1",
    });
    expect(gate.isEmittableSource).toBe(true);
    expect(gate.canEmit).toBe(true);
    expect(gate.blockedReason).toBeNull();
  });

  it("allows emit for a client source", () => {
    const gate = getInvoiceEmitGate({
      sourceKind: "client",
      hasPriorReceived: false,
      billing: okBilling,
      documentNumber: "FT-1",
    });
    expect(gate.canEmit).toBe(true);
  });

  it("hides the button for quote/service sources", () => {
    for (const sourceKind of ["quote", "service"]) {
      const gate = getInvoiceEmitGate({
        sourceKind,
        hasPriorReceived: false,
        billing: okBilling,
        documentNumber: "FT-1",
      });
      expect(gate.isEmittableSource).toBe(false);
      expect(gate.canEmit).toBe(false);
      expect(gate.blockedReason).toBeNull(); // hidden, not a reason shown
    }
  });

  it("blocks with a reason when a prior acconto is present", () => {
    const gate = getInvoiceEmitGate({
      sourceKind: "project",
      hasPriorReceived: true,
      billing: okBilling,
      documentNumber: "FT-1",
    });
    expect(gate.canEmit).toBe(false);
    expect(gate.blockedReason).toMatch(/acconto pregresso/i);
  });

  it("blocks listing the missing billing fields", () => {
    const gate = getInvoiceEmitGate({
      sourceKind: "project",
      hasPriorReceived: false,
      billing: { ok: false, missing: ["P.IVA emittente"] },
      documentNumber: "FT-1",
    });
    expect(gate.canEmit).toBe(false);
    expect(gate.blockedReason).toMatch(/P\.IVA emittente/);
  });

  it("blocks when the document number is empty", () => {
    const gate = getInvoiceEmitGate({
      sourceKind: "project",
      hasPriorReceived: false,
      billing: okBilling,
      documentNumber: "   ",
    });
    expect(gate.canEmit).toBe(false);
    expect(gate.blockedReason).toMatch(/numero fattura/i);
  });
});
