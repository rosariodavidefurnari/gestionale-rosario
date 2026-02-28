import type { Identifier } from "ra-core";

import type { Project, Quote } from "../types";

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
