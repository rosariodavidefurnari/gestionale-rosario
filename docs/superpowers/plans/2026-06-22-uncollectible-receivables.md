# Crediti inesigibili / write-off operativo - Implementation Plan

Data: 2026-06-22
Stato: v2 - review piano PASS, pronto per implementazione
Spec: `docs/superpowers/specs/2026-06-22-uncollectible-receivables-design.md`

## Goal

Implementare la semantica `payments.status = 'perso'` per chiudere
operativamente crediti non incassabili senza trasformarli in cassa.

Caso guida: Aidone `FPA 1/23`, 375 EUR.

Risultato atteso:

- Aidone esce da "Da incassare", scaduti e solleciti;
- Aidone non entra in incassato, fiscalita', cash-vs-competence o cassa;
- Aidone resta visibile come "Credito perso" con data/motivo;
- `total_paid` e `total_written_off` restano separati;
- backend e UI sono propagati su desktop/mobile.

## Architettura scelta

Nuovo stato pagamento `perso` + metadata sul record `payments`:

- `writeoff_date DATE`;
- `writeoff_reason TEXT`;
- constraint DB: `perso` richiede data/motivo;
- constraint DB: `rimborso` non puo' essere `perso`;
- `project_financials` e `client_commercial_position` espongono
  `total_written_off` e sottraggono il write-off solo dal saldo operativo.

Non si crea una nuova tabella `payment_writeoffs` in questa tranche: sarebbe piu'
normalizzata ma introduce una nuova resource, join e UI non necessarie per il
caso reale.

## Regole operative

- Prima di ogni modifica codice/schema/script/DB/commit: informare file, motivo,
  impatto e gate.
- MONEY/FISCAL TDD: RED prima dell'implementazione.
- Niente stato remoto modificato senza C1 read-only e dry-run/apply esplicito.
- Code-RAG gia' eseguito; se cambiano superfici o emergono dubbi, rifare query
  mirata e verificare su sorgente.
- UI/UX: usare skill `impeccable`, browser reale desktop e mobile, console
  controllata, clic su dropdown/sheet/modali coinvolti.
- Commit sensati: codice e docs correlate nello stesso commit, niente gate aperti
  nel commit.

## File previsti

### DB/backend

- `supabase/migrations/<timestamp>_uncollectible_payment_status.sql`
- `supabase/seed_domain_data.sql`
- `src/components/atomic-crm/types.ts`
- `scripts/check-prod-financial-health.mjs`

### Pagamenti/UI

- `src/components/atomic-crm/payments/paymentTypes.ts`
- `src/components/atomic-crm/payments/PaymentInputs.tsx`
- `src/components/atomic-crm/payments/PaymentListContent.tsx`
- `src/components/atomic-crm/payments/PaymentListFilter.tsx`
- `src/components/atomic-crm/payments/PaymentList.tsx`
- `src/components/atomic-crm/payments/PaymentShow.tsx`
- `src/components/atomic-crm/payments/paymentLinking.ts`
- test collegati in `src/components/atomic-crm/payments/*.test.*`

### Dashboard/scaduti

- `src/components/atomic-crm/dashboard/dashboardModel.ts`
- `src/components/atomic-crm/dashboard/dashboardDeadlineTrackerModel.ts`
- `src/components/atomic-crm/dashboard/DashboardDeadlineTracker.tsx`
- `src/components/atomic-crm/payments/PaymentOverdueBadge.tsx`
- test dashboard/payment badge collegati

### Fatture/void

- `src/components/atomic-crm/invoices/financialDocumentHelpers.ts`
- `src/components/atomic-crm/invoices/FinancialDocumentListContent.tsx`
- `src/components/atomic-crm/invoices/FinancialDocumentShow.tsx`
- `src/components/atomic-crm/invoices/invoiceVoidRules.ts`
- `supabase/functions/_shared/invoiceVoid.ts`
- test frontend/EF collegati

### AI/import/quote

- `src/lib/ai/unifiedCrmReadContext.ts`
- `src/lib/ai/unifiedCrmFinancialSummaries.ts`
- `src/components/atomic-crm/quotes/quotePaymentsSummary.ts`
- `src/components/atomic-crm/quotes/QuotePaymentsSection.tsx`
- `src/components/atomic-crm/ai/InvoiceImportDraftPaymentSection.tsx`
- `src/components/atomic-crm/ai/PaymentDraftCard.tsx`
- `supabase/functions/_shared/invoiceImportExtract.ts`
- `supabase/functions/_shared/invoiceImportConfirm.ts`
- test collegati

### Docs/continuity

- `docs/CANTIERE.md`
- `docs/architecture.md`
- `docs/development-continuity-map.md`
- `docs/historical-analytics-handoff.md`
- `docs/historical-analytics-backlog.md` se la review implementazione conferma
  impatto AI/backlog.

## Task 0 - Preflight e baseline read-only

1. Verificare `git status --short --branch`.
2. Verificare RAG status se passa molto tempo o dopo edit strutturali:
   `mcp__qdrant.get_index_status`.
3. Verificare health prod corrente read-only:
   `npm run health:financial`.
4. Salvare le figure baseline rilevanti:
   - Da incassare attuale;
   - Aidone in open clients;
   - cassa 2023;
   - pendingPaymentsTotal anno corrente.

Stop: se `health:financial` fallisce per cause non collegate, non applicare DB
remoto prima di capire se il baseline e' affidabile.

## Task 1 - RED DB/view/status

Creare controllore SQL versionato prima della migration.

File candidato:

- `scripts/check-uncollectible-receivables.sql`

RED atteso sullo stato attuale:

- constraint non contiene `perso`;
- colonne `writeoff_date` / `writeoff_reason` assenti;
- `project_financials` e `client_commercial_position` non hanno
  `total_written_off`;
- Aidone `FPA 1/23` non e' `perso`;
- Aidone contribuisce ancora a `balance_due`.

Comando previsto:

```bash
npx supabase db query -f scripts/check-uncollectible-receivables.sql
```

Se il comando richiede stack locale non avviato, usare il test SQL come
controllore documentato e farlo passare dopo `make start` / reset locale nel
gate dedicato.

## Task 2 - GREEN DB migration + seed

Migration additiva:

1. `ALTER TABLE payments ADD COLUMN IF NOT EXISTS writeoff_date DATE`.
2. `ALTER TABLE payments ADD COLUMN IF NOT EXISTS writeoff_reason TEXT`.
3. Drop/recreate `payments_status_check` includendo `perso`.
4. Add CHECK `status <> 'perso' OR (writeoff_date IS NOT NULL AND
   btrim(writeoff_reason) <> '')`.
5. Add CHECK `status <> 'perso' OR payment_type <> 'rimborso'`.
6. Recreate `project_financials` con:
   - `canonicalized_writeoffs`;
   - `total_written_off`;
   - `balance_due = total_owed - total_paid - total_written_off`.
7. Recreate `client_commercial_position` con la stessa semantica.
8. Update deterministico Aidone:
   - match stretto per `invoice_ref = 'FPA 1/23'`, amount 375, status attuale
     `scaduto`, client Comune Aidone;
   - set `status = 'perso'`;
   - set `writeoff_date = DATE '2026-06-22'`;
   - set motivo esplicito;
   - non modificare `amount`, `payment_date`, `payment_type`, `invoice_ref`,
     `financial_document_id`.

Seed:

- aggiornare `supabase/seed_domain_data.sql` per includere le colonne o mantenere
  un post-seed versionato equivalente;
- la riga Aidone nel rebuild locale deve risultare `perso`.

GREEN:

- controllore SQL passa;
- type generation non richiesta se types sono manuali, ma `types.ts` va
  aggiornato nello stesso commit;
- nessun dato di cassa cambia.

## Task 3 - RED/GREEN tipi e helper stato

Creare helper espliciti per evitare altri `status !== ricevuto` impliciti.

File candidato:

- `src/components/atomic-crm/payments/paymentStatus.ts` oppure estensione di
  `paymentTypes.ts`.

API prevista:

- `isCollectedPaymentStatus(status)`;
- `isOpenReceivablePaymentStatus(status)` -> `in_attesa | scaduto`;
- `isWrittenOffPaymentStatus(status)` -> `perso`;
- `isCashNeutralPaymentStatus(status)` -> `in_attesa | scaduto | perso`.

Aggiornare:

- `types.ts`;
- `paymentTypes.ts`;
- semantic registry via `paymentStatusChoices`;
- export label CSV.

Test:

- helper statuses;
- label "Credito perso";
- status choices includono `perso`.

## Task 4 - Dashboard, scaduti, health

RED:

- `dashboardDeadlineTrackerModel.test.ts` con payment `perso` datato nel passato
  non deve uscire in overdue o dueSoon.
- `PaymentOverdueBadge.test.tsx` deve aspettarsi filtro che non conta `perso`
  (`status@in` stringa `"(in_attesa,scaduto)"` se supportata, oppure full-view
  query + filtro locale controllato).
- `dashboardAnnualModel.test.ts` o test mirato: pending totals escludono `perso`.
- `check-prod-financial-health` testabile via helper o script review: pending
  anno esclude `perso` e reporta write-off.

GREEN:

- `DashboardDeadlineTracker.tsx`: fetch solo stati aperti (`in_attesa`,
  `scaduto`), non `status@neq ricevuto`.
- `dashboardModel.ts`: pending/alerts/forecast escludono `perso`.
- `PaymentOverdueBadge.tsx`: conta solo crediti aperti scaduti.
- `scripts/check-prod-financial-health.mjs`: pending esclude `perso`; controlla
  Aidone write-off; stampa `Crediti persi` separato.

## Task 5 - Fatture e void

RED:

- `financialDocumentHelpers.test.ts`: `perso` -> "Credito perso", non "Scaduta".
- test fallback doc storico: doc Aidone senza FK + payment perso stesso
  client/ref -> stato "Credito perso"; `scaduto` senza FK resta neutro.
- `invoiceVoidRules.test.ts` e `_shared/invoiceVoid.test.ts`: `perso` non e'
  voidable.

GREEN:

- Estendere `DocumentCollectionState` con tone `written_off` o equivalente.
- Aggiungere helper per scegliere i pagamenti di stato documento:
  - primary: linked by `financial_document_id`;
  - fallback: solo `status === 'perso'` con `client_id + invoice_ref`.
- Usare helper in list/show fatture.
- EF `invoiceVoid` rifiuta `perso` come stato non gestito/non annullabile; non
  cancellare payment `perso`.

Nota: non collegare Aidone via `financial_document_id` in questa tranche.

## Task 6 - Pagamenti UI/UX

RED:

- test `PaymentShow`: con status `perso` non mostra "Registra pagamento" e non
  mostra "Invia sollecito"; mostra data/motivo write-off.
- test `PaymentInputs`: selezionando `perso`, data/motivo diventano visibili e
  richiesti.
- test list/badge: `perso` mostra "Credito perso".

GREEN:

- Badge colore distinto e sobrio, non rosso scaduto.
- Form:
  - status select include `Credito perso`;
  - campi `writeoff_date` e `writeoff_reason` solo per `perso`;
  - usare `todayISODate()` / helper dateTimezone per default, non
    `toISOString().slice(0,10)`.
- Show:
  - box audit write-off;
  - CTA operative nascoste;
  - link esistenti a cliente/progetto/fattura preservati.
- List/filter desktop/mobile:
  - filtro `Credito perso`;
  - export label corretto.

UI gate piu' avanti con `impeccable` e browser reale.

## Task 7 - Clienti, progetti, quote, AI/import

RED:

- `unifiedCrmReadContext.test.ts`: `perso` non entra in pending/overdue; se
  esposto, entra in sezione separata.
- `unifiedCrmFinancialSummaries` test o snapshot: `totalWrittenOff` mappato se
  disponibile.
- `quotePaymentsSummary.test.ts`: `perso` non incrementa received/pending/overdue,
  ma incrementa `writtenOffTotal` e chiude il remaining operativo.
- `invoiceImportConfirm.test.ts` / `invoiceImportExtract.test.ts`: `perso`
  non e' accettato/generato in import senza metadata.
- test `InvoiceImportDraftPaymentSection` se serve: choices import escludono
  "Credito perso".

GREEN:

- AI read context usa helper open status.
- `ClientFinancialSummary` mostra "Perso" se `total_written_off > 0`.
- `quotePaymentsSummary` aggiunge `writtenOffCount/Total`.
- AI/import non genera `perso` automaticamente.

## Task 8 - Docs/Cantiere

Prima del codice:

- aggiornare subito `docs/CANTIERE.md` con obiettivo attivo, spec, piano,
  review spec, review piano, gate aperti e prossima azione. Questo e' parte del
  commit documentale iniziale e non va rimandato alla chiusura.

Durante/alla fine delle tranche codice, aggiornare nello stesso commit del
codice:

- `docs/architecture.md`: nuovo stato `perso`, `total_written_off`, invarianti.
- `docs/development-continuity-map.md`: consumer, status helper, view semantics.
- `docs/historical-analytics-handoff.md`: impatto AI/dashboard se toccato.
- `docs/historical-analytics-backlog.md`: solo se resta follow-up.

Se la modifica tocca `supabase/functions/**`, ricordare:

- push non deploya Edge Functions;
- serve deploy Supabase manuale per function modificate dopo commit/push/apply.

## Task 9 - Review implementazione e browser UI

Review multidimensione prima dei gate finali:

- dominio;
- DB/RLS/schema;
- money/fiscalita';
- dashboard/AI;
- fatture/void/import;
- desktop/mobile;
- test/guardrail;
- governance/RAG;
- operativita'/rollback;
- confini commit/deploy.

UI/UX:

1. Leggere skill `impeccable` prima delle modifiche UI finali.
2. Avviare stack locale.
3. Browser reale desktop:
   - lista pagamenti filtro `Credito perso`;
   - show Aidone;
   - edit pagamento, dropdown stato, campi write-off;
   - dashboard "Da incassare"/scaduti;
   - fattura Aidone stato "Credito perso".
4. Browser reale mobile:
   - stessa sequenza su viewport mobile;
   - aprire sheet/filtri/dropdown;
   - verificare testi non sovrapposti.
5. Console browser: 0 errori bloccanti.

## Task 10 - Deploy/apply remoto

Solo dopo test locali e review:

1. C1 read-only remoto:
   - trovare Aidone target;
   - verificare una sola riga pagamento;
   - verificare cassa baseline;
   - verificare saldo pre-writeoff.
2. Dry-run transazionale con rollback:
   - applicare migration/data update in transazione o script equivalente;
   - controllare C3 atteso;
   - rollback.
3. Apply:
   - `npx supabase db push --yes` se migration pronta;
   - deploy Edge Functions modificate se presenti.
4. Post-apply:
   - `npm run health:financial`;
   - smoke mirati se richiesti;
   - verificare Aidone fuori da "Da incassare" e cassa invariata.

## Commit strategy

Commit 1:

- spec + piano + Cantiere se serve bloccare il nuovo obiettivo.

Commit 2:

- DB migration + seed + DB/type controllori + docs correlate.

Commit 3:

- dashboard/fatture/AI/business helpers + test + docs correlate.

Commit 4:

- UI pagamenti/clienti/mobile + browser evidence + docs correlate.

Se una tranche diventa troppo grande, spezzare per superficie, ma mai committare
codice senza la documentazione companion richiesta dal pre-commit.

## Stop point

Fermarsi se:

- C1 Aidone non individua una riga unica;
- la migration non e' replayable da zero;
- il seed locale non puo' essere riallineato;
- `perso` finisce in qualunque calcolo cash/fiscal;
- il browser mostra azioni di incasso/sollecito su un credito perso;
- il piano review trova una superficie critica non coperta.

## Review piano

Esito: PASS dopo correzione v2.

Dimensioni controllate:

- Dominio: PASS. Il piano implementa `perso` come chiusura operativa, non cassa.
- DB/RLS/schema: PASS. Nessuna nuova tabella; colonne e constraint additivi;
  RLS invariata. Da verificare in implementazione: nome reale constraint
  `payments_status_check` sul DB live.
- Money/fiscalita': PASS. RED/GREEN copre `total_paid`, `total_written_off`,
  `project_financials`, `client_commercial_position`, health e cassa invariata.
- Propagazione consumer: PASS. Copre dashboard, scaduti, badge overdue,
  fatture, void, pagamenti, clienti, progetti, quote, AI/import.
- Test/guardrail: PASS. Ogni area critica ha RED prima; `health:financial`
  diventa controllore post-apply.
- Governance/RAG: PASS. Mappe lette; comandi principali presenti nelle mappe.
  Nota: per `status@in`, usare sintassi gia' verificata `"(a,b)"` o fallback
  full-view; non inventare filtro array.
- Operativita': PASS con fix. `docs/CANTIERE.md` va aggiornato prima del codice,
  non solo alla fine.
- UI/mobile: PASS come gate pianificato. Implementazione UI richiede skill
  `impeccable`, browser desktop/mobile e click su dropdown/sheet/modali.
- Commit/deploy: PASS. Commit piccoli; se `supabase/functions/**` cambia,
  deploy Supabase manuale dopo push/apply.
