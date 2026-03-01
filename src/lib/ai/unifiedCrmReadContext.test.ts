import { describe, expect, it } from "vitest";

import { buildCrmCapabilityRegistry } from "@/lib/semantics/crmCapabilityRegistry";
import { buildCrmSemanticRegistry } from "@/lib/semantics/crmSemanticRegistry";

import { buildUnifiedCrmReadContext } from "./unifiedCrmReadContext";

describe("unifiedCrmReadContext", () => {
  it("builds a read-only CRM snapshot with recent records and totals", () => {
    const context = buildUnifiedCrmReadContext({
      clients: [
        {
          id: "client-1",
          name: "Mario Rossi",
          client_type: "privato_wedding",
          tags: [],
          created_at: "2026-02-10T10:00:00.000Z",
          updated_at: "2026-02-10T10:00:00.000Z",
        },
      ],
      quotes: [
        {
          id: "quote-1",
          client_id: "client-1",
          project_id: "project-1",
          service_type: "wedding",
          all_day: true,
          amount: 2200,
          status: "in_trattativa",
          created_at: "2026-02-20T10:00:00.000Z",
          updated_at: "2026-02-20T10:00:00.000Z",
        },
        {
          id: "quote-2",
          client_id: "client-1",
          service_type: "wedding",
          all_day: true,
          amount: 1800,
          status: "saldato",
          created_at: "2026-01-01T10:00:00.000Z",
          updated_at: "2026-01-01T10:00:00.000Z",
        },
      ],
      projects: [
        {
          id: "project-1",
          client_id: "client-1",
          name: "Wedding Mario",
          category: "wedding",
          status: "in_corso",
          all_day: true,
          created_at: "2026-02-01T10:00:00.000Z",
          updated_at: "2026-02-01T10:00:00.000Z",
        },
      ],
      services: [
        {
          id: "service-1",
          project_id: "project-1",
          service_date: "2026-02-20T00:00:00.000Z",
          all_day: true,
          is_taxable: true,
          service_type: "riprese_montaggio",
          fee_shooting: 1600,
          fee_editing: 400,
          fee_other: 200,
          discount: 0,
          km_distance: 0,
          km_rate: 0.19,
          created_at: "2026-02-18T10:00:00.000Z",
        },
      ],
      payments: [
        {
          id: "payment-1",
          client_id: "client-1",
          quote_id: "quote-1",
          project_id: "project-1",
          payment_type: "saldo",
          amount: 1200,
          status: "in_attesa",
          payment_date: "2026-03-10T00:00:00.000Z",
          created_at: "2026-02-22T10:00:00.000Z",
        },
        {
          id: "payment-2",
          client_id: "client-1",
          payment_type: "saldo",
          amount: 1000,
          status: "ricevuto",
          payment_date: "2026-02-15T00:00:00.000Z",
          created_at: "2026-02-15T10:00:00.000Z",
        },
      ],
      expenses: [
        {
          id: "expense-1",
          client_id: "client-1",
          project_id: "project-1",
          expense_date: "2026-02-18T00:00:00.000Z",
          expense_type: "noleggio",
          amount: 300,
          description: "Noleggio luci",
          created_at: "2026-02-18T10:00:00.000Z",
        },
      ],
      semanticRegistry: buildCrmSemanticRegistry(),
      capabilityRegistry: buildCrmCapabilityRegistry(),
      generatedAt: "2026-02-28T22:30:00.000Z",
    });

    expect(context.meta.scope).toBe("crm_read_snapshot");
    expect(context.snapshot.counts.openQuotes).toBe(1);
    expect(context.snapshot.totals.pendingPaymentsAmount).toBe(1200);
    expect(context.snapshot.totals.expensesAmount).toBe(300);
    expect(context.snapshot.openQuotes[0]?.clientId).toBe("client-1");
    expect(context.snapshot.openQuotes[0]?.linkedPaymentsTotal).toBe(1200);
    expect(context.snapshot.openQuotes[0]?.remainingAmount).toBe(1000);
    expect(context.snapshot.pendingPayments[0]?.quoteId).toBe("quote-1");
    expect(context.snapshot.pendingPayments[0]?.projectId).toBe("project-1");
    expect(context.snapshot.openQuotes[0]?.statusLabel).toBe("In trattativa");
    expect(context.snapshot.pendingPayments[0]?.statusLabel).toBe("In attesa");
    expect(context.snapshot.recentExpenses[0]?.expenseTypeLabel).toBe("Noleggio");
    expect(context.snapshot.activeProjects[0]?.totalFees).toBe(2200);
    expect(context.snapshot.activeProjects[0]?.totalExpenses).toBe(300);
    expect(context.snapshot.activeProjects[0]?.balanceDue).toBe(2500);
    expect(context.registries.capability.routing.mode).toBe("hash");
    expect(context.registries.semantic.rules.invoiceImport.customerInvoiceResource).toBe(
      "payments",
    );
    expect(context.caveats[0]).toContain("read-only");
  });
});
