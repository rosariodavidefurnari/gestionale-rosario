// Pure decision for "Annulla emissione" (invoice void). No Deno/DB imports so it
// is unit-testable under vitest AND is the SINGLE decider shared by UI + EF.

export type VoidablePayment = { id: string; status: string };
export type VoidableDoc = { direction: string; document_type: string };
export type CanVoidResult = { ok: true } | { ok: false; reason: string };

// Payment statuses that represent real collected cash (must NEVER be deleted by
// a void). The voidable, cash-neutral states are in_attesa + scaduto (both are
// "expected, not collected" — excluded from the cash basis in fiscalModel).
const COLLECTED = new Set(["ricevuto"]);
const VOIDABLE_PENDING = new Set(["in_attesa", "scaduto"]);

/**
 * A void is allowed only for an app-emitted customer invoice whose linked
 * payments are all still uncollected (in_attesa/scaduto).
 *
 * - non outbound/customer_invoice -> non_supportata
 * - 0 linked payments (historical/imported, no financial_document_id) -> non_app_emessa
 * - any payment ricevuto -> incassata (refuse: would delete real cash)
 * - any payment with an unexpected status -> stato_inatteso
 */
export const canVoidEmittedInvoice = (
  doc: VoidableDoc,
  linkedPayments: readonly VoidablePayment[],
): CanVoidResult => {
  if (
    doc.direction !== "outbound" ||
    doc.document_type !== "customer_invoice"
  ) {
    return { ok: false, reason: "non_supportata" };
  }
  if (linkedPayments.length === 0) {
    return { ok: false, reason: "non_app_emessa" };
  }
  if (linkedPayments.some((p) => COLLECTED.has(p.status))) {
    return { ok: false, reason: "incassata" };
  }
  if (linkedPayments.some((p) => !VOIDABLE_PENDING.has(p.status))) {
    return { ok: false, reason: "stato_inatteso" };
  }
  return { ok: true };
};

export const voidReasonMessage = (reason: string): string =>
  ({
    incassata: "Fattura gia' incassata: scollega prima l'incasso, poi annulla.",
    non_app_emessa:
      "Questa fattura non e' stata emessa dall'app: non e' annullabile da qui.",
    non_supportata:
      "Solo le fatture cliente emesse dall'app sono annullabili da qui.",
    stato_inatteso: "Stato incasso non gestito: intervenire manualmente.",
  })[reason] ?? "Annullamento non consentito.";
