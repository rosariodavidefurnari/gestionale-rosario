/**
 * Pure forfettario (regime forfettario, L.190/2014) tax formula.
 *
 * Validated to the euro against the real Agenzia delle Entrate declarations
 * (Quadro LM + Quadro RR):
 *   2023: redditoLordo 8.575, aliquotaGs 26,23%, contributiVersati 0,    sost 5%
 *         -> INPS 2.249, imposta 429
 *   2024: redditoLordo 7.207, aliquotaGs 26,07%, contributiVersati 2.538, sost 5%
 *         -> INPS 1.879, imposta 233
 *
 * THREE distinct INPS numbers exist and MUST NOT be conflated:
 *  - `inpsCompetenza`        : owed on the year's income (this output) =
 *                              redditoLordo * aliquotaGs. Maps to RR "contributo dovuto".
 *  - `contributiVersatiCassa`: INPS actually PAID in the year (input, LM035); it is
 *                              what deducts the substitute tax base (cash basis).
 *  - `total_inps` in `fiscal_declarations`: the reconciled cash-cycle total
 *                              (acconti + saldo); it is the accountant's real datum and
 *                              is NEVER recomputed or overwritten here.
 *
 * AdE rounds fiscal results to whole euro. Use `roundFiscalToEuro` for declaration
 * parity; raw full-precision values are returned for downstream aggregation.
 */

export type ForfettarioTaxInput = {
  /** componenti positivi * coefficiente redditivita (es. 9240 * 78% = 7207) */
  redditoLordo: number;
  /** aliquota INPS Gestione Separata dell'anno, in percentuale (es. 26.07) */
  aliquotaGs: number;
  /** contributi INPS VERSATI per cassa nell'anno (LM035); deduce l'imposta */
  contributiVersatiCassa: number;
  /** aliquota imposta sostitutiva dell'anno, in percentuale (5 startup / 15) */
  aliquotaSost: number;
};

export type ForfettarioTaxResult = {
  /** INPS Gestione Separata di competenza dell'anno (RR "contributo dovuto") */
  inpsCompetenza: number;
  /** base imponibile imposta = reddito lordo - contributi versati (clamp >= 0) */
  redditoImponibile: number;
  /** imposta sostitutiva dell'anno (LM039) */
  impostaSostitutiva: number;
};

/** AdE arrotonda i risultati fiscali all'euro intero. */
export const roundFiscalToEuro = (value: number): number => Math.round(value);

/**
 * Pure, deterministic. No fetch, no config lookup: all inputs are explicit so the
 * formula can be unit-tested against the real declarations in isolation.
 */
export const computeForfettarioTax = ({
  redditoLordo,
  aliquotaGs,
  contributiVersatiCassa,
  aliquotaSost,
}: ForfettarioTaxInput): ForfettarioTaxResult => {
  const inpsCompetenza = Math.max(0, redditoLordo * (aliquotaGs / 100));
  const redditoImponibile = Math.max(0, redditoLordo - contributiVersatiCassa);
  const impostaSostitutiva = Math.max(
    0,
    redditoImponibile * (aliquotaSost / 100),
  );

  return { inpsCompetenza, redditoImponibile, impostaSostitutiva };
};
