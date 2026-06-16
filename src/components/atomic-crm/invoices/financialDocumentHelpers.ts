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
  // Step 1: format with en-US → "1,000.00"
  const enUS = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  // Step 2: swap separators en-US → it-IT
  // en-US uses "," as thousands separator and "." as decimal separator.
  // We need the opposite: "." as thousands and "," as decimal.
  // Split on the decimal point, rewrite the integer part, then rejoin.
  const [intPart, decPart] = enUS.split(".");
  const intItIT = intPart.replace(/,/g, ".");
  const itIT = `${intItIT},${decPart}`;

  return currency === "EUR" ? `${itIT} €` : `${itIT} ${currency}`;
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
