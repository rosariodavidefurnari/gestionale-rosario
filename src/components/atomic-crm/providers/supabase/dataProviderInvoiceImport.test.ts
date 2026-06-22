import { describe, expect, it, vi } from "vitest";

import { buildInvoiceImportProviderMethods } from "./dataProviderInvoiceImport";

describe("getInvoiceImportWorkspace provider method", () => {
  it("fetches billing profiles and includes them in the import workspace", async () => {
    const getList = vi.fn(async (resource: string) => {
      if (resource === "clients") {
        return {
          data: [
            {
              id: "client-gs",
              name: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
              email: null,
              billing_name: null,
              vat_number: null,
              fiscal_code: "05416820875",
              billing_city: "Adrano",
            },
          ],
        };
      }
      if (resource === "client_billing_profiles") {
        return {
          data: [
            {
              id: "profile-live",
              client_id: "client-gs",
              label: "LIVE SRLS",
              billing_name:
                "LIVE - SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA",
              vat_number: "06256710879",
              fiscal_code: "06256710879",
            },
          ],
        };
      }
      return { data: [] };
    });

    const { getInvoiceImportWorkspace } = buildInvoiceImportProviderMethods({
      baseDataProvider: { getList } as any,
      invokeEdgeFunction: vi.fn(),
      getConfiguredInvoiceExtractionModel: vi.fn(),
    });

    const workspace = await getInvoiceImportWorkspace();

    expect(getList).toHaveBeenCalledWith(
      "client_billing_profiles",
      expect.objectContaining({
        sort: { field: "label", order: "ASC" },
      }),
    );
    expect(workspace.billingProfiles).toEqual([
      {
        id: "profile-live",
        client_id: "client-gs",
        label: "LIVE SRLS",
        billing_name: "LIVE - SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA",
        vat_number: "06256710879",
        fiscal_code: "06256710879",
      },
    ]);
  });
});
