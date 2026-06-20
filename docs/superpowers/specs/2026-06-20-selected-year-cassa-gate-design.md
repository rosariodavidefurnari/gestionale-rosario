# Spec — Gate 2: deduzione-cassa imposta dell'anno SELEZIONATO su dichiarazione DEPOSITATA (DOM-4)

Stato: design
Data: 2026-06-20
Gate: gate 2 del CANTIERE (l'ultimo aperto della schermata "Scadenze fiscali")

## Problema

In `useDashboardData.ts:124` la deduzione su CASSA dell'imposta della STIMA dell'anno
SELEZIONATO è gatata su `obligations.length === 0`:

```ts
if (year == null || !obligations || obligations.length === 0 || !lines) return undefined;
return sumInpsContributionsPaidInYear(lines, obligations, year);
```

`obligations.length > 0` NON significa "anno dichiarato dal commercialista" (DOM-4: stato
semantico ≠ lunghezza array). Un singolo `fiscal_obligation` di tipo **bollo** pagato (o una
qualunque obbligazione non-dichiarativa) per l'anno fa scattare la deduzione su cassa con un
versato F24 **parziale/incompleto**, invece del fallback su competenza. Effetto osservabile:
per il **2025** (dichiarazione NON ancora depositata, totali zero → D3 non sovrascrive, la card
mostra la STIMA) un bollo 2025 pagato fa mostrare una **stima imposta 2025 sbagliata**
(parziale-cassa) invece della stima competenza stabile.

## Fonti di verità (sorgente reale, verificato)

- La stima dell'anno selezionato (`buildFiscalYearEstimate taxYear=currentYear`,
  `fiscalModel.ts:528`) con `contributiVersatiCassa` alimenta **solo** `estimate.fiscalKpis`
  (`fiscalModel.ts:642`), poi `applyDefinitiveDeclaration` la sovrascrive col DEFINITIVO per gli
  anni CHIUSI (D3). Lo SCADENZARIO usa `previousYearEstimate` (basis), NON la stima dell'anno
  selezionato (`fiscalModel.ts:553`) → `contributiVersatiCassa` (anno selezionato) NON tocca lo
  scadenzario.
- `useFiscalReality.ts:114` già gata correttamente su `selectCertifiedObligations(...).length`
  (DB-11) — il bug raw-length è SOLO in `useDashboardData`.
- Helper esistente `isDeclarationClosed(declaration)` (`applyDefinitiveDeclaration.ts:32`): vero
  sse `total_substitute_tax + total_inps > 0`. È lo STESSO segnale che D3 usa per sovrascrivere.

## Obiettivi

- Gatare la deduzione-cassa dell'imposta dell'anno SELEZIONATO su **dichiarazione DEPOSITATA**
  (`isDeclarationClosed(declaration)`), non su `obligations.length`. Anno aperto → `undefined` →
  fallback competenza (stima stabile). Anno chiuso → cassa (e D3 sovrascrive comunque la card;
  la cassa rende `redditoImponibile` cassa-accurato, non sovrascritto da D3).
- Estrarre la decisione in una funzione PURA testabile (controllore falsificabile).

## Non-obiettivi

- NON toccare la memo del BASIS-year (`useDashboardData.ts:136`, gate 1). ASIMMETRIA VOLUTA: il
  saldo deduce l'INPS REALMENTE versato per cassa nel basis-year (anno-1) anche se quella
  dichiarazione NON è depositata — gatarla su `isDeclarationClosed` riporterebbe il saldo a
  competenza e ROMPEREBBE gate 1 (card tornerebbe ~8.840 invece di 9.005,91).
- NON toccare la EF (non ha una stima KPI dell'anno selezionato).
- NON toccare i builder condivisi, D3, lo scadenzario, la card "Scadenze fiscali".

## Rischi

- **Rompere gate 1**: se per errore tocco anche la memo basis. Mitigazione: spec/piano lo vietano
  esplicitamente + controllore prod che riverifica il saldo 9.005,91 invariato.
- **Regressione anno chiuso**: per anni chiusi la card è già definitiva (D3); il cambio rende
  `redditoImponibile` cassa-accurato (migliore), KPI imposta invariata (D3 vince). Verificare.
- **Mobile parity (UI-7)**: `useDashboardData` è un solo hook → desktop+mobile coperti insieme.

## Invarianti

- INV-1: gate 1 (saldo 2026 = 9.005,91) INVARIATO.
- INV-2: anni chiusi: KPI imposta invariata (D3 vince); `redditoImponibile` cassa-accurato.
- INV-3: anno aperto con bollo pagato: stima imposta su competenza (no deduzione parziale).
- INV-4: `total_inps` mai scritto (DOM-8).

## Criteri di accettazione

- AC-1: nuova funzione pura `resolveSelectedYearContributiVersatiCassa({year, declaration,
  obligations, lines})` → `number | undefined`; `isDeclarationClosed` falso → `undefined`.
- AC-2: `useDashboardData` usa la funzione pura per la memo dell'anno selezionato; la memo basis
  resta invariata.
- AC-3: controllore unit falsificabile (chiuso→sum; aperto-con-bollo→undefined; null→undefined;
  chiuso-senza-lines→undefined).
- AC-4: `make test` + typecheck + lint + continuity verdi; parità desktop/mobile (un hook).
- AC-5: prod read-only: saldo 2026 ancora 9.005,91 (gate 1 intatto) + stima imposta 2025 passa da
  parziale-cassa a competenza (delta atteso, documentato).
- AC-6: browser WF-17 desktop+mobile: dashboard 2025 imposta KPI coerente, 0 errori console.

## Controllori

- `selectedYearContributiVersatiCassa.test.ts` (unit puro, falsificabile).
- Prod read-only: gate-1 smoke (`npm run smoke:ef-reminder-parity`) ancora verde +
  verifica una-tantum del 2025 imposta (competence vs partial-cassa).
