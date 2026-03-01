import type { Identifier } from "ra-core";

import type { Payment, Project, Quote } from "../types";
import { buildQuotePaymentsSummary } from "../quotes/quotePaymentsSummary";

export const quoteStatusesEligibleForPaymentCreation = new Set([
  "accettato",
  "acconto_ricevuto",
  "in_lavorazione",
  "completato",
]);

type PaymentCreateDefaults = Partial<
  Pick<Payment, "quote_id" | "client_id" | "project_id" | "payment_type">
>;

export type UnifiedAiHandoffAction =
  | "quote_create_payment"
  | "client_create_payment"
  | "project_quick_payment"
  | "follow_unified_crm_handoff";

type UnifiedAiHandoffSource = "unified_ai_launcher";

export type UnifiedAiHandoffContext = {
  source: UnifiedAiHandoffSource;
  action: UnifiedAiHandoffAction | null;
  openDialog: "quick_payment" | null;
  paymentType: Payment["payment_type"] | null;
};

const toOptionalIdentifier = (value?: string | null) =>
  value == null || value === "" ? null : value;

const unifiedAiHandoffActions = new Set<UnifiedAiHandoffAction>([
  "quote_create_payment",
  "client_create_payment",
  "project_quick_payment",
  "follow_unified_crm_handoff",
]);

const paymentTypes = new Set<Payment["payment_type"]>([
  "acconto",
  "saldo",
  "parziale",
  "rimborso_spese",
  "rimborso",
]);

const getOptionalPaymentType = (value?: string | null) =>
  value && paymentTypes.has(value as Payment["payment_type"])
    ? (value as Payment["payment_type"])
    : null;

export const canCreatePaymentFromQuote = (
  quote: Pick<Quote, "status" | "client_id">,
) =>
  Boolean(quote.client_id) &&
  quoteStatusesEligibleForPaymentCreation.has(quote.status);

export const buildPaymentCreateDefaultsFromQuote = ({
  quote,
}: {
  quote: Pick<Quote, "id" | "client_id" | "project_id">;
}): PaymentCreateDefaults => ({
  quote_id: quote.id,
  client_id: quote.client_id,
  ...(quote.project_id ? { project_id: quote.project_id } : {}),
});

export const buildPaymentCreateDefaultsFromClient = ({
  client,
}: {
  client: Pick<Payment, "client_id">;
}): PaymentCreateDefaults => ({
  client_id: client.client_id,
});

const buildPaymentCreatePath = (defaults: PaymentCreateDefaults) => {
  const searchParams = new URLSearchParams();

  Object.entries(defaults).forEach(([key, value]) => {
    if (value != null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const search = searchParams.toString();
  return search ? `/payments/create?${search}` : "/payments/create";
};

export const buildPaymentCreatePathFromQuote = ({
  quote,
}: {
  quote: Pick<Quote, "id" | "client_id" | "project_id">;
}) => buildPaymentCreatePath(buildPaymentCreateDefaultsFromQuote({ quote }));

export const buildPaymentCreatePathFromClient = ({
  client,
}: {
  client: Pick<Payment, "client_id">;
}) => buildPaymentCreatePath(buildPaymentCreateDefaultsFromClient({ client }));

export const getPaymentCreateDefaultsFromSearch = (
  search: string,
): PaymentCreateDefaults => {
  const searchParams = new URLSearchParams(search);
  const defaults: PaymentCreateDefaults = {};

  const quoteId = toOptionalIdentifier(searchParams.get("quote_id"));
  if (quoteId) {
    defaults.quote_id = quoteId;
  }

  const clientId = toOptionalIdentifier(searchParams.get("client_id"));
  if (clientId) {
    defaults.client_id = clientId;
  }

  const projectId = toOptionalIdentifier(searchParams.get("project_id"));
  if (projectId) {
    defaults.project_id = projectId;
  }

  const paymentType = getOptionalPaymentType(searchParams.get("payment_type"));
  if (paymentType) {
    defaults.payment_type = paymentType;
  }

  return defaults;
};

export const getUnifiedAiHandoffContextFromSearch = (
  search: string,
): UnifiedAiHandoffContext | null => {
  const searchParams = new URLSearchParams(search);
  const source = searchParams.get("launcher_source");

  if (source !== "unified_ai_launcher") {
    return null;
  }

  const action = searchParams.get("launcher_action");
  const openDialog = searchParams.get("open_dialog");

  return {
    source,
    action:
      action && unifiedAiHandoffActions.has(action as UnifiedAiHandoffAction)
        ? (action as UnifiedAiHandoffAction)
        : null,
    openDialog: openDialog === "quick_payment" ? "quick_payment" : null,
    paymentType: getOptionalPaymentType(searchParams.get("payment_type")),
  };
};

export const getSuggestedPaymentAmountFromQuote = ({
  quoteAmount,
  payments,
  paymentType,
}: {
  quoteAmount: number;
  payments: Array<Pick<Payment, "amount" | "payment_type" | "status">>;
  paymentType: Payment["payment_type"] | null | undefined;
}) => {
  if (
    paymentType === "rimborso" ||
    paymentType === "rimborso_spese" ||
    paymentType == null
  ) {
    return null;
  }

  const summary = buildQuotePaymentsSummary({
    quoteAmount,
    payments,
  });

  if (summary.remainingAmount <= 0) {
    return null;
  }

  return summary.remainingAmount;
};

export const buildPaymentPatchFromQuote = ({
  quote,
  currentClientId,
  currentProjectId,
}: {
  quote: Pick<Quote, "client_id" | "project_id">;
  currentClientId?: Identifier | null;
  currentProjectId?: Identifier | null;
}) => {
  const patch: {
    client_id?: Identifier;
    project_id?: Identifier | null;
  } = {};

  if (String(currentClientId ?? "") !== String(quote.client_id ?? "")) {
    patch.client_id = quote.client_id;
  }

  if (
    quote.project_id &&
    String(currentProjectId ?? "") !== String(quote.project_id)
  ) {
    patch.project_id = quote.project_id;
  }

  return patch;
};

export const buildQuoteSearchFilter = (searchText: string) => {
  const trimmed = searchText.trim();
  return trimmed ? { "description@ilike": `%${trimmed}%` } : {};
};

export const shouldClearQuoteForClient = ({
  quote,
  clientId,
}: {
  quote?: Pick<Quote, "client_id"> | null;
  clientId?: Identifier | null;
}) =>
  Boolean(
    quote &&
      clientId &&
      String(quote.client_id ?? "") !== String(clientId ?? ""),
  );

export const shouldClearProjectForClient = ({
  project,
  clientId,
}: {
  project?: Pick<Project, "client_id"> | null;
  clientId?: Identifier | null;
}) =>
  Boolean(
    project &&
      clientId &&
      String(project.client_id ?? "") !== String(clientId ?? ""),
  );
