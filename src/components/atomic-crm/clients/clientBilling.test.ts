import { describe, expect, it } from "vitest";

import {
  formatClientBillingAddress,
  getClientBillingDisplayName,
  getClientBillingIdentityLines,
  getClientDistinctBillingName,
  getClientInvoiceWorkspaceLabel,
  normalizeClientForSave,
} from "./clientBilling";

describe("clientBilling", () => {
  it("formats structured billing details", () => {
    expect(
      formatClientBillingAddress({
        billing_address_street: "Via Roma",
        billing_address_number: "12",
        billing_postal_code: "95100",
        billing_city: "Catania",
        billing_province: "CT",
        billing_country: "IT",
      }),
    ).toBe("Via Roma, 12 · 95100 Catania CT · IT");
  });

  it("builds consistent display labels and workspace labels", () => {
    expect(
      getClientBillingDisplayName({
        name: "Laurus",
        billing_name: "LAURUS S.R.L.",
      }),
    ).toBe("LAURUS S.R.L.");

    expect(
      getClientBillingDisplayName({
        name: "Laurus",
      }),
    ).toBe("Laurus");

    expect(
      getClientInvoiceWorkspaceLabel({
        name: "Laurus",
        billing_name: "LAURUS S.R.L.",
        vat_number: "12345678901",
        fiscal_code: "12345678901",
        email: "info@example.com",
      }),
    ).toContain("P.IVA 12345678901");
  });

  it("keeps a distinct fiscal name only when it differs from the main name", () => {
    expect(
      getClientDistinctBillingName({
        name: "Rosario Furnari",
        billing_name: "Rosario Furnari",
      }),
    ).toBeNull();

    expect(
      getClientDistinctBillingName({
        name: "Rosario Furnari",
        billing_name: "Rosario Furnari SRL",
      }),
    ).toBe("Rosario Furnari SRL");
  });

  it("normalizes client billing fields and strips duplicate legacy tax id", () => {
    expect(
      normalizeClientForSave({
        name: "  Mario Rossi  ",
        billing_name: " Mario Rossi ",
        vat_number: " 123 456 78901 ",
        fiscal_code: " mrarss80a01f205x ",
        billing_sdi_code: " ab c1234 ",
        billing_pec: " INFO@EXAMPLE.IT ",
        tax_id: "12345678901",
      }),
    ).toEqual(
      expect.objectContaining({
        name: "Mario Rossi",
        billing_name: null,
        vat_number: "12345678901",
        fiscal_code: "MRARSS80A01F205X",
        billing_sdi_code: "ABC1234",
        billing_pec: "info@example.it",
        tax_id: null,
      }),
    );
  });

  it("does not expose legacy tax id in billing identity lines", () => {
    expect(
      getClientBillingIdentityLines({
        name: "Cliente Legacy",
      }),
    ).toEqual([]);

    expect(
      getClientBillingIdentityLines({
        vat_number: "12345678901",
        fiscal_code: "ABCDEF12G34H567I",
      }),
    ).toEqual(["P.IVA: 12345678901", "CF: ABCDEF12G34H567I"]);
  });
});
