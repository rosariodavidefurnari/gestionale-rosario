# Piano — Gate 2: selected-year cassa gate su dichiarazione depositata (DOM-4)

Spec: `docs/superpowers/specs/2026-06-20-selected-year-cassa-gate-design.md`

## File coinvolti

Prodotto:
- `src/components/atomic-crm/dashboard/selectedYearContributiVersatiCassa.ts` (NUOVO) — funzione
  pura `resolveSelectedYearContributiVersatiCassa`.
- `src/components/atomic-crm/dashboard/useDashboardData.ts` — la memo `contributiVersatiCassa`
  (anno selezionato, riga ~117-128) chiama la funzione pura (aggiunge `fiscalDeclarationQuery.data`
  alle deps). La memo `basisContributiVersatiCassa` (riga ~133-140) INVARIATA.

Test:
- `src/components/atomic-crm/dashboard/selectedYearContributiVersatiCassa.test.ts` (NUOVO).

Docs/sistema (stesso commit, WF-6):
- `docs/CANTIERE.md` (gate 2 chiuso → 0 gate aperti), `docs/historical-analytics-handoff.md`,
  `docs/development-continuity-map.md` se serve, `.claude/rules/learning.md` (DOM-4 update o nota).

## Step (TDD RED → GREEN → REFACTOR)

1. RED — `selectedYearContributiVersatiCassa.test.ts`:
   - dichiarazione CHIUSA + obligations + lines → ritorna la somma INPS cassa;
   - dichiarazione APERTA (totali zero) ANCHE con obligations (bollo) → `undefined`;
   - dichiarazione null/undefined → `undefined`;
   - chiusa ma lines/obligations mancanti → `undefined`;
   - `year` null → `undefined`.
   Il file/funzione non esistono → RED.

2. GREEN — creare la funzione pura + wiring nel hook.

3. REFACTOR — commenti DOM-4 + asimmetria basis documentata inline.

## Verifiche

- `npm run test` (intera suite).
- `make typecheck`, `npm run lint` / prettier, `npm run continuity:check`.
- Prod read-only: `npm run smoke:ef-reminder-parity` ANCORA 9.005,91 (gate 1 intatto) + check
  una-tantum 2025 imposta (competence vs partial-cassa, delta documentato).
- Browser WF-17: dashboard desktop + mobile su 2025, 0 errori console.

## Stop point / review

- Review impl multi-superficie (fiscale forfettario, frontend/mobile parity, TDD) con RAG +
  sorgente PRIMA del commit. OGNI revisore deve verificare che gate 1 (basis memo) NON sia toccato.
- Frontend-only → NESSUN deploy EF; Vercel auto-deploy al merge.

## Ciclo RED/GREEN dichiarato (MONEY/FISCAL TDD RULE)

- RED: il test sul helper fallisce (funzione assente) e dimostra il bug (aperto+bollo → oggi
  ritorna un numero, deve ritornare undefined).
- GREEN: helper + wiring → verde.
- REFACTOR: pulizia, asimmetria basis documentata.
