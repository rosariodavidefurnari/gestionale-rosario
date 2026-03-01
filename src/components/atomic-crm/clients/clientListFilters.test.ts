import { describe, expect, it } from "vitest";

import {
  getClientTextFilterValue,
  patchClientTextFilter,
} from "./clientListFilters";

describe("clientListFilters", () => {
  it("builds and clears ilike filters for client list fields", () => {
    expect(
      patchClientTextFilter({
        filterValues: {},
        field: "vat_number",
        value: " IT12345678901 ",
      }),
    ).toEqual({
      "vat_number@ilike": "%IT12345678901%",
    });

    expect(
      patchClientTextFilter({
        filterValues: {
          "billing_city@ilike": "%Catania%",
        },
        field: "billing_city",
        value: "   ",
      }),
    ).toEqual({});

    expect(
      patchClientTextFilter({
        filterValues: {},
        field: "billing_pec",
        value: " pec@cliente.it ",
      }),
    ).toEqual({
      "billing_pec@ilike": "%pec@cliente.it%",
    });
  });

  it("reads current filter input values without wildcard markers", () => {
    expect(
      getClientTextFilterValue(
        {
          "billing_name@ilike": "%LAURUS S.R.L.%",
        },
        "billing_name",
      ),
    ).toBe("LAURUS S.R.L.");
  });
});
