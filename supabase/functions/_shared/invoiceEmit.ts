// Pure validation + value builders for the "Emetti fattura" Edge Function.
// No Deno / DB imports here so it stays unit-testable under vitest.

export type InvoiceEmitSourceKind = "project" | "client";

export type InvoiceEmitRequest = {
  clientId: string;
  source: { kind: InvoiceEmitSourceKind; id: string };
  documentNumber: string;
  issueDate: string; // YYYY-MM-DD (client-side, via toISODate)
  dueDate?: string | null; // defaults to issueDate
  grossTaxable: number; // financial_documents.taxable_amount
  stampAmount: number; // financial_documents.stamp_amount
  grossTotal: number; // financial_documents.total_amount
  netCollectable: number; // payments.amount (expected, in_attesa)
  serviceIds: string[];
  expenseIds: string[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CENT = 0.005;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

export type InvoiceEmitValidation =
  | { data: InvoiceEmitRequest; error?: undefined }
  | { data?: undefined; error: string };

/**
 * Validate the emit request. Fail-closed and explicit: this is money, so every
 * branch returns a clear Italian error instead of silently coercing.
 *
 * v1 scope guard (defense-in-depth, also enforced by the UI): rejects a draft
 * that carries a prior acconto (`grossTaxable !== netCollectable`), because the
 * gross-vs-net document semantics with a prior payment is deferred to v2.
 */
export const validateInvoiceEmitRequest = (
  payload: unknown,
): InvoiceEmitValidation => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload non valido" };
  }
  const p = payload as Record<string, unknown>;
  const source = p.source as Record<string, unknown> | undefined;

  if (!isNonEmptyString(p.clientId)) {
    return { error: "clientId mancante" };
  }
  if (
    !source ||
    (source.kind !== "project" && source.kind !== "client") ||
    !isNonEmptyString(source.id)
  ) {
    return { error: "Sorgente non valida (solo progetto o cliente)" };
  }
  if (!isNonEmptyString(p.documentNumber)) {
    return { error: "Numero fattura mancante" };
  }
  if (typeof p.issueDate !== "string" || !ISO_DATE.test(p.issueDate)) {
    return { error: "Data emissione non valida (YYYY-MM-DD)" };
  }
  if (
    p.dueDate != null &&
    (typeof p.dueDate !== "string" || !ISO_DATE.test(p.dueDate))
  ) {
    return { error: "Data scadenza non valida (YYYY-MM-DD)" };
  }

  const grossTaxable = Number(p.grossTaxable);
  const stampAmount = Number(p.stampAmount);
  const grossTotal = Number(p.grossTotal);
  const netCollectable = Number(p.netCollectable);

  if (
    ![grossTaxable, stampAmount, grossTotal, netCollectable].every(
      Number.isFinite,
    )
  ) {
    return { error: "Importi non validi" };
  }
  if (grossTaxable < 0 || stampAmount < 0) {
    return { error: "Importi negativi non ammessi" };
  }
  if (grossTotal <= 0) {
    return { error: "Totale fattura non positivo" };
  }
  if (netCollectable <= 0) {
    return { error: "Importo da incassare non positivo" };
  }
  if (Math.abs(grossTaxable - netCollectable) > CENT) {
    return {
      error: "Acconto pregresso non supportato in v1: gestione manuale",
    };
  }
  if (!isStringArray(p.serviceIds) || !isStringArray(p.expenseIds)) {
    return { error: "Elenco lavori/spese non valido" };
  }
  if (p.serviceIds.length + p.expenseIds.length === 0) {
    return { error: "Nessun lavoro o spesa da fatturare" };
  }

  return {
    data: {
      clientId: p.clientId,
      source: { kind: source.kind, id: source.id },
      documentNumber: p.documentNumber.trim(),
      issueDate: p.issueDate,
      dueDate: (p.dueDate as string | null | undefined) ?? null,
      grossTaxable,
      stampAmount,
      grossTotal,
      netCollectable,
      serviceIds: p.serviceIds,
      expenseIds: p.expenseIds,
    },
  };
};

export const buildFinancialDocumentInsert = (req: InvoiceEmitRequest) => ({
  client_id: req.clientId,
  direction: "outbound",
  document_type: "customer_invoice",
  document_number: req.documentNumber,
  issue_date: req.issueDate,
  due_date: req.dueDate ?? req.issueDate,
  total_amount: req.grossTotal,
  taxable_amount: req.grossTaxable,
  stamp_amount: req.stampAmount,
  currency_code: "EUR",
});

export type EmitPendingCandidate = {
  id: string;
  amount: number;
  payment_type: string | null;
  project_id: string | null;
  financial_document_id: string | null;
};

export type EmitExpectedDecision =
  | { action: "absorb"; paymentId: string }
  | { action: "create" }
  | { action: "ambiguous" };

/**
 * Absorbable payment types. MUST stay symmetric with FIX-3's
 * `ABSORBABLE_PAYMENT_TYPES` in
 * `src/components/atomic-crm/projects/quickPaymentReconciliation.ts` (different
 * runtime, no shared import → kept in sync by convention, see B1). A `rimborso*`
 * pending must NEVER be absorbed by an emitted `saldo` document.
 */
const ABSORBABLE_TYPES = new Set(["saldo", "acconto", "parziale"]);

/**
 * Absorb a pre-existing MANUAL in_attesa (financial_document_id NULL) instead of
 * creating a second expected payment. Disciplined like the import decider: same
 * amount (±cent) + absorbable type (never rimborso) + project scope.
 *
 * B2: FIX-4 v1 is PROJECT-LEVEL ONLY. A client-level emit (`source.kind ===
 * "client"`) has no project scope, so absorbing would risk settling the wrong
 * project's invoice → always `create` (client-level absorb is deferred to v2).
 * Project-level with >1 match → `ambiguous` (do not absorb the wrong one → the
 * caller creates a fresh expected payment).
 */
export const decideEmitExpectedPayment = (
  candidates: EmitPendingCandidate[],
  req: {
    netCollectable: number;
    source: { kind: InvoiceEmitSourceKind; id: string };
  },
): EmitExpectedDecision => {
  if (req.source.kind !== "project") return { action: "create" };
  const matches = candidates.filter(
    (c) =>
      c.financial_document_id == null &&
      ABSORBABLE_TYPES.has(c.payment_type ?? "") &&
      Math.abs(c.amount - req.netCollectable) <= CENT &&
      c.project_id === req.source.id,
  );
  if (matches.length === 0) return { action: "create" };
  if (matches.length === 1)
    return { action: "absorb", paymentId: matches[0].id };
  return { action: "ambiguous" };
};

export const buildExpectedPaymentInsert = (
  req: InvoiceEmitRequest,
  financialDocumentId: string,
) => ({
  client_id: req.clientId,
  project_id: req.source.kind === "project" ? req.source.id : null,
  quote_id: null,
  payment_date: req.dueDate ?? req.issueDate,
  payment_type: "saldo",
  amount: req.netCollectable,
  method: null,
  invoice_ref: req.documentNumber,
  status: "in_attesa",
  financial_document_id: financialDocumentId,
});
