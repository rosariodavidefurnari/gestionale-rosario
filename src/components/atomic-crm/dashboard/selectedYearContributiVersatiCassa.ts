import { isDeclarationClosed } from "./applyDefinitiveDeclaration";
import { sumInpsContributionsPaidInYear } from "./inpsContributionsPaid";
import type {
  FiscalDeclaration,
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";

/**
 * INPS versato per cassa (LM035) da dedurre dall'imposta della STIMA dell'anno
 * SELEZIONATO — ma SOLO quando la dichiarazione di quell'anno è DEPOSITATA
 * (chiusa). Lì il versato F24 è completo e replica l'imposta reale; per gli anni
 * chiusi `applyDefinitiveDeclaration` sovrascrive comunque la card KPI, e questa
 * deduzione rende `redditoImponibile` cassa-accurato (non sovrascritto da D3).
 *
 * Perché NON `obligations.length` (DOM-4, cugino di DB-11): la sola PRESENZA di un
 * `fiscal_obligation` (es. un BOLLO pagato) NON significa "anno dichiarato dal
 * commercialista". Gatare sulla lunghezza faceva scattare una deduzione su un
 * versato F24 PARZIALE per un anno aperto (es. 2025), falsando la stima imposta.
 * Anno aperto → `undefined` → fallback competenza (stima stabile).
 *
 * ASIMMETRIA VOLUTA col basis-year del SALDO (gate 1, `basisContributiVersatiCassa`):
 * quello deduce l'INPS realmente versato per cassa nel basis-year anche se quella
 * dichiarazione non è depositata — gatarlo qui lo romperebbe. Questa funzione vale
 * SOLO per la stima dell'anno selezionato.
 *
 * Pure: nessun fetch, nessun clock.
 */
export const resolveSelectedYearContributiVersatiCassa = ({
  year,
  declaration,
  obligations,
  lines,
}: {
  year: number | undefined;
  declaration: FiscalDeclaration | null | undefined;
  obligations: FiscalObligation[] | undefined;
  lines: FiscalF24PaymentLineEnriched[] | undefined;
}): number | undefined => {
  if (
    year == null ||
    !isDeclarationClosed(declaration) ||
    !obligations ||
    !lines
  ) {
    return undefined;
  }
  return sumInpsContributionsPaidInYear(lines, obligations, year);
};
