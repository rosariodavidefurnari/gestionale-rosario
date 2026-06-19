import { describe, it, expect } from "vitest";

import {
  buildFiledDeclarationIds,
  buildPaidObligationIds,
  isCertifiedObligation,
  selectCertifiedObligations,
} from "./selectCertifiedObligations";
import type {
  FiscalDeclaration,
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";

const makeDeclaration = (
  overrides: Partial<FiscalDeclaration> & { id: string; tax_year: number },
): FiscalDeclaration => ({
  total_substitute_tax: 0,
  total_inps: 0,
  prior_advances_substitute_tax: 0,
  prior_advances_inps: 0,
  notes: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  user_id: "user-1",
  ...overrides,
});

const makeObligation = (
  overrides: Partial<FiscalObligation> & {
    id: string;
    component: FiscalObligation["component"];
  },
): FiscalObligation => ({
  declaration_id: null,
  source: "manual",
  competence_year: 2025,
  payment_year: 2026,
  due_date: "2026-06-30",
  amount: 100,
  installment_number: null,
  installment_total: null,
  is_overridden: false,
  overridden_at: null,
  notes: null,
  created_at: "2026-04-14T00:00:00Z",
  updated_at: "2026-04-14T00:00:00Z",
  user_id: "user-1",
  ...overrides,
});

const makePaymentLine = (
  obligation_id: string,
  amount = 100,
): FiscalF24PaymentLineEnriched => ({
  id: `pl-${obligation_id}`,
  submission_id: "sub-1",
  obligation_id,
  amount,
  created_at: "2026-06-30T00:00:00Z",
  user_id: "user-1",
  submission_date: "2026-06-30",
});

describe("buildFiledDeclarationIds", () => {
  it("keeps only declarations with non-zero totals", () => {
    const filed = makeDeclaration({
      id: "decl-2024",
      tax_year: 2024,
      total_substitute_tax: 233,
      total_inps: 3667.4,
    });
    const inpsOnly = makeDeclaration({
      id: "decl-2023",
      tax_year: 2023,
      total_substitute_tax: 0,
      total_inps: 2249,
    });
    const empty = makeDeclaration({
      id: "decl-2025",
      tax_year: 2025,
      total_substitute_tax: 0,
      total_inps: 0,
    });

    const ids = buildFiledDeclarationIds([filed, inpsOnly, empty]);

    expect(ids.has("decl-2024")).toBe(true);
    expect(ids.has("decl-2023")).toBe(true); // INPS-only still filed
    expect(ids.has("decl-2025")).toBe(false); // unfiled (totals = 0)
  });
});

describe("isCertifiedObligation", () => {
  const filedIds = new Set(["decl-2024"]);

  it("certifies an obligation backed by a filed declaration", () => {
    const ob = makeObligation({
      id: "real",
      component: "inps_saldo",
      declaration_id: "decl-2024",
    });
    expect(isCertifiedObligation(ob, filedIds, new Set())).toBe(true);
  });

  it("certifies an obligation that has F24 payment lines even if declaration is unfiled", () => {
    const ob = makeObligation({
      id: "paid",
      component: "bollo",
      declaration_id: null,
    });
    expect(isCertifiedObligation(ob, filedIds, new Set(["paid"]))).toBe(true);
  });

  it("does NOT certify a projection with null declaration and no payments", () => {
    const ob = makeObligation({
      id: "ghost-acconto",
      component: "inps_acconto_1",
      declaration_id: null,
    });
    expect(isCertifiedObligation(ob, filedIds, new Set())).toBe(false);
  });

  it("does NOT certify an obligation backed by an UNFILED (zero-totals) declaration", () => {
    const ob = makeObligation({
      id: "ghost-saldo",
      component: "inps_saldo",
      declaration_id: "decl-2025", // not in filedIds → unfiled
    });
    expect(isCertifiedObligation(ob, filedIds, new Set())).toBe(false);
  });
});

describe("selectCertifiedObligations", () => {
  it("drops the 2026 garbage projections and keeps the real bollo (regression: false 11.100 card)", () => {
    // Reproduces the prod state on 2026-06-19: 6 hand-entered projections
    // (aliquota-effettiva method, declaration null or zero-totals 2025) + 1 real
    // bollo with an F24 line.
    const declarations = [
      makeDeclaration({ id: "decl-2025", tax_year: 2025 }), // unfiled, totals 0
    ];
    const obligations: FiscalObligation[] = [
      makeObligation({
        id: "g-imposta-saldo",
        component: "imposta_saldo",
        amount: 190.17,
        declaration_id: "decl-2025",
      }),
      makeObligation({
        id: "g-inps-saldo",
        component: "inps_saldo",
        amount: 5158.22,
        declaration_id: "decl-2025",
      }),
      makeObligation({
        id: "g-imposta-acc1",
        component: "imposta_acconto_1",
        amount: 211.59,
        declaration_id: null,
      }),
      makeObligation({
        id: "g-inps-acc1",
        component: "inps_acconto_1",
        amount: 2664.52,
        declaration_id: null,
      }),
      makeObligation({
        id: "real-bollo",
        component: "bollo",
        amount: 12,
        declaration_id: null,
      }),
    ];
    const paymentLines = [makePaymentLine("real-bollo", 12)];

    const filedDeclarationIds = buildFiledDeclarationIds(declarations);
    const paidObligationIds = buildPaidObligationIds(paymentLines);
    const certified = selectCertifiedObligations(
      obligations,
      filedDeclarationIds,
      paidObligationIds,
    );

    expect(certified.map((o) => o.id)).toEqual(["real-bollo"]);
    // The 4 high-value projections that produced the false 11.100,60 are gone.
    const ghostTotal = obligations
      .filter((o) => o.id.startsWith("g-"))
      .reduce((s, o) => s + o.amount, 0);
    expect(ghostTotal).toBeGreaterThan(8000); // they WERE inflating the card
    expect(certified.some((o) => o.id.startsWith("g-"))).toBe(false);
  });
});
