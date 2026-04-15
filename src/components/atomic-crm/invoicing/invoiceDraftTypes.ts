import type { Identifier } from "ra-core";

import type { Client } from "../types";

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
  lineItems: InvoiceDraftLineItem[];
  invoiceDate?: string;
  notes?: string;
  source: InvoiceDraftSource;
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
