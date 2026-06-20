// BR2 — pure decider mirroring the SQL match logic of
// scripts/br2-link-payments-financial-documents.sql.
//
// Why a pure-fn twin of the SQL: the three fail-closed safety branches
// (non-ricevuto / no-outbound-doc / ambiguous-multi-doc) are NOT triggered by
// any row in the local seed OR in prod (verified), so neither a local rehearsal
// nor the prod C1 count can exercise them. This decider is the ONLY deterministic
// controller for those branches (spec C5 / plan T3). It encodes EXACTLY the same
// predicate the SQL applies; drift between the two is caught because the prod
// C1/C2 oracle (25/0) is derived by the SQL on real data, while this unit pins
// the branch logic on synthetic fixtures.

export type DeciderPayment = {
  id: string;
  client_id: string;
  invoice_ref: string | null;
  status: string;
  financial_document_id: string | null;
};

export type DeciderDoc = {
  id: string;
  client_id: string;
  document_number: string | null;
  direction: string;
  document_type: string;
};

export type LinkDecision =
  | { action: "link"; docId: string }
  | { action: "skip"; reason: string };

const norm = (s: string | null): string => (s ?? "").trim();

/**
 * Decide whether a single payment links to exactly one outbound customer
 * invoice. Payment-side guards only (the SQL adds a doc-side guard that skips a
 * doc matched by >1 ricevuto payment — a cross-payment concern, 0 occurrences on
 * prod, asserted there by the C1 count, not here).
 */
export function decidePaymentDocumentLink(
  payment: DeciderPayment,
  docs: DeciderDoc[],
): LinkDecision {
  if (payment.financial_document_id != null) {
    return { action: "skip", reason: "already_linked" };
  }
  if (payment.status !== "ricevuto") {
    return { action: "skip", reason: `not_ricevuto:${payment.status}` };
  }
  if (norm(payment.invoice_ref) === "") {
    return { action: "skip", reason: "empty_invoice_ref" };
  }
  const matches = docs.filter(
    (d) =>
      d.client_id === payment.client_id &&
      d.direction === "outbound" &&
      d.document_type === "customer_invoice" &&
      norm(d.document_number) !== "" &&
      norm(d.document_number) === norm(payment.invoice_ref),
  );
  if (matches.length === 0) {
    return { action: "skip", reason: "no_outbound_doc" };
  }
  if (matches.length > 1) {
    return { action: "skip", reason: "ambiguous_multi_doc" };
  }
  return { action: "link", docId: matches[0].id };
}
