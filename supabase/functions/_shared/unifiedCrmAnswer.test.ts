import { describe, expect, it } from "vitest";

import {
  buildTravelExpenseCreateHref,
  buildUnifiedCrmPaymentDraftFromContext,
  buildUnifiedCrmTravelExpenseAnswerMarkdown,
  buildUnifiedCrmTravelExpenseEstimate,
  buildUnifiedCrmTravelExpenseSuggestedActions,
  buildUnifiedCrmSuggestedActions,
  parseUnifiedCrmTravelExpenseQuestion,
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
    expect(actions[0]?.recommendationReason).toContain(
      "verificare il preventivo",
    );
    expect(
      actions.some(
        (action) => action.capabilityActionId === "quote_create_payment",
      ),
    ).toBe(true);
    expect(
      actions.find(
        (action) => action.capabilityActionId === "quote_create_payment",
      )?.href,
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
        href: "/#/payments/create?quote_id=quote-1&client_id=client-1&project_id=project-1&launcher_action=quote_create_payment&launcher_source=unified_ai_launcher",
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
        href: "/#/projects/project-1/show?launcher_source=unified_ai_launcher&launcher_action=project_quick_payment&open_dialog=quick_payment&payment_type=saldo",
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
        draftKind: "payment_create",
        quoteId: "quote-1",
        clientId: "client-1",
        projectId: "project-1",
        paymentType: "saldo",
        amount: 450,
        status: "in_attesa",
        href: "/#/payments/create?quote_id=quote-1&client_id=client-1&project_id=project-1&payment_type=saldo&amount=450&status=in_attesa&launcher_source=unified_ai_launcher&launcher_action=quote_create_payment&draft_kind=payment_create",
      }),
    );
  });

  it("builds a narrow quick-payment write-draft for the active project when the question asks to prepare it", () => {
    const draft = buildUnifiedCrmPaymentDraftFromContext({
      question: "Preparami il saldo del progetto attivo.",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
        snapshot: {
          openQuotes: [],
          activeProjects: [
            {
              projectId: "project-1",
              clientId: "client-1",
              totalFees: 1800,
              totalExpenses: 200,
              balanceDue: 950,
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
        originActionId: "project_quick_payment",
        draftKind: "project_quick_payment",
        quoteId: null,
        clientId: "client-1",
        projectId: "project-1",
        paymentType: "saldo",
        amount: 950,
        status: "in_attesa",
        href: "/#/projects/project-1/show?project_id=project-1&client_id=client-1&launcher_source=unified_ai_launcher&launcher_action=project_quick_payment&open_dialog=quick_payment&payment_type=saldo&amount=950&status=in_attesa&draft_kind=project_quick_payment",
      }),
    );
  });

  it("parses a travel-expense question with route and round trip", () => {
    const parsed = parseUnifiedCrmTravelExpenseQuestion({
      question:
        "Devo registrare una spesa oggi: ho percorso la tratta Valguarnera Caropepe (EN) - Catania / andata e ritorno. Calcola i km.",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          businessTimezone: "Europe/Rome",
        },
      },
    });

    expect(parsed).toEqual(
      expect.objectContaining({
        origin: "Valguarnera Caropepe (EN)",
        destination: "Catania",
        isRoundTrip: true,
      }),
    );
    expect(parsed?.expenseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds a travel-expense handoff and answer grounded on routing data", () => {
    const estimate = buildUnifiedCrmTravelExpenseEstimate({
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
        registries: {
          semantic: {
            rules: {
              travelReimbursement: {
                defaultKmRate: 0.19,
              },
            },
          },
        },
      },
      parsedQuestion: {
        origin: "Valguarnera Caropepe (EN)",
        destination: "Catania",
        isRoundTrip: true,
        expenseDate: "2026-03-01",
      },
      originLabel: "Valguarnera Caropepe, EN, Italy",
      destinationLabel: "Catania, CT, Italy",
      oneWayDistanceMeters: 80488.4,
    });

    expect(estimate).toEqual(
      expect.objectContaining({
        oneWayDistanceKm: 80.49,
        totalDistanceKm: 160.98,
        kmRate: 0.19,
        reimbursementAmount: 30.59,
      }),
    );

    expect(
      buildTravelExpenseCreateHref({
        routePrefix: "/#/",
        estimate,
      }),
    ).toContain("/#/expenses/create?");

    const actions = buildUnifiedCrmTravelExpenseSuggestedActions({
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
      },
      estimate,
    });

    expect(actions[0]).toEqual(
      expect.objectContaining({
        capabilityActionId: "expense_create_km",
        resource: "expenses",
        recommended: true,
      }),
    );
    expect(actions[0]?.href).toContain("expense_type=spostamento_km");
    expect(actions[0]?.href).toContain("km_distance=160.98");
    expect(actions[0]?.href).toContain("launcher_action=expense_create_km");

    expect(
      buildUnifiedCrmTravelExpenseAnswerMarkdown({
        estimate,
      }),
    ).toContain("160,98 km");
  });
});
