import { describe, expect, it } from "vitest";

import {
  formatClientBillingAddress,
  getClientBillingDisplayName,
  getClientBillingIdentityLines,
  getClientInvoiceWorkspaceLabel,
} from "./clientBilling";

describe("clientBilling", () => {
  it("formats structured billing details with fallback to legacy fields", () => {
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

    expect(
      getClientBillingIdentityLines({
        vat_number: "12345678901",
        fiscal_code: "ABCDEF12G34H567I",
      }),
    ).toEqual([
      "P.IVA: 12345678901",
      "CF: ABCDEF12G34H567I",
    ]);

    expect(
      getClientBillingIdentityLines({
        tax_id: "12345678901",
      }),
    ).toEqual(["P.IVA / CF: 12345678901"]);
  });

  it("builds consistent display labels", () => {
    expect(
      getClientBillingDisplayName({
        name: "Laurus",
        billing_name: "LAURUS S.R.L.",
      }),
    ).toBe("LAURUS S.R.L.");

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
});
