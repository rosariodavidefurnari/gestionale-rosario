import { describe, it, expect } from "vitest";

import type { Service } from "../types";
import {
  buildProjectInvoiceEmitPath,
  getServiceBillingState,
  isServiceBilled,
} from "./serviceBilling";

const svc = (invoice_ref?: string | null): Pick<Service, "invoice_ref"> =>
  ({ invoice_ref: invoice_ref ?? undefined }) as Pick<Service, "invoice_ref">;

describe("isServiceBilled", () => {
  it("true when invoice_ref has content", () => {
    expect(isServiceBilled(svc("FT-1/2026"))).toBe(true);
  });
  it("false when invoice_ref is missing", () => {
    expect(isServiceBilled(svc())).toBe(false);
    expect(isServiceBilled(svc(null))).toBe(false);
  });
  it("false when invoice_ref is empty or whitespace", () => {
    expect(isServiceBilled(svc(""))).toBe(false);
    expect(isServiceBilled(svc("   "))).toBe(false);
  });
});

describe("getServiceBillingState", () => {
  it("'Fatturato' when billed", () => {
    expect(getServiceBillingState(svc("FT-1"))).toEqual({
      label: "Fatturato",
      tone: "settled",
    });
  });
  it("'Da fatturare' when not billed", () => {
    expect(getServiceBillingState(svc())).toEqual({
      label: "Da fatturare",
      tone: "pending",
    });
  });
});

describe("buildProjectInvoiceEmitPath", () => {
  it("targets the project show with invoiceDraft auto-open", () => {
    expect(buildProjectInvoiceEmitPath("p1")).toBe(
      "/projects/p1/show?invoiceDraft=true",
    );
  });
});
