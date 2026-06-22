import type { FinancialDocumentSummary } from "../types";
import { roundFiscalOutput } from "../dashboard/roundFiscalOutput";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CurrencyTotals = {
  netTotal: number;
  taxable: number;
  count: number;
};

export type DirectionSummary = {
  netTotal: number;
  taxable: number;
  count: number;
  byCurrency: Record<string, CurrencyTotals>;
};

export type FinancialDocumentsSummary = {
  outbound: DirectionSummary;
  inbound: DirectionSummary;
  multiCurrency: boolean;
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the document is a credit note (customer or supplier).
 * Credit notes are stored with positive total_amount in the DB and must be
 * subtracted when computing net totals.
 */
export function isCreditNote(d: FinancialDocumentSummary): boolean {
  return (
    d.document_type === "customer_credit_note" ||
    d.document_type === "supplier_credit_note"
  );
}

/**
 * Returns the signed total for a document:
 *  - invoices: positive
 *  - credit notes: negative (always, regardless of the sign stored in the DB)
 *
 * Uses Math.abs to prevent double-negation when total_amount is already negative.
 */
export function signedTotal(d: FinancialDocumentSummary): number {
  const abs = Math.abs(d.total_amount ?? 0);
  return isCreditNote(d) ? -abs : abs;
}

/**
 * Returns a signed taxable amount for a document (mirrors signedTotal logic).
 */
function signedTaxable(d: FinancialDocumentSummary): number {
  const abs = Math.abs(d.taxable_amount ?? 0);
  return isCreditNote(d) ? -abs : abs;
}

/**
 * Human-readable label for a document type.
 */
export function documentTypeLabel(
  t: FinancialDocumentSummary["document_type"],
): string {
  switch (t) {
    case "customer_invoice":
    case "supplier_invoice":
      return "Fattura";
    case "customer_credit_note":
    case "supplier_credit_note":
      return "Nota di credito";
  }
}

/**
 * Human-readable label for a document direction.
 */
export function directionLabel(
  dir: FinancialDocumentSummary["direction"],
): string {
  return dir === "outbound" ? "Emessa" : "Ricevuta";
}

const cleanText = (value?: string | null): string => value?.trim() || "";

export function getFinancialDocumentBillingRecipientLabel(
  doc: FinancialDocumentSummary,
): string | null {
  return (
    cleanText(doc.billing_profile_label) ||
    cleanText(doc.billing_profile_name) ||
    null
  );
}

export function getFinancialDocumentBillingRecipientLegalName(
  doc: FinancialDocumentSummary,
): string | null {
  return cleanText(doc.billing_profile_name) || null;
}

export function getFinancialDocumentBillingRecipientIdentityLines(
  doc: FinancialDocumentSummary,
): string[] {
  return [
    cleanText(doc.billing_profile_vat_number)
      ? `P.IVA: ${cleanText(doc.billing_profile_vat_number)}`
      : null,
    cleanText(doc.billing_profile_fiscal_code)
      ? `CF: ${cleanText(doc.billing_profile_fiscal_code)}`
      : null,
    cleanText(doc.billing_profile_sdi_code)
      ? `Codice destinatario: ${cleanText(doc.billing_profile_sdi_code)}`
      : null,
    cleanText(doc.billing_profile_pec)
      ? `PEC: ${cleanText(doc.billing_profile_pec)}`
      : null,
  ].filter((line): line is string => Boolean(line));
}

/**
 * Formats a number in Italian style with 2 decimal places:
 *   thousands separator = "."  (punto)
 *   decimal separator   = ","  (virgola)
 *
 * Does NOT rely on Intl.NumberFormat locale data (Node.js ships with partial
 * ICU that omits the it-IT thousands separator). Instead it uses the
 * en-US formatter (always available) and then swaps the separators, which is
 * equivalent and deterministic across all runtimes.
 *
 * Examples:
 *   formatEur(1000)        → "1.000,00 €"
 *   formatEur(800)         → "800,00 €"
 *   formatEur(50, "USD")   → "50,00 USD"
 */
export function formatEur(n: number, currency = "EUR"): string {
  // Normalize negative zero so rounded results never render as "-0,00 €".
  // Covers the literal -0 and any value whose magnitude rounds to 0.00
  // (e.g. -0.0001), which the en-US formatter would otherwise print as
  // "-0.00".
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  const safe = Object.is(rounded, -0) || rounded === 0 ? 0 : n;

  // Step 1: format with en-US → "1,000.00"
  const enUS = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);

  // Step 2: swap separators en-US → it-IT
  // en-US uses "," as thousands separator and "." as decimal separator.
  // We need the opposite: "." as thousands and "," as decimal.
  // Split on the decimal point, rewrite the integer part, then rejoin.
  const [intPart, decPart] = enUS.split(".");
  const intItIT = intPart.replace(/,/g, ".");
  const itIT = `${intItIT},${decPart}`;

  return currency === "EUR" ? `${itIT} €` : `${itIT} ${currency}`;
}

/**
 * Collection state of a financial document derived from its LINKED payments
 * (via `payments.financial_document_id`), NOT from the dead `settlement_status`
 * column (which depends on `financial_document_cash_allocations`, never written).
 *
 * - no linked payments -> neutral "—" (historical imported docs have no link)
 * - all linked payments received -> "Incassata"
 * - any overdue -> "Scaduta"
 * - any pending -> "Da incassare"
 * - mixed -> "Parziale"
 */
export type DocumentCollectionState = {
  label: string;
  tone: "neutral" | "pending" | "settled" | "overdue";
};

export function deriveDocumentCollectionState(
  payments: { status: string }[] | null | undefined,
): DocumentCollectionState {
  if (!payments || payments.length === 0) {
    return { label: "—", tone: "neutral" };
  }
  if (payments.every((p) => p.status === "ricevuto")) {
    return { label: "Incassata", tone: "settled" };
  }
  // Mixed: at least one received but not all -> partially collected.
  if (payments.some((p) => p.status === "ricevuto")) {
    return { label: "Parziale", tone: "pending" };
  }
  if (payments.some((p) => p.status === "scaduto")) {
    return { label: "Scaduta", tone: "overdue" };
  }
  return { label: "Da incassare", tone: "pending" };
}

/**
 * Tailwind classes for a collection-state badge, keyed by tone. Shared between
 * the document Show (inline badge) and the Fatture list column. The `neutral`
 * tone has NO badge style on purpose: surfaces render it as a muted "—" instead
 * of a Badge (a list cell cannot be empty the way an inline Show badge can).
 */
export const COLLECTION_TONE_CLASS: Record<
  Exclude<DocumentCollectionState["tone"], "neutral">,
  string
> = {
  pending: "text-amber-700 bg-amber-50 border-amber-200",
  settled: "text-emerald-700 bg-emerald-50 border-emerald-200",
  overdue: "text-red-700 bg-red-50 border-red-200",
};

/**
 * Groups payments by their linked `financial_document_id` (skipping unlinked
 * rows). Lets the Fatture list derive a per-row collection state from ONE
 * page-agnostic payments fetch instead of an N+1 per-document query.
 */
export function groupPaymentsByDocument<
  T extends { financial_document_id?: string | null },
>(payments: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const p of payments) {
    if (!p.financial_document_id) continue;
    const key = String(p.financial_document_id);
    const existing = map.get(key);
    if (existing) existing.push(p);
    else map.set(key, [p]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function emptyDirectionSummary(): DirectionSummary {
  return { netTotal: 0, taxable: 0, count: 0, byCurrency: {} };
}

/**
 * Aggregates a list of financial documents into per-direction totals.
 *
 * - Credit notes are subtracted (signedTotal / signedTaxable).
 * - Rounding is applied via roundFiscalOutput to final totals.
 * - multiCurrency is true when more than one distinct currency_code is present.
 */
export function summarizeFinancialDocuments(
  docs: FinancialDocumentSummary[],
): FinancialDocumentsSummary {
  const outbound = emptyDirectionSummary();
  const inbound = emptyDirectionSummary();
  const allCurrencies = new Set<string>();

  for (const d of docs) {
    const bucket = d.direction === "outbound" ? outbound : inbound;
    const st = signedTotal(d);
    const tx = signedTaxable(d);
    const cur = d.currency_code ?? "EUR";

    bucket.netTotal += st;
    bucket.taxable += tx;
    bucket.count += 1;
    allCurrencies.add(cur);

    if (!bucket.byCurrency[cur]) {
      bucket.byCurrency[cur] = { netTotal: 0, taxable: 0, count: 0 };
    }
    bucket.byCurrency[cur].netTotal += st;
    bucket.byCurrency[cur].taxable += tx;
    bucket.byCurrency[cur].count += 1;
  }

  // Apply fiscal rounding to aggregate totals
  outbound.netTotal = roundFiscalOutput(outbound.netTotal);
  outbound.taxable = roundFiscalOutput(outbound.taxable);
  inbound.netTotal = roundFiscalOutput(inbound.netTotal);
  inbound.taxable = roundFiscalOutput(inbound.taxable);

  for (const cur of Object.keys(outbound.byCurrency)) {
    outbound.byCurrency[cur].netTotal = roundFiscalOutput(
      outbound.byCurrency[cur].netTotal,
    );
    outbound.byCurrency[cur].taxable = roundFiscalOutput(
      outbound.byCurrency[cur].taxable,
    );
  }
  for (const cur of Object.keys(inbound.byCurrency)) {
    inbound.byCurrency[cur].netTotal = roundFiscalOutput(
      inbound.byCurrency[cur].netTotal,
    );
    inbound.byCurrency[cur].taxable = roundFiscalOutput(
      inbound.byCurrency[cur].taxable,
    );
  }

  return {
    outbound,
    inbound,
    multiCurrency: allCurrencies.size > 1,
  };
}
