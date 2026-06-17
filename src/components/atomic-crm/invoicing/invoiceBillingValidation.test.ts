import { describe, it, expect } from "vitest";

import type { BusinessProfile, Client } from "../types";
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
});
