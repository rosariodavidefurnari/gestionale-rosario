import type { FiscalEstimateScheduleInput } from "./fiscalDeadlines";
import type { FiscalDeclaration } from "./fiscalRealityTypes";
import {
  definitiveImposta,
  definitiveInpsCompetenza,
  isDeclarationClosed,
} from "./applyDefinitiveDeclaration";

/**
 * The prior advances subtracted from a year's SALDO are the acconti actually paid
 * for that competence year, which equal a percentage of the PRIOR year's tax. When
 * the prior-basis declaration (currentYear-2) is CLOSED (real, filed by the
 * accountant), derive the advance basis from its DEFINITIVE competence figures
 * instead of the drift-prone formula estimate. Falls back to the formula estimate
 * when no closed declaration exists (current/open years) — behavior unchanged there.
 *
 * Why (prod, 2026): the 2026 deadline card subtracted ESTIMATED 2024 advances
 * (~2.235 INPS, the formula over-estimating 2024) instead of the REAL acconti paid
 * in 2025 (1.503,09 INPS + 233 imposta = 80%/100% of the real 2024 declaration).
 * That UNDERSTATED the 2025 saldo (INPS 2.839 shown vs real 3.571) and the total
 * "da versare" (7.941 vs ~8.837). Reusing the real 2024 declaration the D3 KPI card
 * already trusts fixes the saldo with no new source of truth. `total_inps` is never
 * mutated — only the competence saldo is derived (`total_inps − prior_advances_inps`,
 * the same derivation as `buildObligationsFromDeclaration` / D3).
 *
 * Pure: no fetch, no clock. The shared schedule builders stay untouched (parity
 * safe) — only the INPUT fed into `buildAdvancePlanFromEstimate` changes.
 */
export const resolvePriorAdvanceScheduleInput = (
  estimateInput: FiscalEstimateScheduleInput,
  priorBasisDeclaration: FiscalDeclaration | null | undefined,
): FiscalEstimateScheduleInput =>
  isDeclarationClosed(priorBasisDeclaration)
    ? {
        taxYear: estimateInput.taxYear,
        annualInpsEstimate: definitiveInpsCompetenza(priorBasisDeclaration),
        annualSubstituteTaxEstimate: definitiveImposta(priorBasisDeclaration),
      }
    : estimateInput;
