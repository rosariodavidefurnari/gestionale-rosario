import { describe, expect, it } from "vitest";

import {
  buildUnifiedCrmSuggestedActions,
  validateUnifiedCrmAnswerPayload,
} from "./unifiedCrmAnswer.ts";

describe("unifiedCrmAnswer", () => {
  it("validates a read-only launcher payload", () => {
    const result = validateUnifiedCrmAnswerPayload({
      model: "gpt-5.2",
      question: "  Dammi un riepilogo rapido.  ",
      context: {
        meta: {
          scope: "crm_read_snapshot",
        },
        snapshot: {
          counts: {},
        },
        registries: {
          semantic: {},
          capability: {},
        },
      },
    });

    expect(result.error).toBeNull();
    expect(result.data?.question).toBe("Dammi un riepilogo rapido.");
  });

  it("rejects payloads without the expected read-only scope", () => {
    const result = validateUnifiedCrmAnswerPayload({
      model: "gpt-5.2",
      question: "Che cosa devo controllare?",
      context: {
        meta: {
          scope: "annual_operations",
        },
        snapshot: {},
        registries: {},
      },
    });

    expect(result.error).toContain("scope read-only atteso");
  });

  it("builds deterministic handoff suggestions for payment questions", () => {
    const actions = buildUnifiedCrmSuggestedActions({
      question: "Chi mi deve ancora pagare?",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
        snapshot: {
          recentClients: [
            {
              clientId: "client-1",
            },
          ],
          openQuotes: [
            {
              quoteId: "quote-1",
              clientId: "client-1",
              projectId: "project-1",
              status: "accettato",
            },
          ],
          activeProjects: [
            {
              projectId: "project-1",
            },
          ],
          pendingPayments: [
            {
              paymentId: "payment-1",
              quoteId: "quote-1",
              clientId: "client-1",
              projectId: "project-1",
            },
          ],
          recentExpenses: [],
        },
        registries: {
          semantic: {},
          capability: {},
        },
      },
    });

    expect(actions[0]).toEqual(
      expect.objectContaining({
        resource: "quotes",
        kind: "show",
        href: "/#/quotes/quote-1/show",
      }),
    );
    expect(actions.some((action) => action.capabilityActionId === "quote_create_payment")).toBe(
      true,
    );
  });
});
