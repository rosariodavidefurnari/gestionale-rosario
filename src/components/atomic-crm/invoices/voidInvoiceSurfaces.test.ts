import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import {
  invalidateVoidedInvoiceSurfaces,
  isFinancialDocumentsListKey,
  VOID_INVALIDATED_RESOURCES,
} from "./voidInvoiceSurfaces";

const seed = (qc: QueryClient, key: readonly unknown[]) =>
  qc.setQueryData(key as unknown[], []);

const invalidated = (qc: QueryClient, key: readonly unknown[]) =>
  qc.getQueryState(key as unknown[])?.isInvalidated === true;

describe("invalidateVoidedInvoiceSurfaces", () => {
  it("invalidates every surface that derives state from the voided invoice", () => {
    const qc = new QueryClient();
    for (const r of VOID_INVALIDATED_RESOURCES) {
      seed(qc, [r, "getList", {}]);
    }
    seed(qc, ["financial_documents_summary", "getList", {}]);

    invalidateVoidedInvoiceSurfaces(qc);

    for (const r of VOID_INVALIDATED_RESOURCES) {
      expect(invalidated(qc, [r, "getList", {}]), r).toBe(true);
    }
    expect(
      invalidated(qc, ["financial_documents_summary", "getList", {}]),
    ).toBe(true);
  });

  it("does NOT invalidate the voided document's getOne (would refetch a deleted row -> coerce error)", () => {
    const qc = new QueryClient();
    seed(qc, ["financial_documents_summary", "getOne", { id: "deleted-doc" }]);
    seed(qc, ["financial_documents_summary", "getList", {}]);

    invalidateVoidedInvoiceSurfaces(qc);

    expect(
      invalidated(qc, [
        "financial_documents_summary",
        "getOne",
        { id: "deleted-doc" },
      ]),
    ).toBe(false);
    // the list IS refreshed so the voided row disappears
    expect(
      invalidated(qc, ["financial_documents_summary", "getList", {}]),
    ).toBe(true);
  });

  it("the list-key predicate matches getList only, never getOne", () => {
    expect(
      isFinancialDocumentsListKey([
        "financial_documents_summary",
        "getList",
        {},
      ]),
    ).toBe(true);
    expect(
      isFinancialDocumentsListKey([
        "financial_documents_summary",
        "getOne",
        { id: "x" },
      ]),
    ).toBe(false);
    expect(isFinancialDocumentsListKey(["services", "getList", {}])).toBe(
      false,
    );
  });

  it("includes services + payments (the surfaces the audit found stale)", () => {
    expect(VOID_INVALIDATED_RESOURCES).toContain("services");
    expect(VOID_INVALIDATED_RESOURCES).toContain("payments");
  });
});
