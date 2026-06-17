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
  tone: "settled" | "pending";
};

export const getServiceBillingState = (
  service: Pick<Service, "invoice_ref">,
): ServiceBillingState =>
  isServiceBilled(service)
    ? { label: "Fatturato", tone: "settled" }
    : { label: "Da fatturare", tone: "pending" };

/**
 * Bridge target: from a service (registro lavori) navigate to its project's
 * invoice draft, which auto-opens (`?invoiceDraft=true`, ProjectShow) and is the
 * surface where the "Emetti" action is available (it groups all the project's
 * unbilled work into one invoice).
 */
export const buildProjectInvoiceEmitPath = (projectId: Identifier): string =>
  `/projects/${projectId}/show?invoiceDraft=true`;
