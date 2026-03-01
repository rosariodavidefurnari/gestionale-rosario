import type { Client } from "../types";

type ClientBillingShape = Partial<
  Pick<
    Client,
    | "name"
    | "billing_name"
    | "address"
    | "tax_id"
    | "vat_number"
    | "fiscal_code"
    | "billing_address_street"
    | "billing_address_number"
    | "billing_postal_code"
    | "billing_city"
    | "billing_province"
    | "billing_country"
    | "billing_sdi_code"
    | "billing_pec"
    | "email"
  >
>;

const clean = (value?: string | null) => value?.trim() || "";

export const getClientBillingDisplayName = (client?: ClientBillingShape | null) =>
  clean(client?.billing_name) || clean(client?.name) || null;

export const formatClientBillingAddress = (client?: ClientBillingShape | null) => {
  if (!client) {
    return null;
  }

  const streetLine = [clean(client.billing_address_street), clean(client.billing_address_number)]
    .filter(Boolean)
    .join(", ");
  const cityLine = [
    clean(client.billing_postal_code),
    clean(client.billing_city),
    clean(client.billing_province),
  ]
    .filter(Boolean)
    .join(" ");
  const country = clean(client.billing_country);
  const structured = [streetLine, cityLine, country].filter(Boolean).join(" · ");

  return structured || clean(client.address) || null;
};

export const getClientBillingIdentityLines = (
  client?: ClientBillingShape | null,
) => {
  if (!client) {
    return [];
  }

  const lines = [
    clean(client.vat_number) ? `P.IVA: ${clean(client.vat_number)}` : null,
    clean(client.fiscal_code) ? `CF: ${clean(client.fiscal_code)}` : null,
    clean(client.billing_sdi_code)
      ? `Codice destinatario: ${clean(client.billing_sdi_code)}`
      : null,
    clean(client.billing_pec) ? `PEC: ${clean(client.billing_pec)}` : null,
  ].filter(Boolean);

  if (lines.length > 0) {
    return lines;
  }

  return clean(client.tax_id) ? [`P.IVA / CF: ${clean(client.tax_id)}`] : [];
};

export const getClientInvoiceWorkspaceLabel = (
  client?: ClientBillingShape | null,
) =>
  [
    clean(client?.name),
    clean(client?.billing_name) &&
    clean(client?.billing_name) !== clean(client?.name)
      ? clean(client?.billing_name)
      : null,
    clean(client?.vat_number) ? `P.IVA ${clean(client?.vat_number)}` : null,
    clean(client?.fiscal_code) ? `CF ${clean(client?.fiscal_code)}` : null,
    clean(client?.email),
  ]
    .filter(Boolean)
    .join(" · ");
