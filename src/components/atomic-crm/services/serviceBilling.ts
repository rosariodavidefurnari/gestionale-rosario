import type { Identifier } from "ra-core";

import type { Service } from "../types";

/** A service is "billed" when it carries a non-empty invoice reference. */
export const isServiceBilled = (
  service: Pick<Service, "invoice_ref">,
): boolean =>
  typeof service.invoice_ref === "string" &&
  service.invoice_ref.trim().length > 0;

export type ServiceBillingState = {
  label: string;
  /** Badge color classes — single source so the 3 surfaces don't drift. */
  className: string;
};

const BILLED_CLASS = "text-emerald-700 bg-emerald-50 border-emerald-200";
const UNBILLED_CLASS = "text-amber-700 bg-amber-50 border-amber-200";

export const getServiceBillingState = (
  service: Pick<Service, "invoice_ref">,
): ServiceBillingState =>
  isServiceBilled(service)
    ? { label: "Fatturato", className: BILLED_CLASS }
    : { label: "Da fatturare", className: UNBILLED_CLASS };

/**
 * Bridge target: from a service (registro lavori) navigate to its project's
 * invoice draft, which auto-opens (`?invoiceDraft=true`, ProjectShow) and is the
 * surface where the "Emetti" action is available (it groups all the project's
 * unbilled work into one invoice).
 */
export const buildProjectInvoiceEmitPath = (projectId: Identifier): string =>
  `/projects/${projectId}/show?invoiceDraft=true`;
