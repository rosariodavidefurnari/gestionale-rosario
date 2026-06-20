import { describe, expect, it } from "vitest";

import {
  sumInpsContributionsPaidInYear,
  type FiscalObligationComponentRow,
  type FiscalF24PaymentLineCashRow,
} from "./inpsContributionsPaid.ts";

// Deno mirror of the client src/.../inpsContributionsPaid.ts (LM035). Parità di
// semantica: allowlist INPS contributiva, esclude interessi rateazione (DB-7),
// filtro per anno della `submission_date` (cassa), non per `payment_year`.

const obligations: FiscalObligationComponentRow[] = [
  { id: "o-inps-saldo", component: "inps_saldo" },
  { id: "o-inps-acc1", component: "inps_acconto_1" },
  { id: "o-inps-acc2", component: "inps_acconto_2" },
  { id: "o-interessi", component: "interessi_inps" },
  { id: "o-imposta", component: "imposta_saldo" },
];

describe("sumInpsContributionsPaidInYear (Deno mirror)", () => {
  it("sums only INPS-contributive components paid (submission_date) in the year", () => {
    const lines: FiscalF24PaymentLineCashRow[] = [
      {
        obligation_id: "o-inps-saldo",
        amount: 1000,
        submission_date: "2025-06-30T08:00:00.000Z",
      },
      {
        obligation_id: "o-inps-acc1",
        amount: 503.09,
        submission_date: "2025-06-30T08:00:00.000Z",
      },
      // interessi rateazione INPS: NON contributo deducibile (DB-7) → escluso
      {
        obligation_id: "o-interessi",
        amount: 50,
        submission_date: "2025-06-30T08:00:00.000Z",
      },
      // imposta sostitutiva: non è INPS → escluso
      {
        obligation_id: "o-imposta",
        amount: 233,
        submission_date: "2025-06-30T08:00:00.000Z",
      },
      // INPS contributivo ma versato in un altro anno → escluso (cassa)
      {
        obligation_id: "o-inps-saldo",
        amount: 999,
        submission_date: "2024-12-15T08:00:00.000Z",
      },
    ];

    // 1000 + 503.09 = 1503.09 (= acconti+saldo INPS reali versati nel 2025)
    expect(sumInpsContributionsPaidInYear(lines, obligations, 2025)).toBe(
      1503.09,
    );
  });

  it("returns 0 when no INPS-contributive line is paid in the year", () => {
    const lines: FiscalF24PaymentLineCashRow[] = [
      {
        obligation_id: "o-imposta",
        amount: 233,
        submission_date: "2025-06-30T08:00:00.000Z",
      },
    ];
    expect(sumInpsContributionsPaidInYear(lines, obligations, 2025)).toBe(0);
  });

  it("ignores lines whose obligation is unknown", () => {
    const lines: FiscalF24PaymentLineCashRow[] = [
      {
        obligation_id: "o-missing",
        amount: 1000,
        submission_date: "2025-06-30T08:00:00.000Z",
      },
    ];
    expect(sumInpsContributionsPaidInYear(lines, obligations, 2025)).toBe(0);
  });
});
