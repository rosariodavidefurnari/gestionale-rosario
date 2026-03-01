import { describe, expect, it } from "vitest";

import {
  buildClientCreatePathFromInvoiceDraft,
  getClientCreateDefaultsFromSearch,
  getClientCreateLauncherContextFromSearch,
} from "./clientLinking";

describe("clientLinking", () => {
  it("builds a prefilled create path from an invoice draft", () => {
    const href = buildClientCreatePathFromInvoiceDraft({
      record: {
        counterpartyName: "LAURUS",
        billingName: "LAURUS S.R.L.",
        vatNumber: "12345678901",
        fiscalCode: "12345678901",
        billingAddressStreet: "Via Roma",
        billingAddressNumber: "12",
        billingPostalCode: "95100",
        billingCity: "Catania",
        billingProvince: "CT",
        billingCountry: "IT",
        billingSdiCode: "M5UXCR1",
        billingPec: "amministrazione@example.com",
      },
    });

    expect(href).toContain("/clients/create?");
    expect(href).toContain("name=LAURUS+S.R.L.");
    expect(href).toContain("billing_name=LAURUS+S.R.L.");
    expect(href).toContain("vat_number=12345678901");
    expect(href).toContain(
      "notes=Referente+operativo+indicato+nel+documento%3A+LAURUS",
    );
    expect(href).toContain("launcher_source=invoice_import");
  });

  it("parses prefilled defaults and launcher context from search params", () => {
    const search =
      "?name=LAURUS+S.R.L.&billing_name=LAURUS+S.R.L.&vat_number=12345678901&notes=Referente+operativo+indicato+nel+documento%3A+LAURUS&launcher_source=invoice_import&launcher_action=client_create_from_invoice";

    expect(getClientCreateDefaultsFromSearch(search)).toMatchObject({
      name: "LAURUS S.R.L.",
      billing_name: "LAURUS S.R.L.",
      vat_number: "12345678901",
      notes: "Referente operativo indicato nel documento: LAURUS",
    });
    expect(getClientCreateLauncherContextFromSearch(search)).toEqual({
      source: "invoice_import",
      action: "client_create_from_invoice",
    });
  });

  it("keeps the counterparty name when no fiscal denomination is available", () => {
    const href = buildClientCreatePathFromInvoiceDraft({
      record: {
        counterpartyName: "Diego Caltabiano",
        billingName: null,
        vatNumber: null,
        fiscalCode: null,
        billingAddressStreet: null,
        billingAddressNumber: null,
        billingPostalCode: null,
        billingCity: null,
        billingProvince: null,
        billingCountry: null,
        billingSdiCode: null,
        billingPec: null,
      },
    });

    expect(href).toContain("name=Diego+Caltabiano");
    expect(href).not.toContain("notes=");
  });
});
