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
  const paymentProjectHref = buildShowHref(
    routePrefix,
    "projects",
    getString(firstPayment?.projectId),
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
      })
    : null;
  const quoteClientHref = buildShowHref(
    routePrefix,
    "clients",
    getString(firstQuote?.clientId),
  );
  const quoteProjectHref = buildShowHref(
    routePrefix,
    "projects",
    getString(firstQuote?.projectId),
  );
  const projectHref = buildShowHref(
    routePrefix,
    "projects",
    getString(firstProject?.projectId),
  );
  const projectQuickPaymentHref = getString(firstProject?.projectId)
    ? buildShowHref(routePrefix, "projects", getString(firstProject?.projectId))
    : null;
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
  const expenseProjectHref = buildShowHref(
    routePrefix,
    "projects",
    getString(firstExpense?.projectId),
  );
  const clientHref = buildShowHref(
    routePrefix,
    "clients",
    getString(firstClient?.clientId),
  );
  const clientCreatePaymentHref = getString(firstClient?.clientId)
    ? buildCreateHref(routePrefix, "payments", {
        client_id: getString(firstClient?.clientId),
      })
    : null;
  const paymentClientCreateHref = getString(firstPayment?.clientId)
    ? buildCreateHref(routePrefix, "payments", {
        client_id: getString(firstPayment?.clientId),
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
  } else if (focusPayments) {
    pushSuggestion(
      paymentQuoteHref
        ? {
            id: "open-linked-quote-from-payment",
            kind: "show",
            resource: "quotes",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri il preventivo collegato",
            description:
              "Vai al preventivo collegato al pagamento pendente piu rilevante.",
            href: paymentQuoteHref,
          }
        : paymentHref
          ? {
              id: "open-first-pending-payment",
              kind: "show",
              resource: "payments",
              capabilityActionId: "follow_unified_crm_handoff",
              label: "Apri il pagamento piu urgente",
              description:
                "Vai al dettaglio del primo pagamento pendente nello snapshot corrente.",
              href: paymentHref,
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
            label: "Registra un altro pagamento dal preventivo",
            description:
              "Apre il form pagamenti gia precompilato dal preventivo aperto piu rilevante.",
            href: quoteCreatePaymentHref,
          }
        : paymentClientCreateHref
          ? {
              id: "client-create-payment-from-payment-context",
              kind: "approved_action",
              resource: "payments",
              capabilityActionId: "client_create_payment",
              label: "Registra un pagamento diretto dal cliente",
              description:
                "Apre il form pagamenti precompilato sul cliente del pagamento pendente principale.",
              href: paymentClientCreateHref,
            }
          : null,
    );
    pushSuggestion(
      paymentProjectHref
        ? {
            id: "project-quick-payment-handoff-from-payment-context",
            kind: "approved_action",
            resource: "projects",
            capabilityActionId: "project_quick_payment",
            label: "Apri il progetto e usa Pagamento",
            description:
              "Apre il progetto collegato; da li puoi usare il quick payment gia approvato.",
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
    pushSuggestion(
      quoteHref
        ? {
            id: "open-first-open-quote",
            kind: "show",
            resource: "quotes",
            capabilityActionId: "follow_unified_crm_handoff",
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
            label: "Registra pagamento dal preventivo",
            description:
              "Apre il form pagamenti gia precompilato dal preventivo aperto principale.",
            href: quoteCreatePaymentHref,
          }
        : quoteProjectHref
          ? {
              id: "project-quick-payment-handoff-from-quote",
              kind: "approved_action",
              resource: "projects",
              capabilityActionId: "project_quick_payment",
              label: "Apri il progetto e usa Pagamento",
              description:
                "Apre il progetto collegato; da li puoi usare il quick payment gia approvato.",
              href: quoteProjectHref,
            }
          : null,
    );
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
    pushSuggestion(
      projectHref
        ? {
            id: "open-first-active-project",
            kind: "show",
            resource: "projects",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri il progetto attivo principale",
            description:
              "Vai al dettaglio del primo progetto attivo nello snapshot corrente.",
            href: projectHref,
          }
        : null,
    );
    pushSuggestion(
      projectQuickPaymentHref
        ? {
            id: "project-quick-payment-handoff",
            kind: "approved_action",
            resource: "projects",
            capabilityActionId: "project_quick_payment",
            label: "Apri il progetto e usa Pagamento",
            description:
              "Apre il progetto attivo principale; da li puoi usare il quick payment gia approvato.",
            href: projectQuickPaymentHref,
          }
        : null,
    );
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
              "Apre il progetto collegato alla spesa; da li puoi usare le azioni progetto gia approvate.",
            href: expenseProjectHref,
          }
        : null,
    );
  } else if (focusClients) {
    pushSuggestion(
      clientHref
        ? {
            id: "open-first-recent-client",
            kind: "show",
            resource: "clients",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri il cliente piu recente",
            description:
              "Vai alla scheda del cliente piu recente presente nello snapshot corrente.",
            href: clientHref,
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
            label: "Registra pagamento dal cliente",
            description:
              "Apre il form pagamenti precompilato sul cliente piu recente dello snapshot.",
            href: clientCreatePaymentHref,
          }
        : {
            id: "open-clients-list",
            kind: "list",
            resource: "clients",
            capabilityActionId: "follow_unified_crm_handoff",
            label: "Apri tutti i clienti",
            description:
              "Controlla l'anagrafica completa per approfondire i clienti nel CRM.",
            href: buildListHref(routePrefix, "clients"),
          },
    );
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

  return suggestions.slice(0, 3);
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
