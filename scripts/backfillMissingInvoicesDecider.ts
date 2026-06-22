export type BackfillPaymentCandidate = {
  id: string;
  client_id: string;
  invoice_ref: string | null;
  status: string;
  financial_document_id: string | null;
};

export type BackfillDocumentCandidate = {
  client_id: string;
  document_number: string | null;
  direction: string;
  document_type: string;
  source_path: string;
};

export type MissingInvoiceBackfillDecision =
  | { action: "create_and_link"; sourcePath: string }
  | { action: "skip"; reason: string };

const norm = (value: string | null): string => (value ?? "").trim();

export function decideMissingInvoiceBackfill(
  payment: BackfillPaymentCandidate,
  candidates: BackfillDocumentCandidate[],
): MissingInvoiceBackfillDecision {
  if (payment.financial_document_id != null) {
    return { action: "skip", reason: "already_linked" };
  }
  if (payment.status !== "ricevuto") {
    return { action: "skip", reason: `not_ricevuto:${payment.status}` };
  }
  if (norm(payment.invoice_ref) === "") {
    return { action: "skip", reason: "empty_invoice_ref" };
  }

  const matches = candidates.filter(
    (candidate) =>
      candidate.client_id === payment.client_id &&
      candidate.direction === "outbound" &&
      candidate.document_type === "customer_invoice" &&
      norm(candidate.document_number) === norm(payment.invoice_ref),
  );

  if (matches.length === 0) {
    return { action: "skip", reason: "no_xml_candidate" };
  }
  if (matches.length > 1) {
    return { action: "skip", reason: "ambiguous_xml_candidate" };
  }
  return { action: "create_and_link", sourcePath: matches[0].source_path };
}
