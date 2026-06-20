# Spec — EF reminder fiscale: parità con la card "Scadenze fiscali" (DOM-5 due-layer)

Stato: design
Data: 2026-06-20
Gate: gate 1 del CANTIERE (sessione 2026-06-20)

## Problema

La card "Scadenze fiscali" mostra ora il SALDO 2026 esatto `9.005,91 €`, dopo due
fix lato client (commit `9dc7f6c3` acconti reali + `41c655fc` imposta su cassa).
La Edge Function `fiscal_deadline_check` (promemoria WhatsApp/email + task) calcola
ancora il saldo sulla STIMA-formula tramite `_shared/fiscalDeadlineCalculation.ts` →
il promemoria del 30/06/2026 (imminente, ~10 giorni) direbbe **~7.941 €** invece di
**9.005,91 €**. Due-layer fiscale disallineato (DOM-5): stima-card corretta, EF no.

Causa radice (identica al bug client, ora capito):

1. **Acconti del saldo = STIMA, non reali**: il saldo dell'anno Y sottrae acconti
   stimati dalla formula su Y-2 (sovrastima), invece dei % della tassa CERTIFICATA
   di Y-2 (dichiarazione chiusa). Per 2026: acconti 2024 stimati ~2.235 INPS invece
   dei reali 1.503,09 versati nel 2025. (DB-12)
2. **Imposta del saldo dedotta su COMPETENZA, non cassa (LM035)**: l'imposta del
   basis-year (2025) deduce l'INPS di competenza invece dell'INPS effettivamente
   versato per cassa nel 2025. (LM035)

Perché l'overlay reale (`applyRealObligations`) NON copre il caso: per il 2026 le 6
proiezioni hand-inserite sono state CANCELLATE (`3d1f23c5`, DB-11) → 0 obblighi
certificati 2026 → `hasRealData:false` → il promemoria usa la stima verbatim. Quindi
il fix va nel **layer stima** (`buildFiscalReminderComputation`), NON nell'overlay.

## Obiettivi

- Portare lato Deno le DUE correzioni già provate lato client, così che la EF
  produca lo STESSO schedule (e quindi gli stessi importi nel promemoria/task) della
  card. Target deterministico: alto-priorità 2026 = `9.005,91 €` (30/06 `6.574,10` +
  30/11 `2.431,81`).
- Parità client/EF garantita da test (`fiscalParity.test.ts` esteso, falsificabile).
- Comportamento invariato per gli anni senza dichiarazione chiusa / senza F24 del
  basis-year (fallback alla stima, byte-for-byte → parity verde sui rami esistenti).

## Non-obiettivi

- NON toccare i builder condivisi del calcolo fiscale (`buildFiscalPaymentSchedule`,
  `buildAdvancePlanFromEstimate`, `buildFiscalYearEstimate`): solo l'INPUT che vi
  viene passato cambia (come lato client). `total_inps` mai modificato (DOM-8).
- NON cambiare l'overlay reale `applyRealObligations` né `selectCertifiedObligations`.
- NON cambiare la card client (già LIVE ed esatta).
- NON cambiare auth, cron, idempotenza notifiche, anti-spam.

## Fonti di verità

- Card client (oracolo): `buildFiscalModel` (`fiscalModel.ts`) usa
  `resolvePriorAdvanceScheduleInput(twoYearsBack.scheduleInput, priorBasisDeclaration)`
  per `priorAdvancePlan` e passa `contributiVersatiCassa: basisContributiVersatiCassa`
  a `previousYearEstimate`. Numeri reali in `project_fiscal_real_data_baseline.md`.
- Helper puri client da mirrorare: `resolvePriorAdvanceScheduleInput.ts`,
  `applyDefinitiveDeclaration.ts` (`isDeclarationClosed`, `definitiveInpsCompetenza`,
  `definitiveImposta`), `inpsContributionsPaid.ts` (`sumInpsContributionsPaidInYear`).
- Query reali: provider `fiscalRealityProvider.ts` (`getFiscalDeclaration(taxYear)`,
  `getFiscalObligations(paymentYear)`, `getEnrichedPaymentLinesForYear(paymentYear)`).
- Dichiarazioni AdE reali 2024: `total_inps 3667,40`, `prior_advances_inps 1788,40` →
  competenza `1879`; `total_substitute_tax 233`. INPS versato cassa 2025 = LM035.

## Rischi

- **Parità rotta**: se il mirror Deno dei tre helper drifta dal client → promemoria
  diverso dalla card. Mitigazione: parità falsificabile in `fiscalParity.test.ts`
  (scenario con `basisContributiVersatiCassa` + `priorBasisDeclaration`).
- **Fetch divergente**: se la EF fetcha input diversi dal hook client → numeri
  diversi pur con builder identici. Mitigazione: replicare ESATTAMENTE le query del
  provider (stesso anno, stesso filtro `payment_year`/`tax_year`, stesso
  `submission_date`-year per la cassa).
- **Regressione anni aperti**: il basis-year senza obblighi/F24 deve dare `undefined`
  → fallback competenza (comportamento storico). `priorBasisDeclaration` non chiusa →
  fallback stima. Coperto da test.
- **Deploy dimenticato** (BE-1): `git push` NON deploya la EF.

## Decisioni

- Il fix vive nel **layer stima** (`buildFiscalReminderComputation`), non nell'overlay.
- Helper puri mirrorati lato Deno con parità garantita da test (stesso pattern del
  duplicato `ALIQUOTA_GS_BY_YEAR` già presente nel file).
- `sumInpsContributionsPaidInYear` (data-shaping) vive in un nuovo
  `_shared/inpsContributionsPaid.ts`; la EF `index.ts` (= il "hook") fetcha i dati,
  calcola il NUMERO e lo passa al builder. I tre helper di dichiarazione e
  `resolvePriorAdvanceScheduleInput` vivono in `_shared/fiscalDeadlineCalculation.ts`
  (owner di `FiscalEstimateScheduleInput` e `roundFiscalOutput`) → niente import ciclico.

## Invarianti

- INV-1: builder condivisi invariati → `fiscalParity.test.ts` resta verde sui rami
  esistenti.
- INV-2: input mancante (no F24 basis / no dichiarazione chiusa) → output identico a
  oggi (fallback).
- INV-3: `total_inps` solo letto, mai scritto (DOM-8).
- INV-4: per anni con obblighi certificati, l'overlay reale continua a vincere
  (la stima corretta diventa inerte) — nessun doppio conteggio.

## Criteri di accettazione

- AC-1: `buildFiscalReminderComputation` accetta `basisContributiVersatiCassa?` e
  `priorBasisDeclaration?`; assenti → comportamento odierno.
- AC-2: con i due input reali, lo schedule alto-priorità 2026 = card (parità).
- AC-3: `resolvePriorAdvanceScheduleInput` Deno = client (mirror dei 3 test).
- AC-4: `sumInpsContributionsPaidInYear` Deno = client (allowlist INPS, esclude
  interessi, filtro `submission_date`-year).
- AC-5: la EF fetcha dichiarazione `tax_year=currentYear-2` e somma INPS-cassa del
  basis-year `currentYear-1`, passandoli al builder.
- AC-6: `make test` (parity + nuovi test) verde; `deno check` EF verde; typecheck;
  continuity.
- AC-7: EF deployata su `qvdmzhyzpyaveniirsmo`; verifica prod read-only che lo
  schedule 2026 della EF = `9.005,91`.

## Controllori

- `fiscalParity.test.ts`: nuovo scenario schedule con `basisContributiVersatiCassa` +
  `priorBasisDeclaration` → server == client (falsificabile).
- `_shared/fiscalDeadlineCalculation.test.ts`: `resolvePriorAdvanceScheduleInput`
  (3 casi) + `buildFiscalReminderComputation` con vs senza prior declaration / cassa
  (delta falsificabile).
- `_shared/inpsContributionsPaid.test.ts`: somma INPS cassa (allowlist, interessi
  esclusi, anno submission_date).
- Verifica prod read-only (MCP/script): schedule 2026 EF == card.
