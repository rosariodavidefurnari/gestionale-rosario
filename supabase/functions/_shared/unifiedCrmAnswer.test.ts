import { describe, expect, it } from "vitest";

import {
  buildExpenseCreateHref,
  buildProjectQuickEpisodeHref,
  buildServiceCreateHref,
  buildUnifiedCrmExpenseCreateAnswerMarkdown,
  buildUnifiedCrmExpenseCreateSuggestedActions,
  buildUnifiedCrmTravelExpenseQuestionCandidates,
  buildUnifiedCrmProjectQuickEpisodeAnswerMarkdown,
  buildUnifiedCrmProjectQuickEpisodeSuggestedActions,
  buildUnifiedCrmServiceCreateAnswerMarkdown,
  buildUnifiedCrmServiceCreateSuggestedActions,
  buildTravelExpenseCreateHref,
  buildUnifiedCrmPaymentDraftFromContext,
  buildUnifiedCrmTravelExpenseAnswerMarkdown,
  buildUnifiedCrmTravelExpenseEstimate,
  buildUnifiedCrmTravelExpenseSuggestedActions,
  buildUnifiedCrmSuggestedActions,
  parseUnifiedCrmExpenseCreateQuestion,
  parseUnifiedCrmProjectQuickEpisodeQuestion,
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

  it("accepts launcher questions up to the extended max length", () => {
    const result = validateUnifiedCrmAnswerPayload({
      model: "gpt-5.2",
      question: "a".repeat(1200),
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
    expect(result.data?.question).toHaveLength(1200);
  });

  it("rejects launcher questions beyond the extended max length", () => {
    const result = validateUnifiedCrmAnswerPayload({
      model: "gpt-5.2",
      question: "a".repeat(1201),
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

    expect(result.error).toContain("Limite: 1200 caratteri");
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

  it("suggests contact-first handoffs for referent questions", () => {
    const actions = buildUnifiedCrmSuggestedActions({
      question: "Chi e il referente da contattare per questo cliente?",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
        snapshot: {
          recentClients: [],
          recentContacts: [
            {
              contactId: "101",
              clientId: "client-1",
              linkedProjects: [{ projectId: "project-1", isPrimary: true }],
            },
          ],
          openQuotes: [],
          activeProjects: [],
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
        resource: "contacts",
        kind: "show",
        href: "/#/contacts/101/show",
        recommended: true,
      }),
    );
    expect(actions[1]).toEqual(
      expect.objectContaining({
        resource: "clients",
        href: "/#/clients/client-1/show",
      }),
    );
    expect(actions[2]).toEqual(
      expect.objectContaining({
        resource: "projects",
        href: "/#/projects/project-1/show",
      }),
    );
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

  it("parses a travel route estimate request even without explicit expense wording", () => {
    const parsed = parseUnifiedCrmTravelExpenseQuestion({
      question:
        "Calcola i km andata e ritorno per la tratta Valguarnera Caropepe (EN) - Catania.",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          businessTimezone: "Europe/Rome",
        },
      },
    });

    expect(parsed).toEqual({
      origin: "Valguarnera Caropepe (EN)",
      destination: "Catania",
      isRoundTrip: true,
      expenseDate: null,
    });
  });

  it("builds fallback route candidates for an undelimited place sequence", () => {
    const candidates = buildUnifiedCrmTravelExpenseQuestionCandidates({
      question:
        "aiutami a calcolare la distanza ed il costo di uno spostamento, devi calcolare Catania Valguarnera Caropepe andata e ritorno",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          businessTimezone: "Europe/Rome",
        },
      },
    });

    expect(candidates).toContainEqual({
      origin: "Catania",
      destination: "Valguarnera Caropepe",
      isRoundTrip: true,
      expenseDate: null,
    });
  });

  it("does not parse a travel mention when there is no expense or route-estimate intent", () => {
    const parsed = parseUnifiedCrmTravelExpenseQuestion({
      question:
        "Ho fatto la tratta Valguarnera Caropepe (EN) - Catania per il progetto Vale.",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          businessTimezone: "Europe/Rome",
        },
      },
    });

    expect(parsed).toBeNull();
  });

  it("parses a natural-language travel expense with 'fino al' and explicit italian date", () => {
    const parsed = parseUnifiedCrmTravelExpenseQuestion({
      question:
        "senti, vorrei aggiungere al servizio che ho fatto per il progetto vale il viaggio di giorno 2 febbraio 2026 una spesa di spostamento da Valguarnera europea in provincia di Enna fino al McDonald's di Acireale e bisogna calcolare sia l'andata che il ritorno",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          businessTimezone: "Europe/Rome",
        },
      },
    });

    expect(parsed).toEqual({
      origin: "Valguarnera europea in provincia di Enna",
      destination: "McDonald's di Acireale",
      isRoundTrip: true,
      expenseDate: "2026-02-02",
    });
  });

  it("does not propose payment handoff or draft when the question is really about registering a travel expense on a project", () => {
    const question =
      "senti, vorrei aggiungere al servizio che ho fatto per il progetto vale il viaggio di giorno 2 febbraio 2026 una spesa di spostamento da Valguarnera europea in provincia di Enna fino al McDonald's di Acireale e bisogna calcolare sia l'andata che il ritorno";
    const context = {
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
            remainingAmount: 156,
          },
        ],
        activeProjects: [
          {
            projectId: "project-1",
            clientId: "client-1",
            totalFees: 1000,
            totalExpenses: 0,
            balanceDue: 156,
          },
        ],
        recentExpenses: [
          {
            expenseId: "expense-1",
            projectId: "project-1",
          },
        ],
      },
      registries: {
        semantic: {},
        capability: {},
      },
    };

    const draft = buildUnifiedCrmPaymentDraftFromContext({
      question,
      context,
    });
    const actions = buildUnifiedCrmSuggestedActions({
      question,
      context,
    });

    expect(draft).toBeNull();
    expect(
      actions.some((action) =>
        [
          "quote_create_payment",
          "client_create_payment",
          "project_quick_payment",
        ].includes(action.capabilityActionId ?? ""),
      ),
    ).toBe(false);
    expect(actions[0]).toEqual(
      expect.objectContaining({
        resource: "expenses",
      }),
    );
  });

  it("parses a project quick-episode request with project match, date, notes and route candidates", () => {
    const parsed = parseUnifiedCrmProjectQuickEpisodeQuestion({
      question:
        "mi serve da inserire nel CRM un nuovo lavoro che ho fatto dentro il progetto per il viaggio: data 22 febbraio 2026 - abbiamo intervistato Roberto Lipari - come spesa di viaggio devi calcolare la tratta Valguarnera Caropepe Acireale andate e ritorno il servizio lo devi considerare ripresa e montaggio",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          businessTimezone: "Europe/Rome",
        },
        snapshot: {
          activeProjects: [
            {
              projectId: "project-viv",
              clientId: "client-1",
              projectName: "Vale il Viaggio",
              projectCategory: "produzione_tv",
              projectTvShow: "vale_il_viaggio",
            },
            {
              projectId: "project-other",
              clientId: "client-2",
              projectName: "Wedding Mario",
              projectCategory: "wedding",
              projectTvShow: null,
            },
          ],
        },
        registries: {
          semantic: {},
          capability: {},
        },
      },
    });

    expect(parsed).toEqual(
      expect.objectContaining({
        projectId: "project-viv",
        clientId: "client-1",
        projectName: "Vale il Viaggio",
        projectCategory: "produzione_tv",
        projectTvShow: "vale_il_viaggio",
        requestedLabel: "servizio",
        serviceDate: "2026-02-22",
        serviceType: "riprese_montaggio",
        notes: "Intervista a Roberto Lipari",
        isRoundTrip: true,
      }),
    );
    expect(parsed?.travelRoute).toBeNull();
    expect(parsed?.travelRouteCandidates[0]).toEqual({
      origin: "Valguarnera Caropepe",
      destination: "Acireale",
    });
    expect(parsed?.travelRouteCandidates).toContainEqual({
      origin: "Valguarnera Caropepe",
      destination: "Acireale",
    });
  });

  it("builds a quick-episode handoff with prefilled project dialog data", () => {
    const parsedQuestion = {
      projectId: "project-viv",
      clientId: "client-1",
      projectName: "Vale il Viaggio",
      projectCategory: "produzione_tv",
      projectTvShow: "vale_il_viaggio",
      requestedLabel: "servizio" as const,
      serviceDate: "2026-02-22",
      serviceType: "riprese_montaggio" as const,
      notes: "Intervista a Roberto Lipari",
      isRoundTrip: true,
      travelRoute: {
        origin: "Valguarnera Caropepe",
        destination: "Acireale",
      },
      travelRouteCandidates: [],
    };
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
        origin: "Valguarnera Caropepe",
        destination: "Acireale",
        isRoundTrip: true,
        expenseDate: "2026-02-22",
      },
      originLabel: "Valguarnera Caropepe, EN, Italy",
      destinationLabel: "Acireale, CT, Italy",
      oneWayDistanceMeters: 72123,
    });

    expect(
      buildProjectQuickEpisodeHref({
        context: {
          meta: {
            scope: "crm_read_snapshot",
            routePrefix: "/#/",
          },
        },
        parsedQuestion,
        estimate,
      }),
    ).toContain(
      "/#/projects/project-viv/show?project_id=project-viv&client_id=client-1&service_date=2026-02-22",
    );

    const actions = buildUnifiedCrmProjectQuickEpisodeSuggestedActions({
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
      },
      parsedQuestion,
      estimate,
    });

    expect(actions[0]).toEqual(
      expect.objectContaining({
        capabilityActionId: "project_quick_episode",
        resource: "projects",
        recommended: true,
      }),
    );
    expect(actions[0]?.label).toContain("questo servizio");
    expect(actions[0]?.href).toContain("open_dialog=quick_episode");
    expect(actions[0]?.href).toContain("service_type=riprese_montaggio");
    expect(actions[0]?.href).toContain("km_distance=144.24");
    expect(actions[0]?.href).toContain("location=Acireale");

    expect(
      buildUnifiedCrmProjectQuickEpisodeAnswerMarkdown({
        parsedQuestion,
        estimate,
      }),
    ).toContain("Vale il Viaggio");
    expect(
      buildUnifiedCrmProjectQuickEpisodeAnswerMarkdown({
        parsedQuestion,
        estimate,
      }),
    ).toContain("22/02/2026");
    expect(
      buildUnifiedCrmProjectQuickEpisodeAnswerMarkdown({
        parsedQuestion,
        estimate,
      }),
    ).toContain("spese extra non km");
  });

  it("builds a generic service handoff for non-tv projects", () => {
    const parsedQuestion = {
      projectId: "project-web-1",
      clientId: "client-9",
      projectName: "Sito Studio Costa",
      projectCategory: "sviluppo_web",
      projectTvShow: null,
      requestedLabel: "servizio" as const,
      serviceDate: "2026-03-01",
      serviceType: "sviluppo_web" as const,
      notes: "Landing page e aggiornamento form",
      isRoundTrip: false,
      travelRoute: null,
      travelRouteCandidates: [],
    };
    const linkedExpenseDraft = {
      clientId: "client-9",
      projectId: "project-web-1",
      clientName: "Studio Costa",
      projectName: "Sito Studio Costa",
      expenseDate: "2026-03-01",
      expenseType: "altro" as const,
      description: "Pranzo",
      amount: 18,
      markupPercent: 0,
    };

    expect(
      buildServiceCreateHref({
        context: {
          meta: {
            scope: "crm_read_snapshot",
            routePrefix: "/#/",
          },
        },
        parsedQuestion,
      }),
    ).toBe(
      "/#/services/create?project_id=project-web-1&service_date=2026-03-01&service_type=sviluppo_web&notes=Landing+page+e+aggiornamento+form&launcher_source=unified_ai_launcher&launcher_action=service_create",
    );

    const actions = buildUnifiedCrmServiceCreateSuggestedActions({
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
      },
      parsedQuestion,
      linkedExpenseDraft,
    });

    expect(actions[0]).toEqual(
      expect.objectContaining({
        capabilityActionId: "service_create",
        resource: "services",
        recommended: true,
      }),
    );
    expect(actions[1]).toEqual(
      expect.objectContaining({
        capabilityActionId: "expense_create",
        resource: "expenses",
      }),
    );
    expect(
      buildUnifiedCrmServiceCreateAnswerMarkdown({
        parsedQuestion,
        linkedExpenseDraft,
      }),
    ).toContain("fuori dal TV");
  });

  it("builds a generic expense handoff linked to client and project", () => {
    const parsedQuestion = parseUnifiedCrmExpenseCreateQuestion({
      question:
        "Mi serve inserire la spesa del casello autostradale da 12,50 euro del 22 febbraio 2026 nel progetto Vale il Viaggio",
      context: {
        meta: {
          scope: "crm_read_snapshot",
          businessTimezone: "Europe/Rome",
        },
        snapshot: {
          activeProjects: [
            {
              projectId: "project-viv",
              clientId: "client-1",
              clientName: "Diego Caltabiano",
              projectName: "Vale il Viaggio",
              projectCategory: "produzione_tv",
              projectTvShow: "vale_il_viaggio",
            },
          ],
          recentClients: [],
        },
        registries: {
          semantic: {},
          capability: {},
        },
      },
    });

    expect(parsedQuestion).toEqual(
      expect.objectContaining({
        clientId: "client-1",
        projectId: "project-viv",
        projectName: "Vale il Viaggio",
        expenseDate: "2026-02-22",
        expenseType: "altro",
        description: "Casello autostradale",
        amount: 12.5,
      }),
    );

    expect(
      buildExpenseCreateHref({
        context: {
          meta: {
            scope: "crm_read_snapshot",
            routePrefix: "/#/",
          },
        },
        parsedQuestion: parsedQuestion!,
      }),
    ).toContain(
      "/#/expenses/create?client_id=client-1&project_id=project-viv&expense_date=2026-02-22&expense_type=altro",
    );

    const actions = buildUnifiedCrmExpenseCreateSuggestedActions({
      context: {
        meta: {
          scope: "crm_read_snapshot",
          routePrefix: "/#/",
        },
      },
      parsedQuestion: parsedQuestion!,
    });

    expect(actions[0]).toEqual(
      expect.objectContaining({
        capabilityActionId: "expense_create",
        resource: "expenses",
        recommended: true,
      }),
    );
    expect(
      buildUnifiedCrmExpenseCreateAnswerMarkdown({
        parsedQuestion: parsedQuestion!,
      }),
    ).toContain("cliente Diego Caltabiano e progetto Vale il Viaggio");
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
