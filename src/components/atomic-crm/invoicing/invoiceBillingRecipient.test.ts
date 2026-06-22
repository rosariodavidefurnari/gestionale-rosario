import { describe, expect, it } from "vitest";

import type { Client, ClientBillingProfile } from "../types";
import type { InvoiceDraftInput } from "./invoiceDraftTypes";
import {
  formatInvoiceBillingRecipientAddress,
  getInvoiceBillingRecipient,
  getInvoiceBillingRecipientIdentityLines,
} from "./invoiceBillingRecipient";

const client: Client = {
  id: "client-gs",
  name: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
  client_type: "produzione_tv",
  fiscal_code: "05416820875",
  billing_address_street: "Via Marino",
  billing_postal_code: "95031",
  billing_city: "Adrano",
  billing_province: "CT",
  billing_country: "IT",
  billing_sdi_code: "KRRH6B9",
  tags: [],
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const liveProfile: ClientBillingProfile = {
  id: "profile-live",
  client_id: "client-gs",
  label: "LIVE SRLS",
  billing_name: "LIVE - SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA",
  vat_number: "06256710879",
  fiscal_code: "06256710879",
  billing_address_street: "VIA 4 NOVEMBRE",
  billing_address_number: "64",
  billing_postal_code: "95031",
  billing_city: "ADRANO",
  billing_province: "CT",
  billing_country: "IT",
  billing_sdi_code: "KRRH6B9",
  billing_pec: null,
  is_default: false,
  notes: null,
  created_at: "2026-06-22",
  updated_at: "2026-06-22",
};

const draft = (
  billingProfile?: ClientBillingProfile | null,
): Pick<InvoiceDraftInput, "client" | "billingProfile"> => ({
  client,
  billingProfile,
});

describe("getInvoiceBillingRecipient", () => {
  it("uses the operational client as recipient when no billing profile is selected", () => {
    const recipient = getInvoiceBillingRecipient(draft(null));

    expect(recipient).toMatchObject({
      operationalClientId: "client-gs",
      profileId: null,
      label: "Cliente principale",
      name: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
      fiscal_code: "05416820875",
      billing_address_street: "Via Marino",
      billing_sdi_code: "KRRH6B9",
    });
    expect(formatInvoiceBillingRecipientAddress(recipient)).toBe(
      "Via Marino · 95031 Adrano CT · IT",
    );
    expect(getInvoiceBillingRecipientIdentityLines(recipient)).toEqual([
      "CF: 05416820875",
      "Codice destinatario: KRRH6B9",
    ]);
  });

  it("uses the selected billing profile as fiscal recipient while keeping the operational client id", () => {
    const recipient = getInvoiceBillingRecipient(draft(liveProfile));

    expect(recipient).toMatchObject({
      operationalClientId: "client-gs",
      profileId: "profile-live",
      label: "LIVE SRLS",
      name: "LIVE - SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA",
      vat_number: "06256710879",
      fiscal_code: "06256710879",
      billing_address_street: "VIA 4 NOVEMBRE",
      billing_address_number: "64",
      billing_postal_code: "95031",
      billing_city: "ADRANO",
      billing_province: "CT",
      billing_country: "IT",
      billing_sdi_code: "KRRH6B9",
      billing_pec: null,
    });
    expect(formatInvoiceBillingRecipientAddress(recipient)).toBe(
      "VIA 4 NOVEMBRE, 64 · 95031 ADRANO CT · IT",
    );
    expect(getInvoiceBillingRecipientIdentityLines(recipient)).toEqual([
      "P.IVA: 06256710879",
      "CF: 06256710879",
      "Codice destinatario: KRRH6B9",
    ]);
  });
});
