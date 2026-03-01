const requiredScope = "crm_read_snapshot";

export const unifiedCrmAnswerMaxQuestionLength = 300;

export type UnifiedCrmSuggestedAction = {
  id: string;
  kind: "page" | "list" | "show" | "approved_action";
  resource:
    | "dashboard"
    | "clients"
    | "quotes"
    | "projects"
    | "payments"
    | "expenses";
  label: string;
  description: string;
  href: string;
  recommended?: boolean;
  recommendationReason?: string;
  capabilityActionId?:
    | "quote_create_payment"
    | "client_create_payment"
    | "project_quick_payment"
    | "follow_unified_crm_handoff";
};

export type UnifiedCrmAnswerPayload = {
  context: Record<string, unknown>;
  question: string;
  model: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getString = (value: unknown) => (typeof value === "string" ? value : null);

const getRoutePrefix = (context: Record<string, unknown>) => {
  const meta = isObject(context.meta) ? context.meta : null;
  return getString(meta?.routePrefix) ?? "/#/";
};

const quoteStatusesEligibleForPaymentCreation = new Set([
  "accettato",
  "acconto_ricevuto",
  "in_lavorazione",
  "completato",
]);

const buildListHref = (routePrefix: string, resource: string) =>
  `${routePrefix}${resource}`;

const buildCreateHref = (
  routePrefix: string,
  resource: string,
  searchParams: Record<string, string | null | undefined>,
) => {
  const query = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const search = query.toString();
  return search
    ? `${routePrefix}${resource}/create?${search}`
    : `${routePrefix}${resource}/create`;
};

const buildShowHrefWithSearch = (
  routePrefix: string,
  resource: string,
  recordId: string | null,
  searchParams: Record<string, string | null | undefined>,
) => {
  const baseHref = buildShowHref(routePrefix, resource, recordId);

  if (!baseHref) {
    return null;
  }

  const query = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const search = query.toString();
  return search ? `${baseHref}?${search}` : baseHref;
};

const buildShowHref = (
  routePrefix: string,
  resource: string,
  recordId: string | null,
) => (recordId ? `${routePrefix}${resource}/${recordId}/show` : null);

const getObjectArray = (
  value: unknown,
): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter(isObject) : [];

const includesAny = (value: string, patterns: string[]) =>
  patterns.some((pattern) => value.includes(pattern));

const canCreatePaymentFromQuoteStatus = (status: string | null) =>
  Boolean(status && quoteStatusesEligibleForPaymentCreation.has(status));

const inferPreferredPaymentType = (normalizedQuestion: string) => {
  if (includesAny(normalizedQuestion, ["rimborso spese", "rimborso", "spes"])) {
    return "rimborso_spese";
  }

  if (includesAny(normalizedQuestion, ["acconto", "anticip"])) {
    return "acconto";
  }

  if (includesAny(normalizedQuestion, ["saldo", "residu", "chiuder"])) {
    return "saldo";
  }

  if (includesAny(normalizedQuestion, ["parzial"])) {
    return "parziale";
  }

  return null;
};

const buildRecommendedReason = ({
  suggestion,
  focusPayments,
  focusQuotes,
  focusProjects,
  focusClients,
  quoteStatus,
}: {
  suggestion: UnifiedCrmSuggestedAction;
  focusPayments: boolean;
  focusQuotes: boolean;
  focusProjects: boolean;
  focusClients: boolean;
  quoteStatus: string | null;
}) => {
  if (suggestion.capabilityActionId === "quote_create_payment") {
    if (quoteStatus) {
      return `Consigliata perche il preventivo rilevante e' in stato ${quoteStatus} e qui il pagamento si apre gia precompilato dal record corretto.`;
    }

    return "Consigliata perche apre il pagamento gia precompilato dal preventivo corretto, senza inventare un nuovo workflow.";
  }

  if (suggestion.capabilityActionId === "client_create_payment") {
    return "Consigliata perche la domanda e' orientata all'incasso e qui il form pagamenti si apre gia sul cliente coerente.";
  }

  if (suggestion.capabilityActionId === "project_quick_payment") {
    return "Consigliata perche il progetto collegato e' gia la superficie approvata per proseguire il flusso commerciale.";
  }

  if (focusPayments && suggestion.resource === "quotes") {
    return "Consigliata perche prima di agire conviene verificare il preventivo collegato al pagamento pendente principale.";
  }

  if (focusQuotes && suggestion.resource === "quotes") {
    return "Consigliata perche il preventivo aperto principale e' il punto giusto da controllare prima di proseguire.";
  }

  if (focusProjects && suggestion.resource === "projects") {
    return "Consigliata perche il progetto attivo principale e' la superficie piu coerente da cui continuare.";
  }

  if (focusClients && suggestion.resource === "clients") {
    return "Consigliata perche la scheda cliente e' il punto piu diretto per verificare il contesto commerciale collegato.";
  }

  return "Consigliata come prossimo passo piu coerente con lo snapshot corrente.";
};

const markRecommendedSuggestion = ({
  suggestions,
  focusPayments,
  focusQuotes,
  focusProjects,
  focusClients,
  quoteStatus,
}: {
  suggestions: UnifiedCrmSuggestedAction[];
  focusPayments: boolean;
  focusQuotes: boolean;
  focusProjects: boolean;
  focusClients: boolean;
  quoteStatus: string | null;
}) =>
  suggestions.map((suggestion, index) =>
    index === 0
      ? {
          ...suggestion,
          recommended: true,
          recommendationReason: buildRecommendedReason({
            suggestion,
            focusPayments,
            focusQuotes,
            focusProjects,
            focusClients,
            quoteStatus,
          }),
        }
      : suggestion,
  );

export const buildUnifiedCrmSuggestedActions = ({
  question,
  context,
}: {
  question: string;
  context: Record<string, unknown>;
}): UnifiedCrmSuggestedAction[] => {
  const normalizedQuestion = normalizeText(question);
  const routePrefix = getRoutePrefix(context);
  const snapshot = isObject(context.snapshot) ? context.snapshot : {};

  const recentClients = getObjectArray(snapshot.recentClients);
  const openQuotes = getObjectArray(snapshot.openQuotes);
  const activeProjects = getObjectArray(snapshot.activeProjects);
  const pendingPayments = getObjectArray(snapshot.pendingPayments);
  const recentExpenses = getObjectArray(snapshot.recentExpenses);

  const suggestions: UnifiedCrmSuggestedAction[] = [];
  const seenHrefs = new Set<string>();

  const pushSuggestion = (suggestion: UnifiedCrmSuggestedAction | null) => {
    if (!suggestion || seenHrefs.has(suggestion.href)) {
      return;
    }

    seenHrefs.add(suggestion.href);
    suggestions.push(suggestion);
  };

  const firstClient = recentClients[0];
  const firstQuote = openQuotes[0];
  const firstProject = activeProjects[0];
  const firstPayment = pendingPayments[0];
  const firstExpense = recentExpenses[0];

  const focusPayments = includesAny(normalizedQuestion, [
    "pagament",
    "incass",
    "saldo",
    "acconto",
    "scadut",
    "sollecit",
    "deve ancora pag",
    "in attesa",
  ]);
  const focusQuotes = includesAny(normalizedQuestion, [
    "preventiv",
    "offert",
    "trattativa",
    "apert",
    "accettat",
  ]);
  const focusProjects = includesAny(normalizedQuestion, [
    "progett",
    "lavor",
    "attiv",
  ]);
  const focusExpenses = includesAny(normalizedQuestion, [
    "spes",
    "cost",
    "fornitor",
    "uscit",
    "rimbor",
    "nolegg",
  ]);
  const focusClients = includesAny(normalizedQuestion, [
    "client",
    "anagraf",
    "contatt",
  ]);
  const preferPaymentAction =
    (focusPayments || focusQuotes || focusProjects || focusClients) &&
    includesAny(normalizedQuestion, [
      "registr",
      "aggiung",
      "inser",
      "crea",
      "segn",
      "incass",
      "precompilat",
    ]);
  const preferProjectQuickPaymentLanding =
    focusProjects && preferPaymentAction && Boolean(firstProject) && !firstPayment;
  const genericSummary =
    includesAny(normalizedQuestion, [
      "riepilog",
      "riassunt",
      "panoram",
      "situaz",
      "operativ",
      "crm",
      "attenzion",
      "subito",
    ]) ||
    (!focusPayments &&
      !focusQuotes &&
      !focusProjects &&
      !focusExpenses &&
      !focusClients);
  const inferredPaymentType = inferPreferredPaymentType(normalizedQuestion);
  const launcherCreatePaymentContext = {
    launcher_source: "unified_ai_launcher",
    payment_type: inferredPaymentType,
  };

  const paymentHref = buildShowHref(
    routePrefix,
    "payments",
    getString(firstPayment?.paymentId),
  );
  const paymentQuoteHref = buildShowHref(
    routePrefix,
    "quotes",
    getString(firstPayment?.quoteId),
  );
  const paymentClientHref = buildShowHref(
    routePrefix,
    "clients",
    getString(firstPayment?.clientId),
  );
  const paymentProjectHref = buildShowHrefWithSearch(
    routePrefix,
    "projects",
    getString(firstPayment?.projectId),
    {
      launcher_source: "unified_ai_launcher",
      launcher_action: "project_quick_payment",
      open_dialog: "quick_payment",
      payment_type: inferredPaymentType,
    },
  );
  const quoteHref = buildShowHref(
    routePrefix,
    "quotes",
    getString(firstQuote?.quoteId),
  );
  const quoteCreatePaymentHref = canCreatePaymentFromQuoteStatus(
    getString(firstQuote?.status),
  )
    ? buildCreateHref(routePrefix, "payments", {
        quote_id: getString(firstQuote?.quoteId),
        client_id: getString(firstQuote?.clientId),
        project_id: getString(firstQuote?.projectId),
        launcher_action: "quote_create_payment",
        ...launcherCreatePaymentContext,
      })
    : null;
  const quoteClientHref = buildShowHref(
    routePrefix,
    "clients",
    getString(firstQuote?.clientId),
  );
  const quoteProjectHref = buildShowHrefWithSearch(
    routePrefix,
    "projects",
    getString(firstQuote?.projectId),
    {
      launcher_source: "unified_ai_launcher",
      launcher_action: "project_quick_payment",
      open_dialog: "quick_payment",
      payment_type: inferredPaymentType,
    },
  );
  const projectHref = buildShowHref(
    routePrefix,
    "projects",
    getString(firstProject?.projectId),
  );
  const projectQuickPaymentHref = buildShowHrefWithSearch(
    routePrefix,
    "projects",
    getString(firstProject?.projectId),
    {
      launcher_source: "unified_ai_launcher",
      launcher_action: "project_quick_payment",
      open_dialog: "quick_payment",
      payment_type: inferredPaymentType,
    },
  );
  const projectClientHref = buildShowHref(
    routePrefix,
    "clients",
    getString(firstProject?.clientId),
  );
  const expenseHref = buildShowHref(
    routePrefix,
    "expenses",
    getString(firstExpense?.expenseId),
  );
  const expenseProjectHref = buildShowHrefWithSearch(
    routePrefix,
    "projects",
    getString(firstExpense?.projectId),
    {
      launcher_source: "unified_ai_launcher",
      launcher_action: "project_quick_payment",
      open_dialog: "quick_payment",
      payment_type: inferredPaymentType,
    },
  );
  const clientHref = buildShowHref(
    routePrefix,
    "clients",
    getString(firstClient?.clientId),
  );
  const clientCreatePaymentHref = getString(firstClient?.clientId)
    ? buildCreateHref(routePrefix, "payments", {
        client_id: getString(firstClient?.clientId),
        launcher_action: "client_create_payment",
        ...launcherCreatePaymentContext,
      })
    : null;
  const paymentClientCreateHref = getString(firstPayment?.clientId)
    ? buildCreateHref(routePrefix, "payments", {
        client_id: getString(firstPayment?.clientId),
        launcher_action: "client_create_payment",
        ...launcherCreatePaymentContext,
      })
    : null;

  if (genericSummary) {
    pushSuggestion(
      quoteHref
        ? {
            id: "open-first-open-quote",
            kind: "show",
            resource: "quotes",
            label: "Apri il preventivo aperto piu rilevante",
            description:
              "Vai al dettaglio del primo preventivo aperto nello snapshot corrente.",
            href: quoteHref,
          }
        : null,
    );
    pushSuggestion(
      quoteCreatePaymentHref
        ? {
            id: "quote-create-payment-handoff",
            kind: "approved_action",
            resource: "payments",
            capabilityActionId: "quote_create_payment",
            label: "Registra un pagamento dal preventivo",
            description:
              "Apre il form pagamenti gia precompilato dal preventivo aperto principale.",
            href: quoteCreatePaymentHref,
          }
        : null,
    );
    pushSuggestion(
      clientCreatePaymentHref
        ? {
            id: "client-create-payment-handoff",
            kind: "approved_action",
            resource: "payments",
            capabilityActionId: "client_create_payment",
            label: "Registra un pagamento diretto dal cliente",
            description:
              "Apre il form pagamenti precompilato sul cliente piu recente dello snapshot.",
            href: clientCreatePaymentHref,
          }
        : {
            id: "open-dashboard",
            kind: "page",
            resource: "dashboard",
            label: "Apri la dashboard",
            description:
              "Usa la dashboard come quadro generale prima di aprire un record specifico.",
            href: routePrefix,
          },
    );
  } else if (preferProjectQuickPaymentLanding) {
    const projectShowSuggestion = projectHref
      ? {
          id: "open-first-active-project",
          kind: "show" as const,
          resource: "projects" as const,
          capabilityActionId: "follow_unified_crm_handoff" as const,
          label: "Apri il progetto attivo principale",
          description:
            "Vai al dettaglio del primo progetto attivo nello snapshot corrente.",
          href: projectHref,
        }
      : null;
    const projectApprovedSuggestion = projectQuickPaymentHref
      ? {
          id: "project-quick-payment-handoff",
          kind: "approved_action" as const,
          resource: "projects" as const,
          capabilityActionId: "project_quick_payment" as const,
          label: "Apri il progetto e usa Pagamento",
          description:
            "Apre il progetto attivo principale con contesto launcher e quick payment pronto da aprire.",
          href: projectQuickPaymentHref,
        }
      : null;

    pushSuggestion(projectApprovedSuggestion);
    pushSuggestion(projectShowSuggestion);
    pushSuggestion(
      projectClientHref
        ? {
            id: "open-linked-client-from-project",
            kind: "show",
            resource: "clients",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri il cliente collegato",
            description:
              "Vai alla scheda cliente collegata al primo progetto attivo.",
            href: projectClientHref,
          }
        : {
            id: "open-projects-list",
            kind: "list",
            resource: "projects",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri tutti i progetti",
            description:
              "Controlla la lista completa dei progetti per approfondire stato e lavori attivi.",
            href: buildListHref(routePrefix, "projects"),
          },
    );
  } else if (focusPayments) {
    const paymentShowSuggestion = paymentQuoteHref
      ? {
          id: "open-linked-quote-from-payment",
          kind: "show" as const,
          resource: "quotes" as const,
          capabilityActionId: "follow_unified_crm_handoff" as const,
          label: "Apri il preventivo collegato",
          description:
            "Vai al preventivo collegato al pagamento pendente piu rilevante.",
          href: paymentQuoteHref,
        }
      : paymentHref
        ? {
            id: "open-first-pending-payment",
            kind: "show" as const,
            resource: "payments" as const,
            capabilityActionId: "follow_unified_crm_handoff" as const,
            label: "Apri il pagamento piu urgente",
            description:
              "Vai al dettaglio del primo pagamento pendente nello snapshot corrente.",
            href: paymentHref,
          }
        : null;
    const paymentApprovedSuggestion = quoteCreatePaymentHref
      ? {
          id: "quote-create-payment-handoff",
          kind: "approved_action" as const,
          resource: "payments" as const,
          capabilityActionId: "quote_create_payment" as const,
          label: "Registra un altro pagamento dal preventivo",
          description:
            "Apre il form pagamenti gia precompilato dal preventivo aperto piu rilevante.",
          href: quoteCreatePaymentHref,
        }
      : paymentClientCreateHref
        ? {
            id: "client-create-payment-from-payment-context",
            kind: "approved_action" as const,
            resource: "payments" as const,
            capabilityActionId: "client_create_payment" as const,
            label: "Registra un pagamento diretto dal cliente",
            description:
              "Apre il form pagamenti precompilato sul cliente del pagamento pendente principale.",
            href: paymentClientCreateHref,
          }
        : null;

    if (preferPaymentAction) {
      pushSuggestion(paymentApprovedSuggestion);
      pushSuggestion(paymentShowSuggestion);
    } else {
      pushSuggestion(paymentShowSuggestion);
      pushSuggestion(paymentApprovedSuggestion);
    }
    pushSuggestion(
      paymentProjectHref
        ? {
            id: "project-quick-payment-handoff-from-payment-context",
            kind: "approved_action",
            resource: "projects",
            capabilityActionId: "project_quick_payment",
            label: "Apri il progetto e usa Pagamento",
            description:
              "Apre il progetto collegato con contesto launcher e quick payment pronto da aprire.",
            href: paymentProjectHref,
          }
        : paymentClientHref
          ? {
              id: "open-linked-client-from-payment",
              kind: "show",
              resource: "clients",
              capabilityActionId: "follow_unified_crm_handoff",
              label: "Apri il cliente collegato",
              description:
                "Vai alla scheda cliente collegata al primo pagamento pendente.",
              href: paymentClientHref,
            }
          : null,
    );
  } else if (focusQuotes) {
    const quoteShowSuggestion = quoteHref
      ? {
          id: "open-first-open-quote",
          kind: "show" as const,
          resource: "quotes" as const,
          capabilityActionId: "follow_unified_crm_handoff" as const,
          label: "Apri il preventivo aperto piu rilevante",
          description:
            "Vai al dettaglio del primo preventivo aperto nello snapshot corrente.",
          href: quoteHref,
        }
      : null;
    const quoteApprovedSuggestion = quoteCreatePaymentHref
      ? {
          id: "quote-create-payment-handoff",
          kind: "approved_action" as const,
          resource: "payments" as const,
          capabilityActionId: "quote_create_payment" as const,
          label: "Registra pagamento dal preventivo",
          description:
            "Apre il form pagamenti gia precompilato dal preventivo aperto principale.",
          href: quoteCreatePaymentHref,
        }
      : quoteProjectHref
        ? {
            id: "project-quick-payment-handoff-from-quote",
            kind: "approved_action" as const,
            resource: "projects" as const,
            capabilityActionId: "project_quick_payment" as const,
            label: "Apri il progetto e usa Pagamento",
            description:
              "Apre il progetto collegato con contesto launcher e quick payment pronto da aprire.",
            href: quoteProjectHref,
          }
        : null;

    if (preferPaymentAction) {
      pushSuggestion(quoteApprovedSuggestion);
      pushSuggestion(quoteShowSuggestion);
    } else {
      pushSuggestion(quoteShowSuggestion);
      pushSuggestion(quoteApprovedSuggestion);
    }
    pushSuggestion(
      quoteClientHref
        ? {
            id: "open-linked-client-from-quote",
            kind: "show",
            resource: "clients",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri il cliente collegato",
            description:
              "Vai alla scheda cliente collegata al primo preventivo aperto.",
            href: quoteClientHref,
          }
        : {
            id: "open-quotes-list",
            kind: "list",
            resource: "quotes",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri tutti i preventivi",
            description:
              "Controlla la lista completa dei preventivi per vedere pipeline e stati.",
            href: buildListHref(routePrefix, "quotes"),
          },
    );
  } else if (focusProjects) {
    const projectShowSuggestion = projectHref
      ? {
          id: "open-first-active-project",
          kind: "show" as const,
          resource: "projects" as const,
          capabilityActionId: "follow_unified_crm_handoff" as const,
          label: "Apri il progetto attivo principale",
          description:
            "Vai al dettaglio del primo progetto attivo nello snapshot corrente.",
          href: projectHref,
        }
      : null;
    const projectApprovedSuggestion = projectQuickPaymentHref
      ? {
          id: "project-quick-payment-handoff",
          kind: "approved_action" as const,
          resource: "projects" as const,
          capabilityActionId: "project_quick_payment" as const,
          label: "Apri il progetto e usa Pagamento",
          description:
            "Apre il progetto attivo principale con contesto launcher e quick payment pronto da aprire.",
          href: projectQuickPaymentHref,
        }
      : null;

    if (preferPaymentAction) {
      pushSuggestion(projectApprovedSuggestion);
      pushSuggestion(projectShowSuggestion);
    } else {
      pushSuggestion(projectShowSuggestion);
      pushSuggestion(projectApprovedSuggestion);
    }
    pushSuggestion(
      projectClientHref
        ? {
            id: "open-linked-client-from-project",
            kind: "show",
            resource: "clients",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri il cliente collegato",
            description:
              "Vai alla scheda cliente collegata al primo progetto attivo.",
            href: projectClientHref,
          }
        : {
            id: "open-projects-list",
            kind: "list",
            resource: "projects",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri tutti i progetti",
            description:
              "Controlla la lista completa dei progetti per approfondire stato e lavori attivi.",
            href: buildListHref(routePrefix, "projects"),
          },
    );
  } else if (focusExpenses) {
    pushSuggestion(
      expenseHref
        ? {
            id: "open-first-recent-expense",
            kind: "show",
            resource: "expenses",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri la spesa piu recente",
            description:
              "Vai al dettaglio della prima spesa recente nello snapshot corrente.",
            href: expenseHref,
          }
        : null,
    );
    pushSuggestion({
      id: "open-expenses-list",
      kind: "list",
      resource: "expenses",
      label: "Apri tutte le spese",
      description:
        "Controlla la lista completa delle spese per approfondire costi e rimborsi.",
      href: buildListHref(routePrefix, "expenses"),
    });
    pushSuggestion(
      expenseProjectHref
        ? {
            id: "open-linked-project-from-expense",
            kind: "approved_action",
            resource: "projects",
            capabilityActionId: "project_quick_payment",
            label: "Apri il progetto collegato",
            description:
              "Apre il progetto collegato alla spesa con contesto launcher e quick payment pronto da aprire.",
            href: expenseProjectHref,
          }
        : null,
    );
  } else if (focusClients) {
    const clientShowSuggestion = clientHref
      ? {
          id: "open-first-recent-client",
          kind: "show" as const,
          resource: "clients" as const,
          capabilityActionId: "follow_unified_crm_handoff" as const,
          label: "Apri il cliente piu recente",
          description:
            "Vai alla scheda del cliente piu recente presente nello snapshot corrente.",
          href: clientHref,
        }
      : null;
    const clientApprovedSuggestion = clientCreatePaymentHref
      ? {
          id: "client-create-payment-handoff",
          kind: "approved_action" as const,
          resource: "payments" as const,
          capabilityActionId: "client_create_payment" as const,
          label: "Registra pagamento dal cliente",
          description:
            "Apre il form pagamenti precompilato sul cliente piu recente dello snapshot.",
          href: clientCreatePaymentHref,
        }
      : {
          id: "open-clients-list",
          kind: "list" as const,
          resource: "clients" as const,
          capabilityActionId: "follow_unified_crm_handoff" as const,
          label: "Apri tutti i clienti",
          description:
            "Controlla l'anagrafica completa per approfondire i clienti nel CRM.",
          href: buildListHref(routePrefix, "clients"),
        };

    if (preferPaymentAction && clientCreatePaymentHref) {
      pushSuggestion(clientApprovedSuggestion);
      pushSuggestion(clientShowSuggestion);
    } else {
      pushSuggestion(clientShowSuggestion);
      pushSuggestion(clientApprovedSuggestion);
    }
    pushSuggestion(
      quoteHref
        ? {
            id: "open-open-quote-from-client-context",
            kind: "show",
            resource: "quotes",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri il preventivo aperto collegato",
            description:
              "Apri un preventivo aperto dallo snapshot per proseguire il controllo commerciale.",
            href: quoteHref,
          }
        : null,
    );
  }

  if (suggestions.length === 0) {
    pushSuggestion({
      id: "open-dashboard",
      kind: "page",
      resource: "dashboard",
      label: "Torna alla dashboard",
      description:
        "Riapri la dashboard come punto di partenza per proseguire l'analisi operativa.",
      href: routePrefix,
    });
  }

  return markRecommendedSuggestion({
    suggestions: suggestions.slice(0, 3),
    focusPayments,
    focusQuotes,
    focusProjects,
    focusClients,
    quoteStatus: getString(firstQuote?.status),
  });
};

export const validateUnifiedCrmAnswerPayload = (payload: unknown) => {
  if (!isObject(payload)) {
    return { error: "Payload non valido", data: null };
  }

  if (typeof payload.model !== "string" || !payload.model.trim()) {
    return { error: "Il modello e obbligatorio", data: null };
  }

  if (typeof payload.question !== "string" || !payload.question.trim()) {
    return { error: "La domanda e obbligatoria", data: null };
  }

  const trimmedQuestion = payload.question.trim();
  if (trimmedQuestion.length > unifiedCrmAnswerMaxQuestionLength) {
    return {
      error: `La domanda e troppo lunga. Limite: ${unifiedCrmAnswerMaxQuestionLength} caratteri.`,
      data: null,
    };
  }

  if (!isObject(payload.context)) {
    return { error: "Manca il contesto CRM unificato", data: null };
  }

  const meta = isObject(payload.context.meta) ? payload.context.meta : null;
  const snapshot = isObject(payload.context.snapshot)
    ? payload.context.snapshot
    : null;
  const registries = isObject(payload.context.registries)
    ? payload.context.registries
    : null;

  if (!meta || meta.scope !== requiredScope) {
    return {
      error: "Il contesto CRM unificato non ha lo scope read-only atteso",
      data: null,
    };
  }

  if (!snapshot || !registries) {
    return { error: "Il contesto CRM unificato e incompleto", data: null };
  }

  return {
    error: null,
    data: {
      context: payload.context,
      question: trimmedQuestion,
      model: payload.model,
    } satisfies UnifiedCrmAnswerPayload,
  };
};
