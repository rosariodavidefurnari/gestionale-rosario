import type { BusinessProfile, Client } from "../types";

/**
 * Validate that issuer (BusinessProfile) and client carry every field the
 * FatturaPA XML marks as mandatory, BEFORE emitting an invoice.
 *
 * Aruba/SdI reject a non-conformant XML silently (DOM-3), so emit must be
 * blocked with a clear list of what is missing. The required fields mirror the
 * mandatory tags built in `invoiceDraftXml.ts`:
 * - issuer: name (Denominazione), vatNumber (IdCodice), addressStreet
 *   (Indirizzo), addressPostalCode (CAP), addressCity (Comune).
 * - client: name|billing_name (Denominazione); vat_number|fiscal_code (fiscal
 *   identity); billing_address_street + billing_postal_code + billing_city
 *   (Sede minimum required by `buildClientSede`).
 */
export type InvoiceBillingValidation = {
  ok: boolean;
  missing: string[];
};

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || String(value).trim().length === 0;

export const isInvoiceBillingComplete = ({
  client,
  issuer,
}: {
  client: Client;
  issuer: BusinessProfile;
}): InvoiceBillingValidation => {
  const missing: string[] = [];

  // Issuer (emittente)
  if (isBlank(issuer?.name)) missing.push("Nome/denominazione emittente");
  if (isBlank(issuer?.vatNumber)) missing.push("P.IVA emittente");
  if (isBlank(issuer?.addressStreet)) missing.push("Indirizzo emittente");
  if (isBlank(issuer?.addressPostalCode)) missing.push("CAP emittente");
  if (isBlank(issuer?.addressCity)) missing.push("Citta' emittente");

  // Client (cliente)
  if (isBlank(client?.billing_name) && isBlank(client?.name)) {
    missing.push("Nome/denominazione cliente");
  }
  if (isBlank(client?.vat_number) && isBlank(client?.fiscal_code)) {
    missing.push("P.IVA o codice fiscale cliente");
  }
  if (
    isBlank(client?.billing_address_street) ||
    isBlank(client?.billing_postal_code) ||
    isBlank(client?.billing_city)
  ) {
    missing.push("Indirizzo cliente (via, CAP, citta')");
  }

  return { ok: missing.length === 0, missing };
};
