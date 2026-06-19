import { describe, expect, it } from "vitest";

import {
  applyDefinitiveDeclaration,
  definitiveImposta,
  definitiveInpsCompetenza,
  isDeclarationClosed,
} from "./applyDefinitiveDeclaration";
import type { FiscalDeclaration } from "./fiscalRealityTypes";
import type { FiscalKpis } from "./fiscalModelTypes";

const makeDeclaration = (
  over: Partial<FiscalDeclaration> & Pick<FiscalDeclaration, "tax_year">,
): FiscalDeclaration => ({
  id: `decl-${over.tax_year}`,
  total_substitute_tax: 0,
  total_inps: 0,
  prior_advances_substitute_tax: 0,
  prior_advances_inps: 0,
  notes: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  user_id: "user-1",
  ...over,
});

// STIMA di partenza (numeri qualunque, devono essere SOSTITUITI quando chiuso).
const makeStimaKpis = (over: Partial<FiscalKpis> = {}): FiscalKpis => ({
  taxYear: 2024,
  fatturatoLordoYtd: 13740,
  fatturatoTotaleYtd: 13740,
  fatturatoNonTassabileYtd: 0,
  unmappedCashRevenue: 0,
  redditoLordoForfettario: 10717.2,
  stimaInpsAnnuale: 2794, // stima teorica (sbagliata vs reale)
  redditoImponibile: 7923,
  stimaImpostaAnnuale: 396, // stima teorica
  redditoNettoStimato: 10550,
  percentualeNetto: 76,
  accantonamentoMensile: 265,
  distanzaDalTetto: 71260,
  percentualeUtilizzoTetto: 16,
  aliquotaSostitutiva: 5,
  monthsOfData: 12,
  isDefinitive: false,
  ...over,
});

// Oracoli reali AdE (verificati su prod, read-only):
//   2023: total_inps 2249, prior 0       → INPS competenza 2249; imposta 429
//   2024: total_inps 3667,40, prior 1788,40 → INPS competenza 1879; imposta 233
const decl2023 = makeDeclaration({
  tax_year: 2023,
  total_substitute_tax: 429,
  total_inps: 2249,
  prior_advances_substitute_tax: 0,
  prior_advances_inps: 0,
});
const decl2024 = makeDeclaration({
  tax_year: 2024,
  total_substitute_tax: 233,
  total_inps: 3667.4,
  prior_advances_substitute_tax: 429,
  prior_advances_inps: 1788.4,
});
// 2025 reale: totali ZERO intenzionali → NON chiusa.
const decl2025zero = makeDeclaration({
  tax_year: 2025,
  total_substitute_tax: 0,
  total_inps: 0,
  prior_advances_substitute_tax: 233,
  prior_advances_inps: 1503.09,
});

describe("isDeclarationClosed", () => {
  it("true quando total_substitute_tax + total_inps > 0", () => {
    expect(isDeclarationClosed(decl2023)).toBe(true);
    expect(isDeclarationClosed(decl2024)).toBe(true);
  });
  it("false per dichiarazione con totali zero (2025 non ancora chiusa)", () => {
    expect(isDeclarationClosed(decl2025zero)).toBe(false);
  });
  it("false per null/undefined", () => {
    expect(isDeclarationClosed(null)).toBe(false);
    expect(isDeclarationClosed(undefined)).toBe(false);
  });
});

describe("definitiveInpsCompetenza (= total_inps − prior_advances_inps)", () => {
  it("2023 → 2249 (oracolo RR contributo dovuto)", () => {
    expect(definitiveInpsCompetenza(decl2023)).toBe(2249);
  });
  it("2024 → 1879 (oracolo RR contributo dovuto, NON total_inps 3667,40)", () => {
    expect(definitiveInpsCompetenza(decl2024)).toBe(1879);
  });
});

describe("definitiveImposta (= total_substitute_tax)", () => {
  it("2023 → 429 (LM039)", () => {
    expect(definitiveImposta(decl2023)).toBe(429);
  });
  it("2024 → 233 (LM039)", () => {
    expect(definitiveImposta(decl2024)).toBe(233);
  });
});

describe("applyDefinitiveDeclaration", () => {
  it("anno chiuso 2024: sostituisce la stima col definitivo reale + isDefinitive true", () => {
    const result = applyDefinitiveDeclaration(makeStimaKpis(), decl2024);
    expect(result.isDefinitive).toBe(true);
    expect(result.stimaInpsAnnuale).toBe(1879);
    expect(result.stimaImpostaAnnuale).toBe(233);
    // accantonamento = (1879 + 233) / 12
    expect(result.accantonamentoMensile).toBe(176);
    // total_inps reale NON deve comparire come INPS dell'anno
    expect(result.stimaInpsAnnuale).not.toBe(3667.4);
  });

  it("anno chiuso: netto E percentuale ricalcolati COERENTI sul definitivo", () => {
    // fatturato 13740, total tasse = 1879 + 233 = 2112 -> netto 11628 (84,63%).
    // La stima di partenza ha percentualeNetto 76 (discordante): deve essere
    // sovrascritto, non lasciato accanto al netto definitivo.
    const result = applyDefinitiveDeclaration(
      makeStimaKpis({ fatturatoTotaleYtd: 13740, percentualeNetto: 76 }),
      decl2024,
    );
    expect(result.redditoNettoStimato).toBe(11628);
    expect(result.percentualeNetto).toBe(
      Math.round((11628 / 13740) * 10000) / 100,
    );
    expect(result.percentualeNetto).not.toBe(76);
  });

  it("clamp: prior_advances_inps > total_inps -> INPS competenza 0 (no negativo)", () => {
    const weird = makeDeclaration({
      tax_year: 2024,
      total_substitute_tax: 233,
      total_inps: 1879,
      prior_advances_inps: 5000, // acconti > ciclo (caso anomalo)
    });
    expect(definitiveInpsCompetenza(weird)).toBe(0);
    const result = applyDefinitiveDeclaration(makeStimaKpis(), weird);
    expect(result.isDefinitive).toBe(true);
    expect(result.stimaInpsAnnuale).toBe(0);
  });

  it("anno chiuso con SOLA imposta o SOLO INPS resta chiuso", () => {
    const soloInps = makeDeclaration({
      tax_year: 2023,
      total_substitute_tax: 0,
      total_inps: 2249,
      prior_advances_inps: 0,
    });
    expect(isDeclarationClosed(soloInps)).toBe(true);
    const result = applyDefinitiveDeclaration(
      makeStimaKpis({ taxYear: 2023 }),
      soloInps,
    );
    expect(result.isDefinitive).toBe(true);
    expect(result.stimaInpsAnnuale).toBe(2249);
    expect(result.stimaImpostaAnnuale).toBe(0);
  });

  it("anno chiuso 2023: definitivo 2249 + 429", () => {
    const result = applyDefinitiveDeclaration(
      makeStimaKpis({ taxYear: 2023 }),
      decl2023,
    );
    expect(result.isDefinitive).toBe(true);
    expect(result.stimaInpsAnnuale).toBe(2249);
    expect(result.stimaImpostaAnnuale).toBe(429);
  });

  it("dichiarazione 2025 con totali zero: resta STIMA (isDefinitive false, numeri invariati)", () => {
    const stima = makeStimaKpis({ taxYear: 2025 });
    const result = applyDefinitiveDeclaration(stima, decl2025zero);
    expect(result.isDefinitive).toBe(false);
    expect(result.stimaInpsAnnuale).toBe(stima.stimaInpsAnnuale);
    expect(result.stimaImpostaAnnuale).toBe(stima.stimaImpostaAnnuale);
  });

  it("nessuna dichiarazione: resta STIMA (falsificabilita' del ramo, AC6)", () => {
    const stima = makeStimaKpis();
    const result = applyDefinitiveDeclaration(stima, null);
    expect(result.isDefinitive).toBe(false);
    expect(result.stimaInpsAnnuale).toBe(stima.stimaInpsAnnuale);
  });
});
