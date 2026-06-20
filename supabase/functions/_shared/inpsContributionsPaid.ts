import { getBusinessYear } from "./dateTimezone.ts";

/**
 * Deno mirror of src/components/atomic-crm/dashboard/inpsContributionsPaid.ts
 * (runtime Deno != Vite). La parità di semantica è garantita dal fatto che la EF
 * reminder e la card client devono dedurre l'imposta del saldo sulla STESSA cassa
 * (LM035). Se questa logica drifta dal client, il promemoria diverge dalla card.
 */

/** Riga obbligazione: serve solo `component` risolto via `id`. */
export type FiscalObligationComponentRow = {
  id: string;
  component: string;
};

/** Riga F24 enriched: importo + data di versamento (cassa). */
export type FiscalF24PaymentLineCashRow = {
  obligation_id: string;
  amount: number;
  submission_date: string;
};

/**
 * Solo le component CONTRIBUTIVE INPS deducono l'imposta sostitutiva (rigo LM035).
 * Allowlist ESPLICITA (non `startsWith("inps_")`): gli interessi di rateazione
 * (`interessi_inps`, DB-7) NON sono contributi previdenziali deducibili → esclusi.
 */
const INPS_CONTRIBUTIVE_COMPONENTS = new Set<string>([
  "inps_saldo",
  "inps_acconto_1",
  "inps_acconto_2",
]);

/**
 * Contributi INPS effettivamente VERSATI per cassa nell'anno solare `year`
 * (mappa il rigo LM035: contributi dedotti = pagati nel periodo).
 *
 * Cassa = filtro sulla `submission_date` della riga F24 (quando il denaro esce),
 * NON sul `payment_year` dell'obbligazione. Pure: riceve righe e obbligazioni
 * già fetchate; il `component` vive sull'obbligazione → risalita via `obligation_id`.
 */
export const sumInpsContributionsPaidInYear = (
  lines: FiscalF24PaymentLineCashRow[],
  obligations: FiscalObligationComponentRow[],
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
