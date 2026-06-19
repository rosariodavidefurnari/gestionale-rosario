import { describe, it, expect } from "vitest";

import { resolvePriorAdvanceScheduleInput } from "./resolvePriorAdvanceScheduleInput";
import type { FiscalEstimateScheduleInput } from "./fiscalDeadlines";
import type { FiscalDeclaration } from "./fiscalRealityTypes";

// The drift-prone FORMULA estimate the old code used (2024 over-estimated from cassa).
const formulaEstimate2024: FiscalEstimateScheduleInput = {
  taxYear: 2024,
  annualInpsEstimate: 2793.97,
  annualSubstituteTaxEstimate: 396.17,
};

// The REAL 2024 declaration (AdE, prod): total_inps 3667.40 = cycle (acconti 1788.40
// + saldo 1879); competence = 3667.40 − 1788.40 = 1879. imposta = 233.
const realDeclaration2024: FiscalDeclaration = {
  id: "decl-2024",
  tax_year: 2024,
  total_substitute_tax: 233,
  total_inps: 3667.4,
  prior_advances_substitute_tax: 429,
  prior_advances_inps: 1788.4,
  notes: null,
  created_at: "2026-04-02T00:00:00Z",
  updated_at: "2026-04-02T00:00:00Z",
  user_id: "user-1",
};

describe("resolvePriorAdvanceScheduleInput", () => {
  it("derives the advance basis from the CLOSED real declaration (competence), not the formula estimate", () => {
    const resolved = resolvePriorAdvanceScheduleInput(
      formulaEstimate2024,
      realDeclaration2024,
    );
    // INPS competence = total_inps − prior_advances_inps = 3667.40 − 1788.40 = 1879
    expect(resolved.annualInpsEstimate).toBe(1879);
    // imposta = total_substitute_tax = 233
    expect(resolved.annualSubstituteTaxEstimate).toBe(233);
    expect(resolved.taxYear).toBe(2024);
    // It must NOT be the over-estimated formula value (the 2026 saldo bug).
    expect(resolved.annualInpsEstimate).not.toBe(2793.97);
  });

  it("falls back to the formula estimate when there is no prior declaration", () => {
    expect(resolvePriorAdvanceScheduleInput(formulaEstimate2024, null)).toEqual(
      formulaEstimate2024,
    );
    expect(
      resolvePriorAdvanceScheduleInput(formulaEstimate2024, undefined),
    ).toEqual(formulaEstimate2024);
  });

  it("falls back when the declaration is UNFILED (zero totals, e.g. 2025 DA PRESENTARE)", () => {
    const unfiled: FiscalDeclaration = {
      ...realDeclaration2024,
      tax_year: 2025,
      total_substitute_tax: 0,
      total_inps: 0,
    };
    expect(
      resolvePriorAdvanceScheduleInput(formulaEstimate2024, unfiled),
    ).toEqual(formulaEstimate2024);
  });
});
