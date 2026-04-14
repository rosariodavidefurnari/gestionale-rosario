import { describe, it, expect } from "vitest";

import { computeTaxSchedule } from "./computeTaxSchedule";
import type { Payment } from "../types";
import type {
  FiscalDeclaration,
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";

// ── Fixtures based on the real Rosario Furnari 2024-2026 fiscal dataset ─────

const makePayment = (
  overrides: Partial<Payment> & { payment_date: string; amount: number },
): Payment => ({
  id: crypto.randomUUID(),
  payment_date: overrides.payment_date,
  payment_type: "saldo",
  amount: overrides.amount,
  status: "ricevuto",
  ...overrides,
});

const makeDeclaration = (
  overrides: Partial<FiscalDeclaration> & { tax_year: number },
): FiscalDeclaration => ({
  id: crypto.randomUUID(),
  tax_year: overrides.tax_year,
  total_substitute_tax: 0,
  total_inps: 0,
  prior_advances_substitute_tax: 0,
  prior_advances_inps: 0,
  notes: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  user_id: "user-1",
  ...overrides,
});

const makeObligation = (
  overrides: Partial<FiscalObligation> & {
    component: FiscalObligation["component"];
    competence_year: number;
    payment_year: number;
    due_date: string;
    amount: number;
  },
): FiscalObligation => ({
  id: crypto.randomUUID(),
  declaration_id: null,
  source: "manual",
  installment_number: null,
  installment_total: null,
  is_overridden: false,
  overridden_at: null,
  notes: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  user_id: "user-1",
  ...overrides,
});

// ── Real 2024 declaration from Rosario's accountant (AdE quietanze) ─────────
//   Fatturato 2024: 13.740,18 €
//   Sostitutiva: 233 €, INPS: 3.667,40 €
//   → Aliquota effettiva 2024: 28,39% (3900,40 / 13740,18)
const realDeclaration2024 = makeDeclaration({
  tax_year: 2024,
  total_substitute_tax: 233,
  total_inps: 3667.4,
  prior_advances_substitute_tax: 429,
  prior_advances_inps: 1788.4,
});

// ── Projected 2025 declaration (computed from effective rate scaling) ──────
//   Fatturato 2025: 24.954,35 €
//   Total projected: 24.954,35 × 28,39% = 7.084,48 €
//   Sost: 423,17 (5,97%) + INPS: 6.661,31 (94,03%)
const projectedDeclaration2025 = makeDeclaration({
  tax_year: 2025,
  total_substitute_tax: 423.17,
  total_inps: 6661.31,
  prior_advances_substitute_tax: 233,
  prior_advances_inps: 1503.09,
});

// ── Real payments 2024 and 2025 (aggregate totals, single row each) ─────────
const payments2024 = [
  makePayment({ payment_date: "2024-06-15", amount: 13740.18 }),
];

const payments2025 = [
  makePayment({ payment_date: "2025-06-15", amount: 24954.35 }),
];

const payments2026Ytd = [
  makePayment({ payment_date: "2026-02-10", amount: 4487.2 }),
];

// ── Future 2026 obligations (saldi 2025 + acconti 2026) ─────────────────────
const futureObligations2026: FiscalObligation[] = [
  makeObligation({
    component: "imposta_saldo",
    competence_year: 2025,
    payment_year: 2026,
    due_date: "2026-06-30",
    amount: 190.17,
  }),
  makeObligation({
    component: "inps_saldo",
    competence_year: 2025,
    payment_year: 2026,
    due_date: "2026-06-30",
    amount: 5158.22,
  }),
  makeObligation({
    component: "imposta_acconto_1",
    competence_year: 2026,
    payment_year: 2026,
    due_date: "2026-06-30",
    amount: 211.59,
  }),
  makeObligation({
    component: "inps_acconto_1",
    competence_year: 2026,
    payment_year: 2026,
    due_date: "2026-06-30",
    amount: 2664.52,
  }),
  makeObligation({
    component: "imposta_acconto_2",
    competence_year: 2026,
    payment_year: 2026,
    due_date: "2026-11-30",
    amount: 211.58,
  }),
  makeObligation({
    component: "inps_acconto_2",
    competence_year: 2026,
    payment_year: 2026,
    due_date: "2026-11-30",
    amount: 2664.52,
  }),
];

const todayApril2026 = "2026-04-15";

// ── Tests ───────────────────────────────────────────────────────────────────

describe("computeTaxSchedule — real Rosario 2024/2025 dataset", () => {
  it("picks the most recent closed-year declaration with non-zero totals", () => {
    // With both 2024 (real) and 2025 (projected) present, the most recent
    // non-zero declaration wins. Both are valid baselines — picking the most
    // recent keeps the system reactive when the accountant hands over a
    // newer year.
    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024, projectedDeclaration2025],
      obligations: futureObligations2026,
      payments: [...payments2024, ...payments2025, ...payments2026Ytd],
      paymentLines: [],
      todayIso: todayApril2026,
    });

    expect(schedule.baseline).not.toBeNull();
    expect(schedule.baseline!.taxYear).toBe(2025);
    expect(schedule.baseline!.totalRevenue).toBe(24954.35);
    // Total projected 2025 = 423,17 + 6661,31 = 7084,48
    expect(schedule.baseline!.totalTaxes).toBe(7084.48);
  });

  it("falls back to 2024 when only the real 2024 declaration is present", () => {
    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024],
      obligations: [],
      payments: [...payments2024, ...payments2025, ...payments2026Ytd],
      paymentLines: [],
      todayIso: todayApril2026,
    });

    expect(schedule.baseline!.taxYear).toBe(2024);
    expect(schedule.baseline!.totalRevenue).toBe(13740.18);
    expect(schedule.baseline!.totalTaxes).toBe(3900.4);
  });

  it("computes the real effective rate 28,39% from the 2024 data", () => {
    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024],
      obligations: [],
      payments: payments2024,
      paymentLines: [],
      todayIso: todayApril2026,
    });

    // 3900,40 / 13740,18 = 0,28387... ≈ 28,39%
    expect(schedule.baseline!.effectiveRate).toBeCloseTo(0.2839, 4);
  });

  it("applies the 28,39% rate to YTD 2026 revenue to estimate matured taxes", () => {
    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024],
      obligations: [],
      payments: [...payments2024, ...payments2026Ytd],
      paymentLines: [],
      todayIso: todayApril2026,
    });

    // 4487,20 × (3900,40 / 13740,18) = 4487,20 × 0,28387... ≈ 1273,77
    expect(schedule.ytd).not.toBeNull();
    expect(schedule.ytd!.year).toBe(2026);
    expect(schedule.ytd!.revenueYtd).toBe(4487.2);
    expect(schedule.ytd!.taxesMatured).toBeCloseTo(1273.77, 1);
  });

  it("returns the two upcoming 2026 deadlines with correct totals", () => {
    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024, projectedDeclaration2025],
      obligations: futureObligations2026,
      payments: [...payments2024, ...payments2025, ...payments2026Ytd],
      paymentLines: [],
      todayIso: todayApril2026,
    });

    expect(schedule.upcomingDeadlines).toHaveLength(2);

    const giugno = schedule.upcomingDeadlines[0];
    expect(giugno.date).toBe("2026-06-30");
    expect(giugno.label).toBe("Saldo + 1° Acconto");
    expect(giugno.hasSaldo).toBe(true);
    // 190,17 + 5158,22 + 211,59 + 2664,52 = 8224,50
    expect(giugno.totalAmount).toBe(8224.5);
    expect(giugno.items).toHaveLength(4);

    const novembre = schedule.upcomingDeadlines[1];
    expect(novembre.date).toBe("2026-11-30");
    expect(novembre.label).toBe("Acconto");
    expect(novembre.hasSaldo).toBe(false);
    // 211,58 + 2664,52 = 2876,10
    expect(novembre.totalAmount).toBe(2876.1);
    expect(novembre.items).toHaveLength(2);
  });

  it("totals the 2026 cash out to ~11.100 € (saldo 5.348 + acconti 5.752)", () => {
    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024, projectedDeclaration2025],
      obligations: futureObligations2026,
      payments: [...payments2024, ...payments2025, ...payments2026Ytd],
      paymentLines: [],
      todayIso: todayApril2026,
    });

    // 8224,50 + 2876,10 = 11100,60
    expect(schedule.totalCashOutYear).toBe(11100.6);

    // Saldo part = 190,17 + 5158,22 = 5348,39
    expect(schedule.totalSaldoPortion).toBe(5348.39);

    // Anticipo part = 211,59 + 2664,52 + 211,58 + 2664,52 = 5752,21
    expect(schedule.totalAnticipoPortion).toBe(5752.21);

    // Check they sum back to the grand total
    expect(
      schedule.totalSaldoPortion + schedule.totalAnticipoPortion,
    ).toBeCloseTo(schedule.totalCashOutYear, 2);
  });

  it("returns null baseline when no real prior declaration exists", () => {
    const schedule = computeTaxSchedule({
      declarations: [],
      obligations: [],
      payments: payments2026Ytd,
      paymentLines: [],
      todayIso: todayApril2026,
    });

    expect(schedule.baseline).toBeNull();
    expect(schedule.ytd).toBeNull();
  });

  it("skips placeholder declarations with zero totals", () => {
    const zeroDecl2025 = makeDeclaration({
      tax_year: 2025,
      total_substitute_tax: 0,
      total_inps: 0,
    });

    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024, zeroDecl2025],
      obligations: [],
      payments: [...payments2024, ...payments2025],
      paymentLines: [],
      todayIso: todayApril2026,
    });

    // Should fall back to 2024 even though 2025 exists (as a zero row)
    expect(schedule.baseline!.taxYear).toBe(2024);
  });

  it("does not consider bollo and dichiarazione as high-priority deadlines", () => {
    const bolloObligation = makeObligation({
      component: "bollo",
      competence_year: 2026,
      payment_year: 2026,
      due_date: "2026-05-31",
      amount: 20,
    });

    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024],
      obligations: [...futureObligations2026, bolloObligation],
      payments: [...payments2024, ...payments2025, ...payments2026Ytd],
      paymentLines: [],
      todayIso: todayApril2026,
    });

    // Still only the two tax deadlines, not the bollo
    expect(schedule.upcomingDeadlines).toHaveLength(2);
    expect(
      schedule.upcomingDeadlines.every((d) =>
        d.items.every((i) => i.component !== "bollo"),
      ),
    ).toBe(true);
  });

  it("deducts F24 already paid from the remaining amount of an obligation", () => {
    const saldoSost = futureObligations2026.find(
      (o) => o.component === "imposta_saldo",
    )!;

    const paymentLines: FiscalF24PaymentLineEnriched[] = [
      {
        id: "pl1",
        submission_id: "sub1",
        obligation_id: saldoSost.id,
        amount: 100,
        created_at: "2026-06-30T10:00:00Z",
        user_id: "user-1",
        submission_date: "2026-06-30",
      },
    ];

    const schedule = computeTaxSchedule({
      declarations: [realDeclaration2024, projectedDeclaration2025],
      obligations: futureObligations2026,
      payments: [...payments2024, ...payments2025],
      paymentLines,
      todayIso: todayApril2026,
    });

    const giugno = schedule.upcomingDeadlines[0];
    const saldoItem = giugno.items.find(
      (i) => i.component === "imposta_saldo",
    )!;
    // 190,17 - 100 = 90,17
    expect(saldoItem.amount).toBe(90.17);
  });
});
