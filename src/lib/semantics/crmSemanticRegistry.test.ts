import { describe, expect, it } from "vitest";

import { buildCrmSemanticRegistry, calculateKmReimbursement, calculateTaxableServiceNetValue, getDefaultKmRate } from "./crmSemanticRegistry";

describe("crmSemanticRegistry", () => {
  it("builds a registry with dynamic service and quote semantics from configuration", () => {
    const registry = buildCrmSemanticRegistry({
      operationalConfig: { defaultKmRate: 0.42 },
      serviceTypeChoices: [
        {
          value: "riprese",
          label: "Riprese",
          description: "Produzione sul campo",
        },
      ],
      quoteServiceTypes: [
        {
          value: "wedding",
          label: "Wedding",
          description: "Pacchetto matrimonio",
        },
      ],
    });

    expect(registry.dictionaries.serviceTypes).toEqual([
      {
        value: "riprese",
        label: "Riprese",
        description: "Produzione sul campo",
        origin: "configuration",
      },
    ]);
    expect(registry.dictionaries.quoteServiceTypes).toEqual([
      {
        value: "wedding",
        label: "Wedding",
        description: "Pacchetto matrimonio",
        origin: "configuration",
      },
    ]);
    expect(registry.rules.travelReimbursement.defaultKmRate).toBe(0.42);
    expect(
      registry.dictionaries.paymentMethods.some(
        (item) => item.value === "bonifico" && item.label === "Bonifico",
      ),
    ).toBe(true);
  });

  it("uses km and taxable helpers consistently", () => {
    expect(getDefaultKmRate()).toBe(0.19);
    expect(
      calculateKmReimbursement({
        kmDistance: 100,
        kmRate: null,
        defaultKmRate: 0.3,
      }),
    ).toBe(30);
    expect(
      calculateTaxableServiceNetValue({
        fee_shooting: 200,
        fee_editing: 100,
        fee_other: 50,
        discount: 25,
        is_taxable: true,
      }),
    ).toBe(325);
    expect(
      calculateTaxableServiceNetValue({
        fee_shooting: 200,
        fee_editing: 100,
        fee_other: 50,
        discount: 25,
        is_taxable: false,
      }),
    ).toBe(0);
  });
});
