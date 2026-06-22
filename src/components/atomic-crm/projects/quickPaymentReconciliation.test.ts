import { describe, it, expect } from "vitest";
import {
  decideQuickPaymentTarget,
  wouldOrphanExpectedPayment,
  type ExpectedPaymentCandidate,
} from "./quickPaymentReconciliation";

const exp = (
  id: string,
  over: Partial<ExpectedPaymentCandidate> = {},
): ExpectedPaymentCandidate => ({
  id,
  amount: 1000,
  status: "in_attesa",
  financial_document_id: "doc-1",
  ...over,
});

const draft = (
  over: Partial<{ status: string; payment_type: string }> = {},
) => ({ status: "ricevuto", payment_type: "saldo", ...over });

describe("decideQuickPaymentTarget", () => {
  it("settles the single emit-linked expected payment when recording a collection", () => {
    expect(decideQuickPaymentTarget([exp("p1")], draft())).toEqual({
      action: "settle",
      paymentId: "p1",
    });
  });

  it("creates when there is no emit-linked expected payment", () => {
    expect(decideQuickPaymentTarget([], draft())).toEqual({ action: "create" });
    expect(
      decideQuickPaymentTarget(
        [exp("p1", { financial_document_id: null })],
        draft(),
      ),
    ).toEqual({ action: "create" });
  });

  it("creates when the only linked candidate is not in_attesa anymore", () => {
    expect(
      decideQuickPaymentTarget([exp("p1", { status: "ricevuto" })], draft()),
    ).toEqual({ action: "create" });
    expect(
      decideQuickPaymentTarget([exp("p1", { status: "perso" })], draft()),
    ).toEqual({ action: "create" });
  });

  it("is ambiguous (ask which invoice) when >1 emit-linked expected payment", () => {
    const d = decideQuickPaymentTarget([exp("p1"), exp("p2")], draft());
    expect(d.action).toBe("ambiguous");
    if (d.action === "ambiguous") {
      expect(d.candidates.map((c) => c.id)).toEqual(["p1", "p2"]);
    }
  });

  it("creates when not recording a collection (status != ricevuto)", () => {
    expect(
      decideQuickPaymentTarget([exp("p1")], draft({ status: "in_attesa" })),
    ).toEqual({ action: "create" });
  });

  // B1: payment_type gate — a non-absorbable type must NEVER settle a saldo
  // expected payment (would corrupt invoice + cash). Symmetric to FIX-4.
  it("creates for rimborso_spese even with a linked expected payment (B1 gate)", () => {
    expect(
      decideQuickPaymentTarget(
        [exp("p1")],
        draft({ payment_type: "rimborso_spese" }),
      ),
    ).toEqual({ action: "create" });
  });

  it("creates for rimborso even with a linked expected payment (B1 gate)", () => {
    expect(
      decideQuickPaymentTarget(
        [exp("p1")],
        draft({ payment_type: "rimborso" }),
      ),
    ).toEqual({ action: "create" });
  });

  it("settles for acconto and parziale (absorbable types)", () => {
    expect(
      decideQuickPaymentTarget([exp("p1")], draft({ payment_type: "acconto" })),
    ).toEqual({ action: "settle", paymentId: "p1" });
    expect(
      decideQuickPaymentTarget(
        [exp("p1")],
        draft({ payment_type: "parziale" }),
      ),
    ).toEqual({ action: "settle", paymentId: "p1" });
  });
});

describe("wouldOrphanExpectedPayment", () => {
  it("true when recording a collection would settle/ambiguate an emit-linked expected payment", () => {
    expect(wouldOrphanExpectedPayment([exp("p1")], draft())).toBe(true); // settle
    expect(wouldOrphanExpectedPayment([exp("p1"), exp("p2")], draft())).toBe(
      true,
    ); // ambiguous
  });

  it("false when creating here would NOT orphan (no candidate / not collection / non-absorbable)", () => {
    expect(wouldOrphanExpectedPayment([], draft())).toBe(false);
    expect(
      wouldOrphanExpectedPayment(
        [exp("p1", { financial_document_id: null })],
        draft(),
      ),
    ).toBe(false);
    expect(
      wouldOrphanExpectedPayment([exp("p1")], draft({ status: "in_attesa" })),
    ).toBe(false);
    expect(
      wouldOrphanExpectedPayment(
        [exp("p1")],
        draft({ payment_type: "rimborso_spese" }),
      ),
    ).toBe(false);
  });
});
