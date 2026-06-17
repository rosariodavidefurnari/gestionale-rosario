import type { QueryClient } from "@tanstack/react-query";

/**
 * Surfaces whose React Query cache derives billing/collection state from an
 * invoice and therefore goes stale when that invoice is voided. Invalidated so
 * that, under the mobile config (CRM.tsx MobileAdmin: staleTime 2min +
 * offlineFirst + localStorage persist), Registro Lavori / dashboard / ProjectShow
 * don't keep serving "Fatturato" / the removed expected payment.
 */
export const VOID_INVALIDATED_RESOURCES = [
  "services",
  "expenses",
  "payments",
  "project_financials",
] as const;

/** ra-core query keys are `[resource, method, ...params]` (see useRealtimeInvalidation). */
export const isFinancialDocumentsListKey = (
  queryKey: readonly unknown[],
): boolean =>
  queryKey[0] === "financial_documents_summary" && queryKey[1] === "getList";

/**
 * Invalidate every surface affected by an invoice void — EXCEPT the voided
 * document's own getOne. The document row is deleted by the `invoice_void` Edge
 * Function, so refetching its getOne would throw ra-data-postgrest
 * "Cannot coerce the result to a single JSON object". We invalidate the Fatture
 * LIST only (so the voided row disappears) and never its getOne.
 *
 * Pure + injectable so it can be unit-tested without rendering the Show page.
 */
export const invalidateVoidedInvoiceSurfaces = (
  queryClient: QueryClient,
): void => {
  for (const resource of VOID_INVALIDATED_RESOURCES) {
    queryClient.invalidateQueries({ queryKey: [resource] });
  }
  queryClient.invalidateQueries({
    predicate: (query) => isFinancialDocumentsListKey(query.queryKey),
  });
};
