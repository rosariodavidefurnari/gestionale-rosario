import { describe, expect, it } from "vitest";

import { computeForfettarioTax, roundFiscalToEuro } from "./fiscalFormula";

// Oracoli: dichiarazioni Redditi PF reali (Agenzia delle Entrate, SPID), periodo
// d'imposta 2023 e 2024. La formula deve riprodurre Quadro RR (INPS) e Quadro LM
// (imposta) all'euro, come fa il commercialista. Fixture inline (SYSTEM-FIRST).
describe("computeForfettarioTax — oracoli dichiarazioni AdE reali", () => {
  it("2023: INPS 2.249 (RR) + imposta 429 (LM039)", () => {
    const r = computeForfettarioTax({
      redditoLordo: 8575, // LM034 = componenti positivi 10.993 x 78%
      aliquotaGs: 26.23, // Gestione Separata 2023
      contributiVersatiCassa: 0, // LM035 = 0 (primo anno, nessun INPS pregresso pagato)
      aliquotaSost: 5, // startup
    });

    expect(roundFiscalToEuro(r.inpsCompetenza)).toBe(2249);
    expect(r.redditoImponibile).toBe(8575); // LM036/038
    expect(roundFiscalToEuro(r.impostaSostitutiva)).toBe(429);
  });

  it("2024: INPS 1.879 (RR) + imposta 233 (LM039), deduzione cassa LM035=2.538", () => {
    const r = computeForfettarioTax({
      redditoLordo: 7207, // LM034 = componenti positivi 9.240 x 78%
      aliquotaGs: 26.07, // Gestione Separata 2024
      contributiVersatiCassa: 2538, // LM035 = INPS versato per cassa nel 2024
      aliquotaSost: 5,
    });

    expect(roundFiscalToEuro(r.inpsCompetenza)).toBe(1879);
    expect(r.redditoImponibile).toBe(4669); // 7207 - 2538 = LM036/038
    expect(roundFiscalToEuro(r.impostaSostitutiva)).toBe(233);
  });

  it("la deduzione usa i contributi VERSATI (cassa), non quelli di competenza", () => {
    // Bug reale #3: dedurre la competenza (1.879) invece del versato (2.538)
    // darebbe imposta (7207-1879)*5% = 266, NON 233. Questo blocca quel bug.
    const wrong = computeForfettarioTax({
      redditoLordo: 7207,
      aliquotaGs: 26.07,
      contributiVersatiCassa: 1879, // competenza (SBAGLIATO per la deduzione)
      aliquotaSost: 5,
    });
    expect(roundFiscalToEuro(wrong.impostaSostitutiva)).toBe(266);
    expect(roundFiscalToEuro(wrong.impostaSostitutiva)).not.toBe(233);
  });

  it("output non negativi: contributi versati > reddito -> imponibile e imposta 0", () => {
    const r = computeForfettarioTax({
      redditoLordo: 1000,
      aliquotaGs: 26.07,
      contributiVersatiCassa: 5000,
      aliquotaSost: 5,
    });
    expect(r.redditoImponibile).toBe(0);
    expect(r.impostaSostitutiva).toBe(0);
  });
});
