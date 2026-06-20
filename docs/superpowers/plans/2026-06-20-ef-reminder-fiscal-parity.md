# Piano — EF reminder fiscale: parità con la card (DOM-5)

Spec: `docs/superpowers/specs/2026-06-20-ef-reminder-fiscal-parity-design.md`
Relazione: porta lato Deno i fix client `9dc7f6c3` + `41c655fc`.

## File coinvolti

Prodotto (Deno):
- `supabase/functions/_shared/fiscalDeadlineCalculation.ts` — aggiungere:
  - type `FiscalDeclarationInput` (minimale: `total_substitute_tax`, `total_inps`,
    `prior_advances_inps`);
  - `isDeclarationClosed`, `definitiveInpsCompetenza`, `definitiveImposta`,
    `resolvePriorAdvanceScheduleInput` (mirror puro del client);
  - in `buildFiscalReminderComputation`: param `basisContributiVersatiCassa?` e
    `priorBasisDeclaration?`; usarli per `estimate` (cassa) e `priorAdvancePlan`
    (resolve).
- `supabase/functions/_shared/inpsContributionsPaid.ts` (NUOVO) —
  `sumInpsContributionsPaidInYear` + row types minimali (mirror client).
- `supabase/functions/fiscal_deadline_check/index.ts` — nuova
  `loadEstimateRealityInputs(currentYear)`: fetch dichiarazione `tax_year=year-2`
  + obblighi `payment_year=year-1` + enriched lines → `basisContributiVersatiCassa`;
  passare entrambi a `buildFiscalReminderComputation`.

Test:
- `supabase/functions/_shared/fiscalDeadlineCalculation.test.ts` — estendere.
- `supabase/functions/_shared/inpsContributionsPaid.test.ts` (NUOVO).
- `src/components/atomic-crm/dashboard/fiscalParity.test.ts` — nuovo scenario.

Docs/sistema (stesso commit, WF-6):
- `docs/CANTIERE.md` (gate 1 chiuso), `docs/historical-analytics-handoff.md`,
  `docs/historical-analytics-backlog.md` se cambia stop-line,
  `docs/development-continuity-map.md`, `.claude/rules/learning.md` (DOM-5 update).

## Step (TDD RED → GREEN → REFACTOR)

1. **RED** — scrivere i test prima:
   - parity: scenario `reminder_realData_parity` con `basisContributiVersatiCassa`
     + `priorBasisDeclaration` chiusa → server `buildFiscalReminderComputation` ==
     client `buildFiscalPaymentSchedule` (threading replicato). Rosso: i param non
     esistono ancora.
   - Deno calc: `resolvePriorAdvanceScheduleInput` 3 casi (chiusa/null/unfiled) +
     `buildFiscalReminderComputation` delta (con prior closed → saldo INPS più alto
     dell'estimate; con cassa → imposta diversa). Rosso: helper assente.
   - `inpsContributionsPaid.test.ts`: somma allowlist, interessi esclusi, anno.
     Rosso: file assente.
   Lanciare `npm run test -- fiscalParity inpsContributionsPaid fiscalDeadlineCalculation`
   → confermare RED.

2. **GREEN** — implementare i mirror + threading + fetch (minimo per il verde).

3. **REFACTOR** — solo dopo verde: commenti parità, naming, niente duplicazione
   inutile.

## Verifiche

- `npm run test` (intera suite — parity verde + nuovi test).
- `make typecheck`.
- `deno check supabase/functions/fiscal_deadline_check/index.ts` (scope EF).
- `npm run lint` / prettier.
- `npm run continuity:check`.
- Prod read-only: replicare la fetch via MCP `execute_sql` (service-role) e runnare
  il builder sui dati reali → schedule 2026 == `9.005,91`. (oppure invocare la EF
  deployata e verificare i task creati con gli importi giusti).

## Documentazione

- CANTIERE: gate 1 → CHIUSO; aggiornare "Prossima azione" (resta gate 2
  `useDashboardData:102` length-switch).
- handoff/backlog: DOM-5 due-layer ora allineato sul saldo; nota: la EF resta
  inerte per anni con obblighi certificati (overlay vince).
- learning DOM-5: aggiungere che la EF reminder ora usa acconti reali + imposta
  cassa come la card.

## Stop point / review richieste

- Review impl multi-superficie (fiscale forfettario, DB/Edge, TDD/parità) con RAG
  + verifica sorgente PRIMA del deploy.
- Deploy EF: azione outward → eseguire dopo verde locale completo; `--project-ref
  qvdmzhyzpyaveniirsmo` (BE-8). `git push` NON deploya (BE-1).
- Relazione con spec: ogni AC mappato a un controllore.

## Ciclo RED/GREEN dichiarato (MONEY/FISCAL TDD RULE)

- RED: i 3 gruppi di test sopra falliscono sul codice attuale (param/helper/file
  assenti, e il delta saldo non si verifica).
- GREEN: mirror helper + threading param + fetch EF → test verdi.
- REFACTOR: pulizia commenti/naming, parità documentata.
