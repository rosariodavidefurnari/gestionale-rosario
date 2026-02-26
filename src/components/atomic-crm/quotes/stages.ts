import type { Quote } from "../types";
import type { quoteStatuses as QuoteStatusesType } from "./quotesTypes";

export type QuotesByStatus = Record<string, Quote[]>;

export const getQuotesByStatus = (
  unorderedQuotes: Quote[],
  statuses: typeof QuoteStatusesType,
) => {
  if (!statuses) return {};
  const quotesByStatus: QuotesByStatus = unorderedQuotes.reduce(
    (acc, quote) => {
      const status = statuses.find((s) => s.value === quote.status)
        ? quote.status
        : statuses[0].value;
      acc[status].push(quote);
      return acc;
    },
    statuses.reduce(
      (obj, status) => ({ ...obj, [status.value]: [] }),
      {} as QuotesByStatus,
    ),
  );
  statuses.forEach((status) => {
    quotesByStatus[status.value] = quotesByStatus[status.value].sort(
      (a: Quote, b: Quote) => a.index - b.index,
    );
  });
  return quotesByStatus;
};
