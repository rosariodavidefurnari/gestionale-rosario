import { describe, it, expect } from "vitest";

import { resolveSelectedYearContributiVersatiCassa } from "./selectedYearContributiVersatiCassa";
import type {
  FiscalDeclaration,
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";

const closedDeclaration2024: FiscalDeclaration = {
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

// Una dichiarazione DA PRESENTARE (totali zero) → NON depositata.
const openDeclaration2025: FiscalDeclaration = {
  ...closedDeclaration2024,
  id: "decl-2025",
  tax_year: 2025,
  total_substitute_tax: 0,
  total_inps: 0,
  prior_advances_substitute_tax: 0,
  prior_advances_inps: 0,
};

const obl = (id: string, component: string): FiscalObligation =>
  ({ id, component }) as unknown as FiscalObligation;

const line = (
  obligation_id: string,
  amount: number,
  submission_date: string,
): FiscalF24PaymentLineEnriched =>
  ({ obligation_id, amount, submission_date }) as FiscalF24PaymentLineEnriched;

describe("resolveSelectedYearContributiVersatiCassa", () => {
  it("returns the cash INPS sum when the year's declaration is DEPOSITED (closed)", () => {
    const result = resolveSelectedYearContributiVersatiCassa({
      year: 2024,
      declaration: closedDeclaration2024,
      obligations: [obl("o-inps", "inps_saldo"), obl("o-bollo", "bollo")],
      lines: [
        line("o-inps", 1879, "2024-06-30T08:00:00.000Z"),
        // bollo: escluso dalla somma INPS contributiva
        line("o-bollo", 2, "2024-06-30T08:00:00.000Z"),
      ],
    });
    expect(result).toBe(1879);
  });

  it("returns undefined for an OPEN year even when a bollo obligation is paid (DOM-4)", () => {
    // È il bug: oggi obligations.length>0 fa scattare una deduzione parziale.
    const result = resolveSelectedYearContributiVersatiCassa({
      year: 2025,
      declaration: openDeclaration2025,
      obligations: [obl("o-bollo", "bollo")],
      lines: [line("o-bollo", 2, "2025-05-31T08:00:00.000Z")],
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined when there is no declaration (current open year)", () => {
    expect(
      resolveSelectedYearContributiVersatiCassa({
        year: 2026,
        declaration: null,
        obligations: [obl("o-inps", "inps_acconto_1")],
        lines: [line("o-inps", 700, "2026-06-30T08:00:00.000Z")],
      }),
    ).toBeUndefined();
  });

  it("returns undefined when closed but obligations/lines are not loaded yet", () => {
    expect(
      resolveSelectedYearContributiVersatiCassa({
        year: 2024,
        declaration: closedDeclaration2024,
        obligations: undefined,
        lines: undefined,
      }),
    ).toBeUndefined();
  });

  it("returns undefined when year is null", () => {
    expect(
      resolveSelectedYearContributiVersatiCassa({
        year: undefined,
        declaration: closedDeclaration2024,
        obligations: [obl("o-inps", "inps_saldo")],
        lines: [line("o-inps", 1879, "2024-06-30T08:00:00.000Z")],
      }),
    ).toBeUndefined();
  });
});
