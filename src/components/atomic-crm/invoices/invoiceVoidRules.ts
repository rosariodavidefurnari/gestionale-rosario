import type { FinancialDocumentSummary, Payment } from "../types";

/**
 * Frontend mirror of the EF `canVoidEmittedInvoice` (supabase/functions/_shared/
 * invoiceVoid.ts) — duplicated across runtimes like `dateTimezone`. Used ONLY to
 * decide whether to SHOW the "Annulla emissione" button; the Edge Function
 * re-checks and is the real authority (refuses with 409 otherwise).
 *
 * Voidable = outbound customer invoice emitted by the app (>=1 linked payment)
 * whose payments are ALL still uncollected (in_attesa / scaduto, cash-neutral).
 * Any `ricevuto` (real cash) -> not voidable from here.
 */
export const canVoidInvoiceFromPayments = (
  doc: Pick<FinancialDocumentSummary, "direction" | "document_type">,
  linkedPayments: Pick<Payment, "status">[],
): boolean => {
  if (
    doc.direction !== "outbound" ||
    doc.document_type !== "customer_invoice"
  ) {
    return false;
  }
  if (linkedPayments.length === 0) return false;
  return linkedPayments.every(
    (p) => p.status === "in_attesa" || p.status === "scaduto",
  );
};
