import { describe, it, expect } from "vitest";

import { getAnnualOperationsContextFromResources } from "./dataProviderAnalyticsContext";

/**
 * F1 controller (QW2 B2 — money, no second truth): the AI annual context's
 * `outstanding_receivables_total` metric MUST come from the canonical view
 * `client_commercial_position` (same source as the dashboard card), NOT from
 * `pendingPaymentsTotal`. This test is FALSIFIABLE: payments are empty (so
 * pendingPaymentsTotal = 0) while client_commercial_position carries a distinct
 * non-zero residue. If anyone reverts the wiring to pass pendingPaymentsTotal,
 * the metric becomes 0 ≠ Σ balance_due and this test goes RED.
 */
const makeProvider = (
  ccpRows: Array<{ client_id: string; balance_due: number }>,
) => ({
  getList: async (resource: string) => {
    if (resource === "client_commercial_position") {
      return { data: ccpRows, total: ccpRows.length };
    }
    // payments / quotes / services / projects / clients / expenses
    return { data: [], total: 0 };
  },
});

describe("getAnnualOperationsContextFromResources (QW2 B2 same-source)", () => {
  it("derives outstanding_receivables_total from client_commercial_position (Σ max(0, balance_due)), not pendingPaymentsTotal", async () => {
    const provider = makeProvider([
      { client_id: "c1", balance_due: 1000 },
      { client_id: "c2", balance_due: 500 },
      { client_id: "c3", balance_due: -200 }, // over-collected → clamped out
    ]);

    const context = await getAnnualOperationsContextFromResources(
      // only getList is used by the builder
      provider as never,
      2026,
    );

    const metric = context.metrics.find(
      (m) => m.id === "outstanding_receivables_total",
    );
    expect(metric).toBeDefined();
    // 1000 + 500 + max(0,-200) = 1500 (the view residue), NOT 0 (pending rows)
    expect(metric?.value).toBe(1500);

    // pending stays 0 here (no payment rows) — proves the two are distinct
    const pending = context.metrics.find(
      (m) => m.id === "pending_payments_total",
    );
    expect(pending?.value).toBe(0);
  });
});
