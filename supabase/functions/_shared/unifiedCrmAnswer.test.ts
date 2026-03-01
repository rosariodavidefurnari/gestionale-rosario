import { describe, expect, it } from "vitest";

import {
  buildUnifiedCrmPaymentDraftFromContext,
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
        recommended: true,
      }),
    );
    expect(actions[0]?.recommendationReason).toContain("verificare il preventivo");
    expect(actions.some((action) => action.capabilityActionId === "quote_create_payment")).toBe(
      true,
    );
    expect(
      actions.find((action) => action.capabilityActionId === "quote_create_payment")?.href,
    ).toContain("launcher_source=unified_ai_launcher");
  });

  it("prioritizes the approved payment action when the question already asks to register it", () => {
    const actions = buildUnifiedCrmSuggestedActions({
      question: "Da dove posso registrare un pagamento sul preventivo aperto?",
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
          pendingPayments: [],
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
        kind: "approved_action",
        capabilityActionId: "quote_create_payment",
        href:
          "/#/payments/create?quote_id=quote-1&client_id=client-1&project_id=project-1&launcher_action=quote_create_payment&launcher_source=unified_ai_launcher",
        recommended: true,
      }),
    );
    expect(actions[0]?.recommendationReason).toContain("precompilato");
  });

  it("adds payment type and launcher context when the question implies a saldo", () => {
    const actions = buildUnifiedCrmSuggestedActions({
      question: "Come posso registrare il saldo del progetto attivo?",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
        snapshot: {
          recentClients: [],
          openQuotes: [],
          activeProjects: [
            {
              projectId: "project-1",
              clientId: "client-1",
            },
          ],
          pendingPayments: [],
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
        capabilityActionId: "project_quick_payment",
        href:
          "/#/projects/project-1/show?launcher_source=unified_ai_launcher&launcher_action=project_quick_payment&open_dialog=quick_payment&payment_type=saldo",
      }),
    );
  });

  it("builds a narrow payment write-draft for the open quote when the question asks to prepare it", () => {
    const draft = buildUnifiedCrmPaymentDraftFromContext({
      question: "Preparami una bozza saldo dal preventivo aperto.",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
        snapshot: {
          openQuotes: [
            {
              quoteId: "quote-1",
              clientId: "client-1",
              projectId: "project-1",
              status: "accettato",
              remainingAmount: 450,
            },
          ],
        },
        registries: {
          semantic: {},
          capability: {},
        },
      },
    });

    expect(draft).toEqual(
      expect.objectContaining({
        originActionId: "quote_create_payment",
        quoteId: "quote-1",
        clientId: "client-1",
        projectId: "project-1",
        paymentType: "saldo",
        amount: 450,
        status: "in_attesa",
        href:
          "/#/payments/create?quote_id=quote-1&client_id=client-1&project_id=project-1&payment_type=saldo&amount=450&status=in_attesa&launcher_source=unified_ai_launcher&launcher_action=quote_create_payment&draft_kind=payment_create",
      }),
    );
  });
});
