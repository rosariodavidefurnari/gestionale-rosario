import type { BusinessProfile, Client, ClientBillingProfile } from "../types";
import { getInvoiceBillingRecipient } from "./invoiceBillingRecipient";

/**
 * Validate that issuer (BusinessProfile) and client carry every field the
 * FatturaPA XML marks as mandatory, BEFORE emitting an invoice.
 *
 * Aruba/SdI reject a non-conformant XML silently (DOM-3), so emit must be
 * blocked with a clear list of what is missing. The required fields mirror the
 * mandatory tags built in `invoiceDraftXml.ts`:
 * - issuer: name (Denominazione), vatNumber (IdCodice), addressStreet
 *   (Indirizzo), addressPostalCode (CAP), addressCity (Comune).
 * - recipient: selected client billing profile, or main client fallback:
 *   name|billing_name (Denominazione); vat_number|fiscal_code (fiscal identity);
 *   billing_address_street + billing_postal_code + billing_city (Sede minimum
 *   required by the XML builder).
 */
export type InvoiceBillingValidation = {
  ok: boolean;
  missing: string[];
};

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || String(value).trim().length === 0;

export const isInvoiceBillingComplete = ({
  billingProfile,
  client,
  issuer,
}: {
  billingProfile?: ClientBillingProfile | null;
  client: Client;
  issuer: BusinessProfile;
}): InvoiceBillingValidation => {
  const missing: string[] = [];
  const recipient = getInvoiceBillingRecipient({ client, billingProfile });

  // Issuer (emittente)
  if (isBlank(issuer?.name)) missing.push("Nome/denominazione emittente");
  if (isBlank(issuer?.vatNumber)) missing.push("P.IVA emittente");
  if (isBlank(issuer?.addressStreet)) missing.push("Indirizzo emittente");
  if (isBlank(issuer?.addressPostalCode)) missing.push("CAP emittente");
  if (isBlank(issuer?.addressCity)) missing.push("Citta' emittente");

  // Recipient (client or selected fiscal billing profile)
  if (isBlank(recipient.name)) {
    missing.push("Nome/denominazione cliente");
  }
  if (isBlank(recipient.vat_number) && isBlank(recipient.fiscal_code)) {
    missing.push("P.IVA o codice fiscale cliente");
  }
  if (
    isBlank(recipient.billing_address_street) ||
    isBlank(recipient.billing_postal_code) ||
    isBlank(recipient.billing_city)
  ) {
    missing.push("Indirizzo cliente (via, CAP, citta')");
  }

  return { ok: missing.length === 0, missing };
};
