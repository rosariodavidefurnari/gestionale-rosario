import type { Identifier } from "ra-core";

import type { Client, ClientBillingProfile } from "../types";
import { getClientBillingDisplayName } from "../clients/clientBilling";

export type InvoiceBillingRecipient = {
  operationalClientId: Identifier;
  profileId: Identifier | null;
  label: string;
  name: string;
  vat_number?: string | null;
  fiscal_code?: string | null;
  billing_address_street?: string | null;
  billing_address_number?: string | null;
  billing_postal_code?: string | null;
  billing_city?: string | null;
  billing_province?: string | null;
  billing_country?: string | null;
  billing_sdi_code?: string | null;
  billing_pec?: string | null;
};

const clean = (value?: string | null) => value?.trim() || "";

export const getInvoiceBillingRecipient = ({
  client,
  billingProfile,
}: {
  client: Client;
  billingProfile?: ClientBillingProfile | null;
}): InvoiceBillingRecipient => {
  if (billingProfile) {
    return {
      operationalClientId: client.id,
      profileId: billingProfile.id,
      label: billingProfile.label,
      name: billingProfile.billing_name,
      vat_number: billingProfile.vat_number ?? null,
      fiscal_code: billingProfile.fiscal_code ?? null,
      billing_address_street: billingProfile.billing_address_street ?? null,
      billing_address_number: billingProfile.billing_address_number ?? null,
      billing_postal_code: billingProfile.billing_postal_code ?? null,
      billing_city: billingProfile.billing_city ?? null,
      billing_province: billingProfile.billing_province ?? null,
      billing_country: billingProfile.billing_country ?? null,
      billing_sdi_code: billingProfile.billing_sdi_code ?? null,
      billing_pec: billingProfile.billing_pec ?? null,
    };
  }

  return {
    operationalClientId: client.id,
    profileId: null,
    label: "Cliente principale",
    name: getClientBillingDisplayName(client) ?? client.name ?? "Cliente",
    vat_number: client.vat_number ?? null,
    fiscal_code: client.fiscal_code ?? null,
    billing_address_street: client.billing_address_street ?? null,
    billing_address_number: client.billing_address_number ?? null,
    billing_postal_code: client.billing_postal_code ?? null,
    billing_city: client.billing_city ?? null,
    billing_province: client.billing_province ?? null,
    billing_country: client.billing_country ?? null,
    billing_sdi_code: client.billing_sdi_code ?? null,
    billing_pec: client.billing_pec ?? null,
  };
};

export const formatInvoiceBillingRecipientAddress = (
  recipient?: InvoiceBillingRecipient | null,
) => {
  if (!recipient) {
    return null;
  }

  const streetLine = [
    clean(recipient.billing_address_street),
    clean(recipient.billing_address_number),
  ]
    .filter(Boolean)
    .join(", ");
  const cityLine = [
    clean(recipient.billing_postal_code),
    clean(recipient.billing_city),
    clean(recipient.billing_province),
  ]
    .filter(Boolean)
    .join(" ");
  const country = clean(recipient.billing_country);

  return [streetLine, cityLine, country].filter(Boolean).join(" · ") || null;
};

export const getInvoiceBillingRecipientIdentityLines = (
  recipient?: InvoiceBillingRecipient | null,
) => {
  if (!recipient) {
    return [];
  }

  return [
    clean(recipient.vat_number)
      ? `P.IVA: ${clean(recipient.vat_number)}`
      : null,
    clean(recipient.fiscal_code) ? `CF: ${clean(recipient.fiscal_code)}` : null,
    clean(recipient.billing_sdi_code)
      ? `Codice destinatario: ${clean(recipient.billing_sdi_code)}`
      : null,
    clean(recipient.billing_pec)
      ? `PEC: ${clean(recipient.billing_pec)}`
      : null,
  ].filter((line): line is string => Boolean(line));
};
