import type { Identifier } from "ra-core";

import type { Project, Quote } from "../types";

const directProjectCategoryByQuoteService = {
  wedding: "wedding",
  spot: "spot",
  sito_web: "sviluppo_web",
  produzione_tv: "produzione_tv",
} as const satisfies Partial<Record<string, Project["category"]>>;

export const quoteStatusesEligibleForProjectCreation = new Set([
  "accettato",
  "acconto_ricevuto",
  "in_lavorazione",
  "completato",
  "saldato",
]);

export type ProjectDraftFromQuote = Pick<
  Project,
  "client_id" | "name" | "status" | "all_day"
> &
  Partial<
    Pick<Project, "category" | "start_date" | "end_date" | "budget" | "notes">
  >;

const normalizeText = (value?: string | null) => value?.trim() ?? "";

export const canCreateProjectFromQuote = (
  quote: Pick<Quote, "status" | "project_id">,
) =>
  !quote.project_id &&
  quoteStatusesEligibleForProjectCreation.has(quote.status);

export const getSuggestedProjectCategoryFromQuote = (
  quoteServiceType?: string,
): Project["category"] | undefined =>
  quoteServiceType
    ? directProjectCategoryByQuoteService[
        quoteServiceType as keyof typeof directProjectCategoryByQuoteService
      ]
    : undefined;

export const getSuggestedProjectNameFromQuote = ({
  description,
  clientName,
}: {
  description?: string | null;
  clientName?: string | null;
}) => {
  const normalizedDescription = normalizeText(description);
  const normalizedClientName = normalizeText(clientName);

  if (normalizedDescription && normalizedClientName) {
    return `${normalizedDescription} - ${normalizedClientName}`;
  }

  if (normalizedDescription) {
    return normalizedDescription;
  }

  if (normalizedClientName) {
    return `Progetto ${normalizedClientName}`;
  }

  return "Nuovo progetto";
};

export const buildProjectDraftFromQuote = ({
  quote,
  clientName,
}: {
  quote: Pick<
    Quote,
    | "client_id"
    | "service_type"
    | "description"
    | "event_start"
    | "event_end"
    | "all_day"
    | "amount"
  >;
  clientName?: string | null;
}): ProjectDraftFromQuote => ({
  client_id: quote.client_id,
  name: getSuggestedProjectNameFromQuote({
    description: quote.description,
    clientName,
  }),
  category: getSuggestedProjectCategoryFromQuote(quote.service_type),
  status: "in_corso",
  start_date: quote.event_start,
  end_date: quote.event_end,
  all_day: quote.all_day,
  budget: quote.amount > 0 ? quote.amount : undefined,
  notes: undefined,
});

export const toOptionalIdentifier = (value?: Identifier | null) =>
  value == null || value === "" ? null : value;
