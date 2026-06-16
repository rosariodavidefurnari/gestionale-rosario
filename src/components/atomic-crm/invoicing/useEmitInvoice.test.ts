import { describe, it, expect } from "vitest";

import { buildEmitConfirmMessage, getInvoiceEmitGate } from "./useEmitInvoice";

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
