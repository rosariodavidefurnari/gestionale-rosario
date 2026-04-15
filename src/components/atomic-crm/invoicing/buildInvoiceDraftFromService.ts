import {
  calculateKmReimbursement,
  calculateServiceNetValue,
} from "@/lib/semantics/crmSemanticRegistry";

import type { Client, Project, Service } from "../types";
import type { InvoiceDraftInput } from "./invoiceDraftTypes";
import { formatDateRange } from "../misc/formatDateRange";

const prettifyEnum = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const prettifyServiceType = prettifyEnum;

/**
 * Build a user-facing label for a project to be used as a prefix in
 * invoice line descriptions. Prefers `project.name` (mandatory in the
 * type but defensive against runtime empty strings) and falls back to
 * a prettified `project.category` if the name is missing.
 *
 * Returns undefined if neither is available.
 */
export const formatProjectLabel = (
  project: Pick<Project, "name" | "category"> | null | undefined,
): string | undefined => {
  if (!project) return undefined;
  const trimmedName = project.name?.trim();
  if (trimmedName) return trimmedName;
  if (project.category) return prettifyEnum(project.category);
  return undefined;
};

/**
 * Build a comprehensive line-item description from all populated service
 * fields so the invoice draft is self-explanatory. When `projectLabel`
 * is provided it is prepended to the description so the line carries
 * the project context even when read in isolation (e.g. in the XML
 * sent to SdI, which has no "Rif. progetto" field).
 *
 * Pattern: "{projectLabel} · {description} · {ServiceType} del {date range} · {location}"
 * Any part is omitted when the underlying field is empty/null.
 */
export const buildServiceLineDescription = (
  service: Service,
  projectLabel?: string,
): string => {
  const parts: string[] = [];

  if (projectLabel?.trim()) {
    parts.push(projectLabel.trim());
  }

  const serviceType = prettifyServiceType(service.service_type);
  const dateRange = formatDateRange(
    service.service_date,
    service.service_end,
    service.all_day,
  );

  const trimmedDescription = service.description?.trim() ?? "";
  const trimmedLocation = service.location?.trim() ?? "";

  if (trimmedDescription) {
    parts.push(trimmedDescription);
  }

  parts.push(dateRange ? `${serviceType} del ${dateRange}` : serviceType);

  // Skip location when it's an exact duplicate of the description
  // (case-insensitive). Users sometimes fill both fields with the
  // shoot city — e.g. description="Piana Degli Albanesi" and
  // location="Piana Degli Albanesi". Without this guard the line
  // would read "... · Piana Degli Albanesi · Montaggio del X · Piana
  // Degli Albanesi", which is noise on the invoice.
  if (
    trimmedLocation &&
    trimmedLocation.toLowerCase() !== trimmedDescription.toLowerCase()
  ) {
    parts.push(trimmedLocation);
  }

  return parts.join(" · ");
};

const formatKmRate = (rate: number) =>
  rate.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Build a comprehensive km reimbursement description showing route,
 * trip mode, distance and rate per km.
 *
 * Note: `service.location` is the venue where the service took place,
 * NOT the travel route. Route info comes from `travel_origin`,
 * `travel_destination` and `trip_mode`.
 *
 * Examples:
 *   "Rimborso chilometrico · Catania – Agrigento A/R · 200 km × €0,40/km"
 *   "Rimborso chilometrico · 120 km × €0,19/km"  (no route data)
 */
export const buildKmLineDescription = (
  service: Service,
  defaultKmRate: number,
  projectLabel?: string,
): string => {
  const parts: string[] = [];

  if (projectLabel?.trim()) {
    parts.push(projectLabel.trim());
  }

  parts.push("Rimborso chilometrico");

  if (service.travel_origin?.trim() && service.travel_destination?.trim()) {
    const route = `${service.travel_origin.trim()} – ${service.travel_destination.trim()}`;
    parts.push(service.trip_mode === "round_trip" ? `${route} A/R` : route);
  }

  const effectiveRate = service.km_rate || defaultKmRate;
  parts.push(`${service.km_distance} km × €${formatKmRate(effectiveRate)}/km`);

  return parts.join(" · ");
};

export const buildInvoiceDraftFromService = ({
  service,
  client,
  defaultKmRate = 0.19,
}: {
  service: Service;
  client: Client;
  defaultKmRate?: number;
}): InvoiceDraftInput => {
  const isAlreadyInvoiced =
    typeof service.invoice_ref === "string" &&
    service.invoice_ref.trim().length > 0;

  const netValue = calculateServiceNetValue(service);
  const kmValue = calculateKmReimbursement({
    kmDistance: service.km_distance,
    kmRate: service.km_rate,
    defaultKmRate,
  });

  const lineItems = isAlreadyInvoiced
    ? []
    : [
        netValue > 0
          ? {
              description: buildServiceLineDescription(service),
              quantity: 1,
              unitPrice: netValue,
              kind: "service" as const,
            }
          : null,
        kmValue > 0
          ? {
              description: buildKmLineDescription(service, defaultKmRate),
              quantity: 1,
              unitPrice: kmValue,
              kind: "km" as const,
            }
          : null,
      ].filter((lineItem): lineItem is NonNullable<typeof lineItem> =>
        Boolean(lineItem),
      );

  const dateRange = formatDateRange(
    service.service_date,
    service.service_end,
    service.all_day,
  );

  return {
    client,
    lineItems,
    notes: service.notes ?? undefined,
    source: {
      kind: "service",
      id: service.id,
      label: service.description
        ? `${service.description.trim()} · ${dateRange}`
        : `${prettifyServiceType(service.service_type)} · ${dateRange}`,
    },
  };
};
