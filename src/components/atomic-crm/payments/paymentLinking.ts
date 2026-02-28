import type { Identifier } from "ra-core";

import type { Payment, Project, Quote } from "../types";

export const quoteStatusesEligibleForPaymentCreation = new Set([
  "accettato",
  "acconto_ricevuto",
  "in_lavorazione",
  "completato",
]);

type PaymentCreateDefaults = Partial<
  Pick<Payment, "quote_id" | "client_id" | "project_id">
>;

const toOptionalIdentifier = (value?: string | null) =>
  value == null || value === "" ? null : value;

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

  return defaults;
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
