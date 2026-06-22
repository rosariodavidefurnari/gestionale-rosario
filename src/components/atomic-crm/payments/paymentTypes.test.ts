import { describe, expect, it } from "vitest";

import {
  isCashNeutralPaymentStatus,
  isCollectedPaymentStatus,
  isOpenReceivablePaymentStatus,
  isWrittenOffPaymentStatus,
  openReceivablePaymentStatusInFilter,
  paymentStatusLabels,
  requiresPaymentWriteOffMetadata,
} from "./paymentTypes";

describe("payment status semantics", () => {
  it("keeps cash, open receivables, and write-offs distinct", () => {
    expect(isCollectedPaymentStatus("ricevuto")).toBe(true);
    expect(isOpenReceivablePaymentStatus("ricevuto")).toBe(false);
    expect(isWrittenOffPaymentStatus("ricevuto")).toBe(false);

    expect(isOpenReceivablePaymentStatus("in_attesa")).toBe(true);
    expect(isOpenReceivablePaymentStatus("scaduto")).toBe(true);

    expect(isWrittenOffPaymentStatus("perso")).toBe(true);
    expect(requiresPaymentWriteOffMetadata("perso")).toBe(true);
    expect(isOpenReceivablePaymentStatus("perso")).toBe(false);
    expect(isCollectedPaymentStatus("perso")).toBe(false);
    expect(requiresPaymentWriteOffMetadata("scaduto")).toBe(false);

    expect(isCashNeutralPaymentStatus("in_attesa")).toBe(true);
    expect(isCashNeutralPaymentStatus("scaduto")).toBe(true);
    expect(isCashNeutralPaymentStatus("perso")).toBe(true);
  });

  it("exports the deterministic PostgREST filter for open receivables", () => {
    expect(openReceivablePaymentStatusInFilter).toBe("(in_attesa,scaduto)");
  });

  it("labels written-off receivables as operational credit loss", () => {
    expect(paymentStatusLabels.perso).toBe("Credito perso");
  });
});
