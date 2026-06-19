import { describe, expect, it } from "vitest";

import { sumInpsContributionsPaidInYear } from "./inpsContributionsPaid";
import { computeForfettarioTax, roundFiscalToEuro } from "./fiscalFormula";
import type {
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";

const makeObligation = (
  partial: Partial<FiscalObligation> &
    Pick<FiscalObligation, "id" | "component">,
): FiscalObligation => ({
  declaration_id: null,
  source: "manual",
  competence_year: 2024,
  payment_year: 2024,
  due_date: "2024-06-30",
  amount: 0,
  installment_number: null,
  installment_total: null,
  is_overridden: false,
  overridden_at: null,
  notes: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  user_id: "u1",
  ...partial,
});

const makeLine = (
  partial: Partial<FiscalF24PaymentLineEnriched> &
    Pick<
      FiscalF24PaymentLineEnriched,
      "obligation_id" | "amount" | "submission_date"
    >,
): FiscalF24PaymentLineEnriched => ({
  id: `line-${partial.obligation_id}-${partial.submission_date}`,
  submission_id: "sub-1",
  created_at: "2024-01-01T00:00:00Z",
  user_id: "u1",
  ...partial,
});

describe("sumInpsContributionsPaidInYear — oracolo LM035 2024 = 2.538", () => {
  // Obbligazioni: saldo INPS 2023 (pagato 2024) + 2 acconti INPS 2024 (pagati 2024)
  // + interessi rateazione INPS (NON deducibili) + un'imposta (non INPS).
  const obligations: FiscalObligation[] = [
    makeObligation({
      id: "o-saldo23",
      component: "inps_saldo",
      competence_year: 2023,
    }),
    makeObligation({ id: "o-acc1", component: "inps_acconto_1" }),
    makeObligation({ id: "o-acc2", component: "inps_acconto_2" }),
    makeObligation({ id: "o-int", component: "interessi_inps" }),
    makeObligation({ id: "o-imposta", component: "imposta_saldo" }),
  ];

  it("somma SOLO i contributi INPS versati per cassa nel 2024 -> 2.538", () => {
    const lines: FiscalF24PaymentLineEnriched[] = [
      // contributi INPS versati nel 2024 (cassa): 2.249 + 144,50 + 144,50 = 2.538
      makeLine({
        obligation_id: "o-saldo23",
        amount: 2249,
        submission_date: "2024-07-20",
      }),
      makeLine({
        obligation_id: "o-acc1",
        amount: 144.5,
        submission_date: "2024-07-20",
      }),
      makeLine({
        obligation_id: "o-acc2",
        amount: 144.5,
        submission_date: "2024-11-30",
      }),
      // ESCLUSI:
      makeLine({
        obligation_id: "o-int",
        amount: 50,
        submission_date: "2024-08-01",
      }), // interessi
      makeLine({
        obligation_id: "o-imposta",
        amount: 233,
        submission_date: "2024-07-20",
      }), // imposta, non INPS
      makeLine({
        obligation_id: "o-acc1",
        amount: 999,
        submission_date: "2025-01-10",
      }), // versato nel 2025
    ];

    expect(sumInpsContributionsPaidInYear(lines, obligations, 2024)).toBe(2538);
  });

  it("interessi_inps esclusi (DB-7: non sono contributi deducibili)", () => {
    const lines = [
      makeLine({
        obligation_id: "o-int",
        amount: 500,
        submission_date: "2024-06-15",
      }),
    ];
    expect(sumInpsContributionsPaidInYear(lines, obligations, 2024)).toBe(0);
  });

  it("cassa: una riga versata l'anno dopo (submission 2025) non conta nel 2024", () => {
    const lines = [
      makeLine({
        obligation_id: "o-saldo23",
        amount: 2249,
        submission_date: "2025-01-05",
      }),
    ];
    expect(sumInpsContributionsPaidInYear(lines, obligations, 2024)).toBe(0);
  });

  it("2023 senza F24 INPS versati -> 0 (LM035 2023 = 0)", () => {
    expect(sumInpsContributionsPaidInYear([], obligations, 2023)).toBe(0);
  });

  // Giunto end-to-end (vero bug #3): la derivazione dei contributi versati alimenta
  // la formula. Senza il legame, formula e derivazione potrebbero sbagliare insieme.
  it("derivazione F24 (2.538) -> formula 2024 -> imposta 233 + INPS 1.879", () => {
    const lines: FiscalF24PaymentLineEnriched[] = [
      makeLine({
        obligation_id: "o-saldo23",
        amount: 2249,
        submission_date: "2024-07-20",
      }),
      makeLine({
        obligation_id: "o-acc1",
        amount: 144.5,
        submission_date: "2024-07-20",
      }),
      makeLine({
        obligation_id: "o-acc2",
        amount: 144.5,
        submission_date: "2024-11-30",
      }),
    ];
    const contributiVersatiCassa = sumInpsContributionsPaidInYear(
      lines,
      obligations,
      2024,
    );
    expect(contributiVersatiCassa).toBe(2538);

    const tax = computeForfettarioTax({
      redditoLordo: 7207,
      aliquotaGs: 26.07,
      contributiVersatiCassa,
      aliquotaSost: 5,
    });
    expect(roundFiscalToEuro(tax.inpsCompetenza)).toBe(1879);
    expect(roundFiscalToEuro(tax.impostaSostitutiva)).toBe(233);
  });
});
