import { describe, it, expect } from "vitest";

import { canVoidEmittedInvoice, voidReasonMessage } from "./invoiceVoid.ts";

const outboundInvoice = {
  direction: "outbound",
  document_type: "customer_invoice",
};

describe("canVoidEmittedInvoice", () => {
  it("ok when all linked payments are in_attesa", () => {
    expect(
      canVoidEmittedInvoice(outboundInvoice, [{ id: "p1", status: "in_attesa" }]),
    ).toEqual({ ok: true });
  });

  it("ok when a linked payment is scaduto (cash-neutral, unpaid)", () => {
    expect(
      canVoidEmittedInvoice(outboundInvoice, [
        { id: "p1", status: "scaduto" },
        { id: "p2", status: "in_attesa" },
      ]),
    ).toEqual({ ok: true });
  });

  it("refuses when any linked payment is ricevuto (real cash)", () => {
    const r = canVoidEmittedInvoice(outboundInvoice, [
      { id: "p1", status: "in_attesa" },
      { id: "p2", status: "ricevuto" },
    ]);
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe("incassata");
  });

  it("refuses when there are no linked payments (historical/imported doc)", () => {
    const r = canVoidEmittedInvoice(outboundInvoice, []);
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe("non_app_emessa");
  });

  it("refuses inbound documents and credit notes", () => {
    expect(
      canVoidEmittedInvoice(
        { direction: "inbound", document_type: "supplier_invoice" },
        [{ id: "p1", status: "in_attesa" }],
      ).ok,
    ).toBe(false);
    expect(
      canVoidEmittedInvoice(
        { direction: "outbound", document_type: "customer_credit_note" },
        [{ id: "p1", status: "in_attesa" }],
      ).ok,
    ).toBe(false);
  });

  it("refuses an out-of-domain payment status (DB-1 guard, not dead code)", () => {
    const r = canVoidEmittedInvoice(outboundInvoice, [
      { id: "p1", status: "parziale" },
    ]);
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe("stato_inatteso");
  });
});

describe("voidReasonMessage", () => {
  it("maps known reasons to Italian messages", () => {
    expect(voidReasonMessage("incassata")).toMatch(/incassata/i);
    expect(voidReasonMessage("non_app_emessa")).toMatch(/non e' stata emessa/i);
    expect(voidReasonMessage("qualcosa")).toMatch(/non consentito/i);
  });
});
