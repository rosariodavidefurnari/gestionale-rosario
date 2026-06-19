import type { FiscalDeclaration } from "./fiscalRealityTypes";
import type { FiscalKpis } from "./fiscalModelTypes";
import { roundFiscalOutput } from "./roundFiscalOutput";

/**
 * D3 — Anni con dichiarazione reale (passato): nessuna doppia verita'.
 *
 * Per un anno che HA gia' la sua dichiarazione reale chiusa, le card KPI NON
 * devono mostrare la STIMA della formula: devono mostrare i numeri DEFINITIVI
 * della dichiarazione del commercialista, con etichetta onesta (INV-6).
 *
 * I tre numeri INPS NON vanno confusi (DOM-8 / spec §14.3-14.4):
 *  - `total_inps` in `fiscal_declarations` = ciclo cassa riconciliato (saldo +
 *    acconti), dato reale del commercialista, NON si tocca / NON si ricalcola;
 *  - l'INPS "dell'anno" da mostrare e' la COMPETENZA (RR "contributo dovuto"),
 *    derivata come `total_inps − prior_advances_inps` (la stessa derivazione
 *    gia' usata da `buildObligationsFromDeclaration` per `inps_saldo`);
 *  - i contributi VERSATI per cassa (LM035) servono solo a dedurre l'imposta
 *    della STIMA, non c'entrano col definitivo.
 *
 * Verificato sulle dichiarazioni AdE reali (prod, read-only):
 *  - 2023: total_inps 2249, prior_advances_inps 0   → INPS 2249; imposta 429;
 *  - 2024: total_inps 3667,40, prior_advances_inps 1788,40 → INPS 1879; imposta 233.
 */

/**
 * Una dichiarazione e' "chiusa/affidabile" quando i totali annuali sono
 * non-zero (`total_substitute_tax + total_inps > 0`). La dichiarazione 2025 ha
 * totali ZERO intenzionali finche' Fabio non la chiude → resta NON affidabile,
 * quindi quell'anno mostra la stima.
 */
export const isDeclarationClosed = (
  declaration: FiscalDeclaration | null | undefined,
): declaration is FiscalDeclaration => {
  if (!declaration) return false;
  const totals =
    Number(declaration.total_substitute_tax) + Number(declaration.total_inps);
  return Number.isFinite(totals) && totals > 0;
};

/**
 * INPS di competenza dell'anno (RR "contributo dovuto") = ciclo − acconti.
 * `total_inps` NON viene mai modificato: si deriva solo il saldo di competenza.
 */
export const definitiveInpsCompetenza = (
  declaration: FiscalDeclaration,
): number =>
  roundFiscalOutput(
    Math.max(
      0,
      Number(declaration.total_inps) - Number(declaration.prior_advances_inps),
    ),
  );

/** Imposta sostitutiva dell'anno (LM039) = `total_substitute_tax`. */
export const definitiveImposta = (declaration: FiscalDeclaration): number =>
  roundFiscalOutput(Math.max(0, Number(declaration.total_substitute_tax)));

/**
 * Sostituisce la STIMA con il DEFINITIVO reale quando l'anno e' chiuso.
 * Lascia i KPI invariati (marcandoli `isDefinitive: false`) quando non c'e'
 * una dichiarazione chiusa per quell'anno → l'anno corrente resta una stima.
 */
export const applyDefinitiveDeclaration = (
  kpis: FiscalKpis,
  declaration: FiscalDeclaration | null | undefined,
): FiscalKpis => {
  if (!isDeclarationClosed(declaration)) {
    return { ...kpis, isDefinitive: false };
  }

  const inps = definitiveInpsCompetenza(declaration);
  const imposta = definitiveImposta(declaration);
  const total = inps + imposta;

  return {
    ...kpis,
    stimaInpsAnnuale: inps,
    stimaImpostaAnnuale: imposta,
    redditoNettoStimato: roundFiscalOutput(kpis.fatturatoTotaleYtd - total),
    accantonamentoMensile: roundFiscalOutput(total / 12),
    isDefinitive: true,
  };
};
