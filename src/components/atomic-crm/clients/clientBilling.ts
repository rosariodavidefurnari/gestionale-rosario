import type { Client } from "../types";

type ClientBillingShape = Partial<
  Pick<
    Client,
    | "name"
    | "billing_name"
    | "address"
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
const normalizeSpaces = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : null;
};
const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
const normalizeCompact = (value?: string | null) =>
  normalizeSpaces(value)?.replace(/\s+/g, "").toUpperCase() ?? null;
const normalizeComparable = (value?: string | null) =>
  normalizeSpaces(value)?.toLocaleLowerCase("it-IT") ?? null;

export const getClientDistinctBillingName = (
  client?: ClientBillingShape | null,
) => {
  const billingName = clean(client?.billing_name);
  const name = clean(client?.name);

  if (!billingName) {
    return null;
  }

  return normalizeComparable(billingName) === normalizeComparable(name)
    ? null
    : billingName;
};

export const getClientBillingDisplayName = (
  client?: ClientBillingShape | null,
) => getClientDistinctBillingName(client) || clean(client?.name) || null;

export const formatClientBillingAddress = (
  client?: ClientBillingShape | null,
) => {
  if (!client) {
    return null;
  }

  const streetLine = [
    clean(client.billing_address_street),
    clean(client.billing_address_number),
  ]
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
  const structured = [streetLine, cityLine, country]
    .filter(Boolean)
    .join(" · ");

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

  return lines;
};

export const getClientInvoiceWorkspaceLabel = (
  client?: ClientBillingShape | null,
) =>
  [
    clean(client?.name),
    getClientDistinctBillingName(client),
    clean(client?.vat_number) ? `P.IVA ${clean(client?.vat_number)}` : null,
    clean(client?.fiscal_code) ? `CF ${clean(client?.fiscal_code)}` : null,
    clean(client?.email),
  ]
    .filter(Boolean)
    .join(" · ");

export const normalizeClientForSave = <
  T extends Partial<Client> & { tax_id?: string | null },
>(
  client: T,
) => {
  const normalizedName =
    typeof client.name === "string"
      ? (normalizeSpaces(client.name) ?? "")
      : client.name;
  const normalizedBillingName = normalizeSpaces(client.billing_name);
  const normalizedVatNumber = normalizeCompact(client.vat_number);
  const normalizedFiscalCode = normalizeCompact(client.fiscal_code);
  const normalizedLegacyTaxId = normalizeCompact(client.tax_id);

  return {
    ...client,
    name: normalizedName,
    billing_name:
      normalizedBillingName &&
      normalizeComparable(normalizedBillingName) !==
        normalizeComparable(normalizedName)
        ? normalizedBillingName
        : null,
    phone: normalizeSpaces(client.phone),
    email: normalizeSpaces(client.email),
    address: normalizeSpaces(client.address),
    tax_id:
      normalizedLegacyTaxId &&
      normalizedLegacyTaxId !== normalizedVatNumber &&
      normalizedLegacyTaxId !== normalizedFiscalCode
        ? normalizedLegacyTaxId
        : null,
    vat_number: normalizedVatNumber,
    fiscal_code: normalizedFiscalCode,
    billing_address_street: normalizeSpaces(client.billing_address_street),
    billing_address_number: normalizeSpaces(client.billing_address_number),
    billing_postal_code: normalizeSpaces(client.billing_postal_code),
    billing_city: normalizeSpaces(client.billing_city),
    billing_province: normalizeCompact(client.billing_province),
    billing_country: normalizeSpaces(client.billing_country),
    billing_sdi_code: normalizeCompact(client.billing_sdi_code),
    billing_pec: normalizeSpaces(client.billing_pec)?.toLowerCase() ?? null,
    notes: normalizeOptionalText(client.notes),
  } as T;
};
