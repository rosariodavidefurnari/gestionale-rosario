import { getBusinessYear } from "@/lib/dateTimezone";

import type {
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";

/**
 * Solo le component CONTRIBUTIVE INPS deducono l'imposta sostitutiva (rigo LM035).
 * Allowlist ESPLICITA (non `startsWith("inps_")`): gli interessi di rateazione
 * (`interessi_inps`, vedi DB-7) NON sono contributi previdenziali deducibili e
 * vanno esclusi.
 */
const INPS_CONTRIBUTIVE_COMPONENTS = new Set<string>([
  "inps_saldo",
  "inps_acconto_1",
  "inps_acconto_2",
]);

/**
 * Contributi INPS effettivamente VERSATI per cassa nell'anno solare `year`
 * (mappa il rigo LM035 della dichiarazione: contributi dedotti = pagati nel periodo).
 *
 * Cassa = filtro sulla `submission_date` della riga F24 (quando il denaro esce),
 * NON sul `payment_year` dell'obbligazione: una rata con `payment_year=Y` ma
 * versata l'anno dopo NON conta nell'anno Y.
 *
 * Pure: riceve le righe F24 e le obbligazioni gia' fetchate. Il `component` vive
 * sull'obbligazione, quindi si risale via `obligation_id`.
 */
export const sumInpsContributionsPaidInYear = (
  lines: FiscalF24PaymentLineEnriched[],
  obligations: FiscalObligation[],
  year: number,
): number => {
  const componentByObligation = new Map(
    obligations.map((obligation) => [obligation.id, obligation.component]),
  );

  let total = 0;
  for (const line of lines) {
    const component = componentByObligation.get(line.obligation_id);
    if (component == null || !INPS_CONTRIBUTIVE_COMPONENTS.has(component)) {
      continue;
    }
    if (getBusinessYear(line.submission_date) !== year) {
      continue;
    }
    total += line.amount;
  }

  return total;
};
