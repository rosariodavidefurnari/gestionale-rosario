import type { Identifier } from "ra-core";

import type { Client, ClientBillingProfile } from "../types";

/**
 * Kind of an invoice draft line item. Used by downstream renderers to
 * decide how to present or consolidate lines.
 *
 * - `service`: a work log entry (the main fee)
 * - `km`: a mileage reimbursement attached to a preceding service
 * - `expense`: a billable expense (rental, materials, etc.)
 * - `payment`: a negative line for payments already received
 * - `stamp_duty`: Italian virtual stamp duty (bollo 2 €)
 *
 * Optional to preserve backward compatibility; defaults to "service".
 */
export type InvoiceDraftLineKind =
  | "service"
  | "km"
  | "expense"
  | "payment"
  | "stamp_duty";

export type InvoiceDraftLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  kind?: InvoiceDraftLineKind;
};

export type InvoiceDraftSource = {
  kind: "service" | "project" | "client" | "quote";
  id: Identifier;
  label: string;
};

export type InvoiceDraftInput = {
  client: Client;
  billingProfile?: ClientBillingProfile | null;
  lineItems: InvoiceDraftLineItem[];
  invoiceDate?: string;
  notes?: string;
  source: InvoiceDraftSource;
  /**
   * Ids of the source `services` whose lines are included in this draft.
   * Consumed by the "Emetti fattura" flow to mark them invoiced. Populated by
   * the project/client builders; absent on draft-only sources.
   */
  serviceIds?: Identifier[];
  /**
   * Ids of the source `expenses` included in this draft. EXCLUDES the km
   * auto-expenses created by the `sync_service_km_expense` trigger
   * (`source_service_id` set) — those are already represented by the service
   * km line (DB-8).
   */
  expenseIds?: Identifier[];
};

export type InvoiceDraftTotals = {
  taxableAmount: number;
  stampDuty: number;
  totalAmount: number;
};

export const normalizeInvoiceDraftLineItems = (
  lineItems: InvoiceDraftLineItem[],
) =>
  lineItems
    .filter((lineItem) => lineItem.description.trim().length > 0)
    .map((lineItem) => ({
      description: lineItem.description.trim(),
      quantity: Number.isFinite(lineItem.quantity) ? lineItem.quantity : 0,
      unitPrice: Number.isFinite(lineItem.unitPrice) ? lineItem.unitPrice : 0,
      ...(lineItem.kind ? { kind: lineItem.kind } : {}),
    }))
    .filter((lineItem) => lineItem.quantity > 0 || lineItem.unitPrice !== 0);

export const getInvoiceDraftLineTotal = (
  lineItem: Pick<InvoiceDraftLineItem, "quantity" | "unitPrice">,
) => lineItem.quantity * lineItem.unitPrice;

export const computeInvoiceDraftTotals = (
  lineItems: InvoiceDraftLineItem[],
): InvoiceDraftTotals => {
  const taxableAmount = normalizeInvoiceDraftLineItems(lineItems).reduce(
    (sum, lineItem) => sum + getInvoiceDraftLineTotal(lineItem),
    0,
  );
  const stampDuty = taxableAmount > 77.47 ? 2 : 0;

  return {
    taxableAmount,
    stampDuty,
    totalAmount: taxableAmount + stampDuty,
  };
};

export const hasInvoiceDraftCollectableAmount = (
  draft: Pick<InvoiceDraftInput, "lineItems"> | null | undefined,
) => computeInvoiceDraftTotals(draft?.lineItems ?? []).totalAmount > 0;

/**
 * Amounts for an EMITTED invoice, separating the document gross from the cash
 * still to collect (spec v2 F3).
 *
 * - `grossTaxable`: invoice imponibile = sum of service/km/expense lines,
 *   EXCLUDING the negative "Pagamenti gia ricevuti" line and any stamp line.
 *   This is what `financial_documents.taxable_amount` must store.
 * - `stampDuty`: virtual stamp (2 €) computed on the gross imponibile.
 * - `grossTotal`: `grossTaxable + stampDuty` -> `financial_documents.total_amount`.
 * - `netCollectable`: gross imponibile minus payments already received
 *   (the negative payment line) -> the expected `payments.amount`.
 *
 * In v1 (no prior acconto on the draft) `grossTaxable === netCollectable`.
 * Distinct from `computeInvoiceDraftTotals` (the XML basis), left unchanged.
 */
export type InvoiceDraftAmounts = {
  grossTaxable: number;
  stampDuty: number;
  grossTotal: number;
  netCollectable: number;
  hasPriorReceived: boolean;
};

export const computeInvoiceDraftAmounts = (
  lineItems: InvoiceDraftLineItem[],
): InvoiceDraftAmounts => {
  const normalized = normalizeInvoiceDraftLineItems(lineItems);
  const grossTaxable = normalized
    .filter((li) => li.kind !== "payment" && li.kind !== "stamp_duty")
    .reduce((sum, li) => sum + getInvoiceDraftLineTotal(li), 0);
  const priorReceived = normalized
    .filter((li) => li.kind === "payment")
    .reduce((sum, li) => sum + getInvoiceDraftLineTotal(li), 0); // negative
  const stampDuty = grossTaxable > 77.47 ? 2 : 0;

  return {
    grossTaxable,
    stampDuty,
    grossTotal: grossTaxable + stampDuty,
    netCollectable: grossTaxable + priorReceived,
    hasPriorReceived: priorReceived !== 0,
  };
};
