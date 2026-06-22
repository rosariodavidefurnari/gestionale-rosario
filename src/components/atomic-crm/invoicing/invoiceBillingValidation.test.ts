import { describe, it, expect } from "vitest";

import type { BusinessProfile, Client, ClientBillingProfile } from "../types";
import { isInvoiceBillingComplete } from "./invoiceBillingValidation";

const completeIssuer = (): BusinessProfile => ({
  name: "Rosario Furnari",
  tagline: "",
  vatNumber: "01309870861",
  fiscalCode: "FRNRRO...",
  sdiCode: "",
  iban: "",
  bankName: "",
  bic: "",
  address: "",
  addressStreet: "Via Calabria",
  addressNumber: "1",
  addressPostalCode: "95024",
  addressCity: "Acireale",
  addressProvince: "CT",
  addressCountry: "IT",
  email: "",
  phone: "",
  beneficiaryName: "",
});

const completeClient = (): Client =>
  ({
    id: "c1",
    name: "Gustare Sicilia",
    vat_number: "05928320820",
    billing_address_street: "Via Etnea 100",
    billing_postal_code: "95100",
    billing_city: "Catania",
  }) as unknown as Client;

const completeLiveProfile = (): ClientBillingProfile => ({
  id: "profile-live",
  client_id: "c1",
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
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
});

describe("isInvoiceBillingComplete", () => {
  it("ok when issuer and client carry every mandatory XML field", () => {
    const r = isInvoiceBillingComplete({
      client: completeClient(),
      issuer: completeIssuer(),
    });
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("accepts client with fiscal_code instead of vat_number", () => {
    const client = {
      ...completeClient(),
      vat_number: undefined,
      fiscal_code: "RSSMRA...",
    } as unknown as Client;
    expect(
      isInvoiceBillingComplete({ client, issuer: completeIssuer() }).ok,
    ).toBe(true);
  });

  it("accepts client with billing_name instead of name", () => {
    const client = {
      ...completeClient(),
      name: "",
      billing_name: "Gustare Srl",
    } as unknown as Client;
    expect(
      isInvoiceBillingComplete({ client, issuer: completeIssuer() }).ok,
    ).toBe(true);
  });

  it("flags missing issuer P.IVA", () => {
    const issuer = { ...completeIssuer(), vatNumber: "" };
    const r = isInvoiceBillingComplete({ client: completeClient(), issuer });
    expect(r.ok).toBe(false);
    expect(r.missing.join(" ")).toMatch(/P\.IVA emittente/i);
  });

  it("flags client without any fiscal identity", () => {
    const client = {
      ...completeClient(),
      vat_number: undefined,
      fiscal_code: undefined,
    } as unknown as Client;
    const r = isInvoiceBillingComplete({ client, issuer: completeIssuer() });
    expect(r.ok).toBe(false);
    expect(r.missing.join(" ")).toMatch(/P\.IVA o codice fiscale cliente/i);
  });

  it("flags incomplete client billing address", () => {
    const client = {
      ...completeClient(),
      billing_city: undefined,
    } as unknown as Client;
    const r = isInvoiceBillingComplete({ client, issuer: completeIssuer() });
    expect(r.ok).toBe(false);
    expect(r.missing.join(" ")).toMatch(/indirizzo cliente/i);
  });

  it("uses the selected billing profile when the operational client is fiscally incomplete", () => {
    const operationalClient = {
      ...completeClient(),
      vat_number: undefined,
      fiscal_code: undefined,
      billing_address_street: undefined,
      billing_postal_code: undefined,
      billing_city: undefined,
    } as unknown as Client;

    const r = isInvoiceBillingComplete({
      client: operationalClient,
      billingProfile: completeLiveProfile(),
      issuer: completeIssuer(),
    });

    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });
});
