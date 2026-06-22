# Cantiere Gestionale Rosario

Stato del documento: working
Ultimo aggiornamento: 2026-06-22

## Scopo

Questo file e' il ponte tra roadmap e lavoro concreto.

Serve a iniziare una nuova chat sapendo subito:

- dove siamo;
- qual e' la prossima cosa da fare;
- quali spec, piani e review sono attivi;
- quali controlli/RAG sono gia' stati fatti;
- quali stop point non vanno superati.

Non e' un archivio storico lungo. Se cresce troppo, spostare il dettaglio nei
documenti canonici o nei piani e lasciare qui solo stato corrente e prossima
azione.

## Quando Usarlo

- all'inizio di ogni nuova chat;
- prima di decidere la prossima azione;
- prima di implementare un piano;
- prima di chiudere un lavoro strutturato.

## Quando NON Usarlo

- non usarlo come fonte tecnica se codice, DB o migration dicono altro;
- non usarlo al posto della spec;
- non usarlo al posto del piano;
- non usarlo al posto delle query o dei test.

## Protocollo Di Ripartenza

Ordine minimo di lettura per ogni nuova chat:

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/CANTIERE.md`
4. roadmap/spec/piano attivi linkati qui sotto
5. documenti canonici collegati al lavoro corrente
6. code-RAG locale (skill `code-rag-local`, Qdrant) se il lavoro e' cross-file,
   rischioso o puo' avere superfici nascoste

Regola pratica:

- roadmap = direzione;
- cantiere = prossima azione;
- spec = cosa stiamo decidendo;
- piano = come lo eseguiamo;
- test/controllori = cosa impedisce regressioni;
- review = caselli obbligatori.

## Contratto Operativo Breve

- Parola d'ordine: deterministico.
- Prima si misura, poi si tocca.
- Se ci sono soldi o fiscalita', il test passa davanti a tutti.
- Spec e piano sono il biglietto d'ingresso.
- Ogni review e' un casello.
- Niente "mi pare": serve fonte reale.
- Se e' critico, il controllo nasce prima.
- Ogni spec, piano e implementazione richiede review multidimensione prima del
  gate successivo: dominio, DB/RLS, money/fiscalita', propagazione consumer,
  test, governance/RAG, operativita' e rollback.
- Ogni lavoro UI/UX richiede skill `impeccable`, preflight dichiarato, verifica
  in browser reale desktop e mobile, e controllo console prima di considerarlo
  chiudibile.
- Procedere per commit sensati: unita' piccole, reviewate, con codice e docs
  correlate nello stesso commit; niente commit misti con file fuori scope.

## Stato Corrente

Branch corrente:

- `main`. Tutto shippato e LIVE. Ultimi merge: #19 lista clienti `d6abf3f4`,
  QW3 `df78f9cb`, health check `6d77adde`, FIX-3-gemello `15e39713`,
  IMPORTANT-5 `a19f51f9`, QW2 `7d9a5f05`, FIX-3+4 `7c7ec1c1`. Lavorare in chat
  nuova: partire da QUI (autosufficiente).

## Obiettivo Persistente Da Perseguire

**Gestire end-to-end il caso LIVE SRLS / Gustare Sicilia in modo
deterministico, motivato e propagato solo dove serve.** Gli XML 2026 sono in
`Fatture/2026/`: `FPR 1/26` e `FPR 2/26` sono intestate a `LIVE - SOCIETA' A
RESPONSABILITA' LIMITATA SEMPLIFICATA`, mentre incassi, progetti e referente
Diego restano sotto `ASSOCIAZIONE CULTURALE GUSTARE SICILIA`. La decisione di
dominio e': Gustare resta il cliente/account operativo; LIVE diventa un profilo
di fatturazione collegato a Gustare, non un cliente operativo duplicato.

Spec attiva:
`docs/superpowers/specs/2026-06-22-client-billing-profiles-design.md`.
Piano persistente end-to-end:
`docs/superpowers/plans/2026-06-22-live-gustare-billing-profiles-end-to-end.md`.
Piano attivo:
`docs/superpowers/plans/2026-06-22-client-billing-profiles-backend.md`.

Sequenza obbligatoria:

1. **Backend contract.** Introdurre `client_billing_profiles`, collegare
   `financial_documents.billing_profile_id`, esporre i campi nella summary view,
   aggiornare health guard e preparare backfill 2026. Questa tranche stabilizza
   il contratto dati e non deve ancora propagare UI/emissione.
2. **Backfill controllato.** Solo dopo C1 read-only, dry-run transazionale,
   report all'utente e conferma esplicita, applicare il backfill 2026. Non
   cambiare `payments.amount`, `payments.status`, `payments.payment_date` o
   `payments.payment_type`.
3. **Integrazione applicativa.** Dopo backend verde e review, aprire una spec e
   un piano separati per propagare il modello alle superfici necessarie:
   gestione profili in UI cliente, scelta profilo in bozza fattura,
   `invoice_emit`, XML, PDF, eventuale import/backfill, lista/show fatture,
   mobile parity, dashboard solo se serve mostrare l'intestatario, AI/semantica
   solo se il profilo viene esposto alla chat.

Regole operative non negoziabili:

- Prima di ogni modifica a codice, migration, script applicativo, DB locale o
  remoto, commit, push o deploy: informare l'utente con file esatti, motivo,
  impatto e gate previsti.
- Ogni spec richiede review multidimensione prima del piano.
- Ogni piano richiede review multidimensione prima dell'implementazione.
- Ogni implementazione richiede review multidimensione prima dei gate finali e
  prima del commit.
- Le dimensioni minime della review sono: dominio, DB/FK/RLS, money/fiscalita',
  propagazione consumer, desktop/mobile, AI/semantica se coinvolta, sicurezza,
  test/controllori, governance/RAG, operativita', rollback e confini di commit.
- Per soldi, fiscalita', fatture, pagamenti e backfill: TDD o controllore
  ripetibile prima della modifica produttiva.
- Usare code-RAG locale quando il lavoro e' cross-file, fiscale o puo' avere
  superfici nascoste; ogni claim RAG va verificato sul sorgente reale.
- Usare le mappe governance prima di proporre o usare comandi, variabili,
  workflow o artefatti coperti dai registri.
- Ogni fase UI/UX deve usare skill `impeccable`, caricare il contesto richiesto,
  dichiarare `IMPECCABLE_PREFLIGHT`, e passare verifica in browser reale desktop
  e browser reale mobile con console controllata.
- Procedere per commit sensati: una unita' logica reviewata per commit, codice e
  docs correlate nello stesso commit, nessun file fuori scope, nessun commit con
  gate o review aperti.

Backfill LAURUS no-doc: **APPLICATO su prod** (2026-06-22). Inseriti 3
`financial_documents` storici LAURUS da XML reali (`FPR 1/23`, `FPR 6/23`,
`FPR 1/24`) e collegati i 3 `payments` ricevuti esistenti via
`payments.financial_document_id`; cassa invariata. Gate remoto: C1
`OK_TO_APPLY` (3 mancanti / 3 pagamenti / €6120,08) → dry-run in transazione con
rollback → APPLY → C3 `OK` (`docs_present=3`, `linked_payments=3`,
`remaining_targets=0`, `docs_multi_payment=0`) → `health:financial` PASS
(`LAURUS no-doc backfill missing/link gaps: 0`) → `smoke:ef-reminder-parity`
PASS 9.005,91. Il backfill 2026 e' ora gated dalla spec billing profiles.

Backfill 2026 LIVE/Gustare + LAURUS: **APPLICATO su prod** (2026-06-22 sera).
Migration remota `20260622200209_client_billing_profiles.sql` applicata con
`npx supabase db push --yes` dopo dry-run pulito. C1 read-only:
`client_count_mismatches=0`, `live_operational_client_count=0`,
`live_profile_count=0`, `ambiguous_docs=0`, `missing_docs=5`,
`existing_docs=0`, `ambiguous_full_payments=0`, `linkable_full_payments=0`,
`verdict=OK_TO_APPLY`. Dry-run APPLY dentro transazione con rollback: nessun
errore, C1 rimasto invariato. APPLY remoto reale: eseguito senza errori. C3:
`live_profile_count=1`, `docs_present=5`, `live_docs_without_profile=0`,
`docs_with_multiple_received_payments=0`, `verdict=OK`. `health:financial` PASS:
LIVE non esiste come cliente operativo, `FPR 1/26` e `FPR 2/26` sono documenti
Gustare con profilo LIVE, cassa invariata (`Cassa incassata 2026: € 7689.23`,
`pendingPaymentsTotal 2026: € 0.00`, `payments emit-linked: 28 doc`).

Review retroattiva backend/backfill 2026-06-22:

- Dominio: PASS. Gustare resta cliente operativo; LIVE e' profilo fatturazione,
  non cliente; Diego/progetti/incassi restano sotto Gustare.
- DB/FK/RLS: PASS dopo fix seed. La migration e' additiva; la view
  `financial_documents_summary` mantiene client/supplier e aggiunge campi
  billing profile; `client_billing_profiles` ha RLS autenticata. BLOCK trovato:
  `supabase/seed_domain_data.sql` era stale rispetto al prod applicato; fix:
  seed rigenerato dal dump remoto 2026-06-22 con `client_billing_profiles`.
- Money/fiscalita': PASS. Backfill documenti/profili non modifica
  `payments.amount`, `payments.status`, `payment_date` o `payment_type`; gli
  importi incassati 2026 restano invariati.
- Propagazione: FLAG non bloccante per backend. UI, invoice emit, XML/PDF,
  import e mobile restano volutamente fuori dal commit backend e richiedono spec
  + piano + review + browser desktop/mobile dedicati.
- Governance/RAG: PASS. RAG locale usato/reindicizzato e mappe governance lette;
  claim critici verificati su migration, SQL, seed e health reale.
- Processo: FLAG. Review e commit sono stati iniziati tardi; correzione
  obbligatoria: nessuna UI prima di review documentata, gate e commit sensati.

Integrazione applicativa billing profiles — spec/piano gate 2026-06-22:

- Spec:
  `docs/superpowers/specs/2026-06-22-billing-profiles-application-integration-design.md`.
- Piano:
  `docs/superpowers/plans/2026-06-22-billing-profiles-application-integration.md`.
- Review spec: PASS dopo fix. RAG pre-review ha trovato una lacuna reale su
  `InvoiceImportDraftBillingSection`, `_shared/invoiceImportConfirm.ts` e
  `invoice_import_confirm/index.ts`; la spec e' stata corretta prima di
  considerarla valida.
- Review piano: PASS dopo fix. RAG piano ha trovato `dataProviderInvoiceEmit.test.ts`
  non incluso e assenza di test provider import; il piano ora include il test
  provider emit e crea `dataProviderInvoiceImport.test.ts`.
- Task 1 adapter recipient: IMPLEMENTATO e review PASS. RED:
  `invoiceBillingRecipient.test.ts` falliva per modulo mancante. GREEN:
  `npm run test -- src/components/atomic-crm/invoicing/invoiceBillingRecipient.test.ts`
  PASS 2 test; `npm run typecheck` PASS; `git diff --check` PASS. Scope:
  helper puro `invoiceBillingRecipient.ts` + `InvoiceDraftInput.billingProfile`,
  zero UI, zero DB, zero cash.
- Task 2 XML/PDF/validation: IMPLEMENTATO e review PASS. RED:
  `invoiceDraftXml.test.ts` falliva per `CessionarioCommittente` ancora sul
  cliente operativo e `invoiceBillingValidation.test.ts` falliva per profilo
  ignorato. GREEN:
  `npm run test -- src/components/atomic-crm/invoicing/invoiceDraftXml.test.ts src/components/atomic-crm/invoicing/invoiceBillingValidation.test.ts`
  PASS 71 test; `npm run typecheck` PASS; `npm run lint` PASS;
  `git diff --check` PASS. Scope: stesso recipient adapter per XML, PDF e
  validation; nessun cambio a payments/importi/cassa e nessun redesign.
- Task 3 emit/provider/Edge persistence: IMPLEMENTATO e review PASS. RED:
  `runEmitInvoice` non inviava `billingProfileId`; `invoiceEmit` non validava
  blank/null e `buildFinancialDocumentInsert` non scriveva `billing_profile_id`.
  GREEN:
  `npm run test -- src/components/atomic-crm/invoicing/useEmitInvoice.test.ts src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.test.ts supabase/functions/_shared/invoiceEmit.test.ts`
  PASS 36 test; `npm run typecheck` PASS; `git diff --check` PASS. Scope:
  payload opzionale + FK documento; idempotenza, absorb incasso e importi
  invariati. Nota deploy: `supabase/functions/invoice_emit` toccata, quindi
  serve deploy Supabase manuale dopo commit/push finale.
- Task 4 selector bozza fattura: IMPLEMENTATO e review UI/UX PASS con
  Impeccable. `InvoiceDraftDialog` carica `client_billing_profiles`, mostra
  `Intestatario fattura` solo se esistono profili, mantiene default sul cliente
  principale se nessun profilo e' `is_default`, e usa `selectedDraft` per
  validation, emit, PDF e XML. Browser reale Chrome PASS desktop 1280x900 e
  mobile 390x844; screenshot: `test-results/billing-profile-selector-desktop-dialog.png`
  e `test-results/billing-profile-selector-mobile-dialog.png`. Fix incluso:
  niente UUID finto in query disabled, selector mobile troncata, tabella dentro
  scroll orizzontale del dialog.
- Task 5 gestione profili in scheda Cliente: IMPLEMENTATO e review UI/UX PASS
  con Impeccable. `ClientShow` mostra gli intestatari fiscali collegati dentro
  l'area Fatturazione, dopo i dati fiscali del cliente operativo; `CreateSheet`
  e `EditSheet` permettono create/edit del resource `client_billing_profiles`
  senza creare un cliente LIVE. Browser reale Chrome PASS desktop 1280x900 e
  mobile 390x844; screenshot: `test-results/client-billing-profiles-desktop-section.png`,
  `test-results/client-billing-profiles-desktop-sheet-settled.png`,
  `test-results/client-billing-profiles-mobile.png`. Console errors bloccanti:
  0. Review: dominio PASS, mobile PASS, RLS/provider path PASS, money/cash
  invariant PASS.
- Task 6 superfici Fatture list/show: IMPLEMENTATO e review UI/UX PASS con
  Impeccable. `FinancialDocumentListContent` mantiene la controparte operativa
  come valore primario e aggiunge `Intestatario: ...` solo quando la summary view
  espone `billing_profile_*`; `FinancialDocumentShow` distingue `Cliente
  operativo` e `Intestatario fiscale` con label/nome legale e identificativi
  disponibili. RED/GREEN:
  `npm run test -- src/components/atomic-crm/invoices/FinancialDocumentListContent.test.tsx`
  PASS 5 test; `npm run typecheck` PASS; `npm run lint` PASS. Browser reale
  Chrome PASS desktop 1280x900 e mobile 390x844 su lista/show con fixture
  locale `FPR BROWSER LIVE/26`; screenshot:
  `test-results/invoices-billing-recipient-list-desktop.png`,
  `test-results/invoices-billing-recipient-show-desktop.png`,
  `test-results/invoices-billing-recipient-list-mobile.png`,
  `test-results/invoices-billing-recipient-show-mobile.png`. Nessun cambio a
  pagamenti, importi, export o filtri.
- Task 7 import fatture/profile matching: IMPLEMENTATO e review PASS. RED:
  matching LIVE profile assente in `applyInvoiceImportWorkspaceHints`, provider
  import senza `client_billing_profiles`, conferma server senza validazione
  profilo/cliente. GREEN:
  `npm run test -- src/lib/ai/invoiceImport.test.ts src/components/atomic-crm/providers/supabase/dataProviderInvoiceImport.test.ts supabase/functions/_shared/invoiceImportConfirm.test.ts`
  PASS 21 test; `npm run typecheck` PASS; `npm run lint` PASS. Browser reale
  Chrome PASS desktop 1280x900 e mobile 390x844 su Importa fatture con
  estrazione LIVE intercettata e workspace locale reale; screenshot:
  `test-results/invoice-import-billing-profile-desktop-profile.png`,
  `test-results/invoice-import-billing-profile-mobile-clean.png`. Review:
  dominio PASS, fiscalita'/cassa PASS, Edge validation PASS, UI/mobile PASS,
  governance/RAG PASS. Nota: `billingProfileId` serve solo a risolvere/validare
  il cliente operativo nell'import; non viene persistito su `payments`.
- Stop point: prossima tranche Task 8, cioe' full gates, deploy manuale
  `invoice_emit` + `invoice_import_confirm`, review finale e commit/deploy
  verificati.

Governance/RAG fix 2026-06-22:

- audit rifatto con code-RAG + prose-RAG separati; finding reale: il code-RAG
  recuperava `.claude/settings.json` nonostante la policy code-only;
- fix applicato: `.contextignore` versionata come policy repo-locale di corpus,
  `npm run rag:policy:check` come guardrail statico, full reindex code-RAG e
  smoke query vietata su `.claude/**` verde;
- fix infra applicato su Qdrant MCP locale: estensioni `.mjs`/`.cjs` incluse nel
  code-RAG, cosi' i guardrail in `scripts/*.mjs` sono recuperabili;
- governance CLI avviata: `scripts/cli_inventory.py` genera
  `docs/cli/COMMAND_REGISTRY.json` + `docs/cli/COMMAND_MAP.md`, e
  `npm run governance:cli:check` verifica il drift;
- governance variabili avviata: `scripts/variable_inventory.py` genera
  `docs/variables/VARIABLE_REGISTRY.json` + `docs/variables/VARIABLE_MAP.md`,
  e `npm run governance:variables:check` verifica il drift;
- governance workflow avviata: `scripts/workflow_inventory.py` genera
  `docs/workflows/WORKFLOW_REGISTRY.json` + `docs/workflows/WORKFLOW_MAP.md`,
  e `npm run governance:workflows:check` valida ogni comando contro il CLI
  registry e ogni input contro il variable registry;
- governance artifact avviata: `scripts/artifact_inventory.py` genera
  `docs/artifacts/ARTIFACT_REGISTRY.json` + `docs/artifacts/ARTIFACT_MAP.md`,
  e `npm run governance:artifacts:check` valida producer/check contro il CLI
  registry, consumer contro il workflow registry, source variables contro il
  variable registry e policy dei secret;
- hook governance installato: `.husky/pre-commit` esegue
  `npm run governance:precommit`, che passa i quattro check in ordine canonico
  e blocca registri generati aggiornati ma non staged;
- regola d'uso: le mappe governance sono bussola anti-invenzione per comandi,
  variabili, workflow e artefatti; per claim critici vanno sempre confermate
  sulla fonte reale.
- triage markdownlint aggiunto: `docs/doc-quality/MARKDOWNLINT_TRIAGE.md`
  classifica i finding L2 in `problem`, `review` e `noise`; non e' un hard
  gate finche' il debito stilistico storico non viene ridotto o configurato.

### Sessione 2026-06-22-ter (CHIUSA, prod apply) — backfill LAURUS no-doc da XML reali

Scope eseguito: solo le 3 fatture storiche LAURUS con XML gia' presenti nel repo.
Le fatture 2026 erano fuori scope in quel momento; ora gli XML sono presenti ma
sono gated dal modello `client_billing_profiles`.

- Spec aggiornata: `docs/superpowers/specs/2026-06-20-missing-invoices-backfill-design.md`
  corretto `due_date` da `<DataScadenzaPagamento>` (non sempre `issue_date`:
  FPR 6/23 scade 2023-11-24, FPR 1/24 scade 2024-02-29).
- Piano: `docs/superpowers/plans/2026-06-22-missing-laurus-invoices-backfill.md`.
- Controllori/versionati: `scripts/backfillMissingInvoicesDecider.ts` +
  `scripts/backfillMissingInvoicesDecider.test.ts` (8 test, RED→GREEN) e
  `scripts/backfill-missing-laurus-invoices.sql` (C1/APPLY/C3).
- Prod read-only prima: 6 no-doc totali, di cui 3 LAURUS storiche e 3 2026
  allora senza XML disponibile. C1 LAURUS: `missing_docs=3`, `existing_docs=0`,
  `unlinked_payments=3`, `target_cash_sum=6120.08`, `verdict=OK_TO_APPLY`.
- Dry-run: blocco APPLY eseguito dentro `begin; ... rollback;`, poi C1 rimasto
  invariato (`OK_TO_APPLY`), quindi nessuna scrittura lasciata dalla prova.
- Apply remoto: inseriti i 3 documenti e linkati i 3 incassi. C3:
  `docs_present=3`, `linked_payments=3`, `remaining_targets=0`,
  `docs_multi_payment=0`, `verdict=OK`.
- Guardrail ricorrente: `scripts/check-prod-financial-health.mjs` ora controlla
  che i 3 target LAURUS non regrediscano; `npm run health:financial` PASS con
  `payments emit-linked: 28 doc` e `LAURUS no-doc backfill missing/link gaps: 0`.

Prossima azione aggiornata: gli XML 2026 sono arrivati, ma non applicare il
vecchio backfill finche' non e' gestito il profilo di fatturazione cliente.
Seguire la spec billing profiles, poi rifare C1→dry-run→APPLY→C3 sul 2026.

### Sessione 2026-06-22-quater (SPEC/PIANO, 0 codice) — LIVE come profilo fatturazione

Trigger: l'utente segnala che LIVE SRLS e' "sempre lo stesso cliente in pratica",
cioe' Gustare/Diego, ma alcune fatture sono state intestate a LIVE.

Misura:

- XML 2026 presenti: `FPR 1/26` e `FPR 2/26` intestate a LIVE, `FPR 3/26` e
  `FPR 4/26` intestate LAURUS, `FPR 5/26` intestata Gustare.
- Stato DB gia' misurato: nessun cliente LIVE; Diego Caltabiano referente
  primario/amministrativo di Gustare; progetti 2026 sotto Gustare.
- Codice: `Client` ha un solo profilo fiscale; `financial_documents` non salva
  snapshot destinatario; XML usa direttamente `draft.client`.

Decisione tecnica proposta:

- `client_id` resta ancora operativa/commerciale.
- Aggiungere backend-only `client_billing_profiles`.
- Collegare le fatture a un profilo tramite
  `financial_documents.billing_profile_id`.
- Non creare LIVE come nuovo cliente operativo in questa fase.
- V1 non modifica UI, emissione fattura, PDF/XML generator, dashboard, AI e
  fiscal model per non propagare una semantica non ancora stabilizzata.
- La fase successiva dovra' invece toccare le superfici necessarie, ma solo dopo
  il contratto backend e con spec/piano/review dedicati.

File creati:

- `docs/superpowers/specs/2026-06-22-client-billing-profiles-design.md`
- `docs/superpowers/plans/2026-06-22-client-billing-profiles-backend.md`

Stop point: nessun codice o migration senza informare prima l'utente.

### Sessione 2026-06-20-sexies (IN CORSO, pre-commit, 0 codice applicato) — fix-minori → pivot

Partita da "fix fiscali minori" (AQUACHETA +25%, bollo €2). Esito misura prod deterministica:

- **RAG :8001 RIGENERATO** sullo snapshot working `fde4d2a7` (clone canonico
  `rosariodavidefurnari_gestionale-rosario`, code-only, 0 errori embed, grounded sul codice
  nuovo). Vedi sezione RAG sotto per repo_url aggiornato. TODO owed chiuso.
- **AQUACHETA +25% e bollo €2 = NON-bug** (verificato prod): il +25% (465 vs 372, 312,50 vs 250)
  è cash reale Aruba ImportoPagamento (fonte-verità local-truth-rebuild), contenuto del tutto
  (balance_due AQUACHETA = 0). Il bollo €2 è separato dal total, fuori base forfettaria, non
  incassato dal cliente per scelta storica. Correggere = sbagliato (DOM-1/DOM-2). Report-only
  già deciso in BR2. Nessun fix.
- **Mistero Aidone risolto**: FPA 1/25 (fattura errata) → FPA 2/25 (nota di credito che la
  storna) → FPA 3/25 (rifatta, pagata €200). Le 2 "no-payment" sono CORRETTE → nessun backfill.
- **Falso allarme settlement (verify-before-fix)**: `financial_documents_summary.settlement_status`
  mostra tutte 28 fatture `overdue` perché legge `financial_document_cash_allocations` (vuota).
  MA quella colonna è **morta-per-design**: nessuna superficie la consuma (Show/lista/AI/e2e
  derivano lo stato dai `payments` FK). NON è un bug. Quasi scritta una spec per un non-problema.
- **2 spec draft prodotte** (0 review ancora, gate spec→codice utente):
  - `2026-06-20-missing-invoices-backfill-design.md` — backfill 6 fatture no-doc:
    Bucket A 3 storiche LAURUS (XML in repo, pronte: FPR 1/23, 6/23, 1/24, stesso-anno no
    shift cassa) + Bucket B 3 del 2026 (GUSTARE 1/26, 2/26 parziale, LAURUS 3/26, PENDING XML
    Aruba che l'utente fornisce in `Fatture/2026/`) + Bucket C Aidone non-issue. Σ no-doc 12.063,31.
  - `2026-06-20-fatture-list-collection-badge-design.md` — **Task 7b** badge incasso nella
    LISTA Fatture desktop+mobile (oggi solo lo Show ce l'ha), frontend-only via `getList` payments
    page-sized + helper `deriveDocumentCollectionState` riusato. NON tocca la colonna morta.

**Task 7b ESEGUITO (impl + verifica + 2 review, pre-commit):** badge stato incasso nella LISTA
Fatture (desktop tabella + card mobile), derivato dai `payments` FK col `deriveDocumentCollectionState`
già testato (NON dalla colonna morta `settlement_status`). Frontend-only: helper
`groupPaymentsByDocument` + `COLLECTION_TONE_CLASS` esportati, `useGetList('payments', perPage 1000)`
full-view + Map (pattern ClientList, NON `@in` malformato), `collectionState` in Row E MobileCard
(UI-7), colonna `collection` senza exportKey, neutro "—".
- Review spec v2 (4 revisori, gate v1 BLOCK→chiuso: `@in`→full-view Map, §2 corretto su
  `SupplierFinancialSection`, export, cella neutra, prop threading) + review impl (3 revisori, gate
  **PASS**, 0 BLOCK), ognuna RAG :8001 + sorgente.
- Verifica: typecheck/lint/prettier/build 0, **747 unit** (+11), e2e `invoices.smoke` (colonna +
  anti-leak verde), **browser WF-17** desktop+mobile (Incassata reale FT 1/25, 0 console errors).
- Residuo accettato 0-esposizione: prefs-merge `useColumnVisibility` non implementato (prod non ha
  prefs colonne Fatture salvate → colonna default-visibile; caveat #19 se l'utente salva prefs).
- Bug latente documentato (spec §12): `SupplierFinancialSection` consuma campi morti ma 0 doc inbound.
- Dettaglio: `docs/development-continuity-map.md` Update 2026-06-21.

**SHIPPED:** commit `f7fade2f` (codice + docs + spec, UNICO WF-6), push `origin`, CI `Check`
success sul fork, Vercel prod alias HTTP 200. Follow-up LAURUS no-doc chiuso il 2026-06-22
(vedi sessione ter sopra). I no-doc 2026 sono ora gated dal modello
`client_billing_profiles`, Fase 2, Scope C.

### Sessione 2026-06-20-quinquies (IMPL VERIFICATA, pre-commit) — Layer confronto Cassa vs Competenza data-fattura

Spec/piano: `docs/superpowers/specs|plans/2026-06-20-cash-vs-invoice-competence-reconciliation*`
(spec: 4 review fiscale/DB/frontend/TDD; piano: 2 review — tutte PASS/FLAG, 0 BLOCK, RAG
:8001+:8002 + sorgente). Decisione utente (AskUserQuestion): **"Layer confronto (no flip)"** —
la base fiscale legale resta CASSA; si aggiunge SOLO una vista read-only che riconcilia col
commercialista (competenza per `issue_date` via FK BR2). Coerente col FLIP in
`memory/project_fiscal_real_data_baseline.md`.

- **Helper puro** `dashboard/cashVsCompetenceReconciliation.ts`: riusa `getSignedPaymentAmount`
  + `isPaymentExcludedByTaxabilityDefaults` (ora `export` da `fiscalModel.ts`, additivo),
  ri-bucketa i payment ricevuti per `issue_date` del doc collegato (fallback cassa). Output
  GREZZO → conservazione `Σ cassa==Σ competenza`. Solo 2 cross-year su prod.
- **Card condivisa** `DashboardCashVsCompetenceCard.tsx` (prop `compact`), resa in
  `DashboardAnnual` + `MobileDashboard` (UI-7), dentro il blocco `data.fiscal`. Wiring FUORI
  da `data.fiscal`/`FiscalModel`: campo separato `cashVsCompetence` nel return di
  `useDashboardData` (fetch provider-first vista `financial_documents_summary` outbound).
- **Base legale INTATTA**: 0 migration, 0 EF, solo export. `fiscalParity` + `fiscalModel`
  test verdi; smoke `ef-reminder-parity` invariato 9.005,91.
- **Controllori**: unit helper falsificabili (cross-year fixture, conservazione property-test
  seeded, symbol-guard rimborso/rimborso_spese, esclusione, unlinked-fallback) — 8/8; parity
  mobile (componente reale, "per legge" + numeri + ponte) — 5/5; smoke prod
  `npm run smoke:cash-vs-competence` PASS (2024 competenza **9.240,18 ≈ Fabio 9.240**, ponte=2,
  Σ 52.657,02).
- **Verifica**: typecheck 0, build OK, **736/736** unit, ef-reminder 9.005,91, continuity OK.
  **Browser WF-17 desktop** (glance, locale + demo cross-year WF-19 + cleanup 0 leftover):
  card perfetta (tabella 2025/2026 Cassa|Data-fattura, copertura 63% "stima parziale", ponte
  "DEMO-CVC incassata 2026 emessa 2025", footer "Cassa = per legge"), **0 console errors**.
  Mobile-browser non eseguito (MCP chromium-1223 assente, glance no-resize) → coperto dal
  parity test (componente reale MobileDashboard).
- **SHIPPED**: commit `d1210726`, push `origin`, CI `Check` success, Vercel prod alias HTTP 200.
  TODO post-merge: reindicizzare il code-RAG (skill `code-rag-local`, Qdrant) sullo snapshot
  (richiesta utente standing; il code-RAG DeepWiki `:8001` e' DISMESSO dal 2026-06-21). Follow-up
  v2: entry manuale ricavo dichiarato Fabio (colonna Δ reale); esposizione AI/headless (BR3).

Coda residua (dopo questo): Fase 2 (verità remoto/locale/XML), Scope C (gated), minori
(bollo €2, anomalia AQUACHETA +25%, void-hardening source_path, 6 no-doc + 2 no-payment).

### Sessione 2026-06-20-quater (BR2 SHIPPED su prod) — backfill 25 link incassi↔fatture

Spec/piano: `docs/superpowers/specs|plans/2026-06-20-br2-payments-financial-documents-reconciliation*`.
Processo completo: RAG :8001 rigenerato su snapshot `1704a926` (code-only, validato) → ground-truth
prod deterministico → spec v3 → **3 tornate di review** (spec 5 revisori, piano 5, trasversale 6 —
16 passaggi, ognuno RAG+sorgente) → gate utente (U5-A link 25, U3-A script) → impl TDD.

- **BLOCK convergente intercettato dalla review**: collegare lo `scaduto FPA 1/23` lo avrebbe reso
  void-eligibile (`canVoidInvoiceFromPayments`) → "Annulla emissione" su fattura 2023 storica →
  cancellazione cassa reale. Fix: escluso (link 25, non 26). Cassa-integrity adversary review = PASS
  (nessun euro si muove: 0 viste leggono la FK, allocations 0 righe morte). DB-13.
- **Backfill**: `scripts/br2-link-payments-financial-documents.sql` (CTE match 1:1 fail-closed
  `client+trim(document_number)=trim(invoice_ref)` outbound customer_invoice + `status='ricevuto'`;
  apply DO-block con checksum cassa INV-1 pre==post + `RAISE` abort-on-mismatch). Applicato via MCP
  `execute_sql` su `qvdmzhyzpyaveniirsmo`. Dry-run prima (RAISE forzato → rollback, would_link=25).
- **Verde prod**: C1 RED 25/0 → APPLY → C3 GREEN (linked 25, residui 0, INV-2 uniq 0, scaduto NULL,
  allocations 0) → idempotenza 2ª run 0 → fiscale `smoke:ef-reminder-parity` 9.005,91 **0-delta** →
  `health:financial` PASS (`BR2a` floor linkedCount>=25, `BR2b` uniqueness 0). 41 unit (C5 decider +
  C4 void scaduto-solo + INV-6 badge), tsc 0, prettier OK.
- **Reversibile** (`ON DELETE SET NULL`). Nessuna Edge Function toccata, nessuna migration (FK
  esisteva da `20260616200000`). Frontend immutato → badge "Incassata" appare per-design sulle 25
  Fatture Show (INV-6, deriveDocumentCollectionState).
- **Rischi residui documentati** (non bloccanti): re-import futuro dei 25 sovrascrive `payment_date`
  con issue_date (shift cassa cross-year, lega a data-fattura/U4); bollo €2 + anomalia AQUACHETA
  +25% report-only; void-hardening `source_path` = follow-up U5-B. 6 no-doc + 2 no-payment = follow-up.

### Sessione 2026-06-20-ter (CHIUSA) — gate 2: deduzione-cassa anno selezionato su dichiarazione DEPOSITATA (DOM-4)

La deduzione su CASSA dell'imposta della STIMA dell'anno SELEZIONATO (`useDashboardData`) era gatata
su `obligations.length===0` → un BOLLO pagato la faceva scattare (DOM-4: stato semantico ≠ length),
deducendo un versato F24 PARZIALE per un anno aperto invece della competenza. Verificato su prod: il
2025 (dichiarazione NON depositata, totali 0) ha obblighi bollo+imposta+inps → la vecchia gate sommava
`3.382,09 €` cassa per la stima imposta 2025, invece di usare la competenza. Spec/piano:
`docs/superpowers/specs|plans/2026-06-20-selected-year-cassa-gate*`.

- Fix: funzione pura `resolveSelectedYearContributiVersatiCassa` gata su `isDeclarationClosed(declaration)`
  (lo STESSO segnale di D3). Anno aperto → `undefined` → competenza stabile; anno chiuso → cassa
  (D3 sovrascrive comunque la card; `redditoImponibile` diventa cassa-accurato).
- **ASIMMETRIA VOLUTA**: la memo `basisContributiVersatiCassa` (saldo, gate 1) resta su `length` —
  il saldo deduce l'INPS versato nel basis-year anche se non depositato; gate-1 9.005,91 INTATTO
  (smoke ri-verificato). Frontend-only: nessun EF, nessuna migration.
- TDD: RED→GREEN, helper test 5/5 falsificabile (mutazione: gate rimosso → 2 test rossi). 716 unit,
  typecheck/lint/continuity OK. 10 e2e dashboard (desktop+mobile, fiscal estimate, parità) verdi sul
  local stack reale (chromium-1208 del progetto, WF-21). **2 review multi-superficie** (fiscale+gate-1,
  frontend/mobile/TDD) con RAG :8001 + sorgente → entrambe **PASS**.

### Sessione 2026-06-20-bis (CHIUSA) — gate 1: EF reminder allineata alla card (DOM-5)

La EF `fiscal_deadline_check` calcolava il saldo ANCORA sulla stima-formula → il promemoria
WhatsApp/email avrebbe detto ~7.941 invece di 9.005,91. Ora il LAYER STIMA della EF è
allineato alla card. Spec/piano: `docs/superpowers/specs|plans/2026-06-20-ef-reminder-fiscal-parity*`.

- Portati lato Deno i 2 fix client (`9dc7f6c3` acconti reali + `41c655fc` imposta cassa):
  `buildFiscalReminderComputation` accetta `basisContributiVersatiCassa` + `priorBasisDeclaration`;
  helper puri mirrorati (`resolvePriorAdvanceScheduleInput`, `isDeclarationClosed`, `definitive*`
  in `_shared/fiscalDeadlineCalculation.ts`; `sumInpsContributionsPaidInYear` in nuovo
  `_shared/inpsContributionsPaid.ts`). EF `loadEstimateRealityInputs` fetcha dichiarazione
  `tax_year=anno-2` + obblighi/F24 `payment_year=anno-1` (stessa fetch del hook `useDashboardData`).
- Builder condivisi INTATTI → `fiscalParity.test.ts` verde (nuovo scenario falsificabile
  `schedule_realPriorAdvances_plus_cashImposta`, 2 mutazioni uccise). `total_inps` solo letto (DOM-8).
- TDD: RED→GREEN, 711 unit verdi, typecheck/deno check/lint/prettier/continuity OK.
- **4 review multi-superficie** (DB/Edge, fiscale forfettario, parità/frontend, TDD) ognuna con
  RAG :8001 + verifica sorgente → tutte **PASS** (1 FLAG non bloccante AC-7 chiusa col controllore).
- Controllore prod read-only versionato: `npm run smoke:ef-reminder-parity` →
  **9.005,91 €** sui dati prod reali (30/06 6.574,10 + 30/11 2.431,81; cassa 2025 = 3.382,09).
- SHIP: EF DEPLOYATA su `qvdmzhyzpyaveniirsmo` (script 934kB); liveness 401 unauth / 204 preflight.
  Learning DOM-5 aggiornato. Inerte per anni con obblighi certificati (overlay vince, DB-11).

### Sessione 2026-06-20 (CHIUSA) — schermata "Scadenze fiscali" corretta in 3 fix

Tutti su `main`, CI verde, Vercel. La card mostrava numeri sbagliati; ora mostra l'ESATTO.

- `3d1f23c5` — **guardrail "obblighi certificati" + pulizia**: card mostrava falso `11.100,60 €`
  "Da dichiarazione" (6 `fiscal_obligations` 2026 proiezioni hand-inserite 2026-04-14, metodo
  "aliquota effettiva" rigettato, `declaration_id` NULL/zero-totals, 0 F24). DELETE prod 6 righe
  (backup `*_backup_20260414`) + helper puro `selectCertifiedObligations` (client + mirror Deno)
  in `useFiscalReality` (card desktop+mobile) e nella EF `fiscal_deadline_check` (DEPLOYATA). DB-11.
- `9dc7f6c3` — **saldo su ACCONTI REALI**: il saldo sottraeva acconti STIMATI. Helper
  `resolvePriorAdvanceScheduleInput`: dichiarazione anno-2 CHIUSA → acconti dalla sua competenza
  (riusa D3), altrimenti fallback. Saldo INPS 2.839→3.571. DB-12.
- `41c655fc` — **imposta saldo su CASSA (LM035)**: `basisContributiVersatiCassa` (INPS versato
  cassa anno-1 dai F24) → imposta deduce su cassa, non competenza. Imposta saldo 486,50→571,12.

Builder fiscali condivisi + KPI INTATTI (`previousYearEstimate`/`buildFiscalPaymentSchedule`
solo schedule) → `fiscalParity.test.ts` verde. Mobile parità automatica (un solo hook
`useDashboardData`, UI-7). **Card finale: `9.005,91 €`** (30 giu 6.574,10 + 30 nov 2.431,81).
701 unit + typecheck + build + e2e fiscal desktop+mobile verdi; RAG :8001 multi-lente + sorgente PASS.
Baseline fiscale reale (dichiarazioni 2023/2024 AdE, formula validata all'euro, bug cassa/competenza
provato): memoria `project_fiscal_real_data_baseline.md`.

### Prossima azione — schermata "Scadenze fiscali" CHIUSA, 0 gate aperti

Schermata "Scadenze fiscali" completamente chiusa (3 fix card + gate 1 EF reminder + gate 2
selected-year cassa). Niente di aperto qui. Prossimo lavoro = scegliere dalla coda sotto:
**BR2** (incassi↔fatture, 0/31 payment linkati, delta bollo €2), **Fase 2** (verità remoto vs
locale vs XML), **Scope C** (/payments/create settle reale, gated a quando l'emissione da app è
in uso). Per ognuno: spec → review → piano → review → impl TDD → review impl → browser/verifica,
gate spec→codice deciso dall'utente.

Gate 1 (EF reminder, DEPLOYATO) e gate 2 (selected-year cassa) CHIUSI in questa sessione (vedi sopra).

**Ripartenza (chat nuova)**: leggi `AGENTS.md` → questo CANTIERE → `docs/historical-analytics-handoff.md`
(Update 2026-06-20 a/b/c/d/e) → memoria `project_fiscal_real_data_baseline.md`. Learning: DB-11, DB-12,
DOM-4, DOM-5.

Shippato e LIVE in sessioni precedenti (tutto su `main`, CI verde, Vercel):

- **#19** colonna "Da saldare" lista clienti (`d6abf3f4`): residuo per-cliente da
  `client_commercial_position.balance_due`, colonna desktop + riga mobile (UI-7),
  export esteso. Frontend-only, helper puro + e2e, 2+2 review PASS, WF-17 0
  errori console. Caveat: se nascosta da pref colonne, toggle una volta.
- **QW3** parità mobile (`df78f9cb`): `MobileAnnualDashboard` ora rende
  `DashboardCashFlowCard` (cassa 30gg) + `DashboardDeadlineTracker` (scadenzario)
  come desktop, current-year-gated. Frontend-only (UI-7), CI success sul fork,
  prod alias HTTP 200. Component test + e2e mobile; WF-17 0 errori console.
- **FIX-3+4** riconciliazione incasso atteso (`7c7ec1c1`): QuickPayment SALDA
  l'atteso collegato + invoice_emit ASSORBE l'atteso manuale (EF deployata,
  smoke prod GREEN). Decider `quickPaymentReconciliation.ts` + `_shared/invoiceEmit.ts`.
- **QW2** card "Da incassare" reale (`7d9a5f05`): da `pendingPaymentsTotal` (375) a
  Σ max(0,`client_commercial_position.balance_due`) cumulativo. Frontend-only.
- **IMPORTANT-5** (`a19f51f9`): descrizione AI `quick_payment` allineata (settle).
- **FIX-3-gemello** /payments/create (`15e39713`, scope A): card avviso
  `ExpectedPaymentOrphanHint` (display-only, create-only, riusa
  `wouldOrphanExpectedPayment`). Scope C (settle reale nel form) RIMANDATO a quando
  l'emissione da app è in uso reale (oggi esposizione prod = 0 fatture app-emesse).
- **Health check** (`6d77adde`): `npm run health:financial` read-only ripetibile.

## Regole di processo ATTIVE (questa fase — rispettare in chat nuova)

- **Gate spec→codice = decisione UTENTE** per ogni lavoro non banale: creare
  spec, review spec, piano, review piano, MA NON scrivere codice finché l'utente
  non dà il via esplicito. (Imposto su /payments/create, vale come default.)
- **RAG combinati, due motori su Qdrant `:6333` + Ollama `bge-m3` (1024-dim)**:
  per il CODICE skill `code-rag-local` (collezioni `code_*`, tool
  `mcp__qdrant__*` es. `search_code`); per PROSA/DOCUMENTI skill `prose-rag-local`
  (collezioni `prose_*`). DeepWiki `:8001` (codice) e deepwiki-prose `:8002`
  (prosa) sono DISMESSI dal 2026-06-21. Per QUESTO repo l'indice prosa dedicato
  ESISTE (collezione `prose_gestionale_docs` in Qdrant, `bge-m3` 1024-dim);
  reindex via `scripts/reindex_prose_rag_local.sh` (recipe `957c3025`).
  Disciplina corpus: codice
  solo in `code_*`, prosa solo in `prose_*`, MAI incrociati. Validazione
  doc↔codice via skill `doc-code-validation` (usa i due motori come oracoli, non
  un terzo indice).
- **Review non risparmiate**: multi-superficie + multi-competenza + trasversali,
  ognuna con RAG + verifica sorgente reale; impl review mutation-tested.
- **E2E/browser (WF-19)**: creare dati demo deterministici + cleanup sistematico
  in `finally` → 0 leftover. WF-17: browser desktop+mobile, 0 errori console.
- **Non ignorare errori/warning/cose storte** incontrati per strada.
- Il lavoro è stato sproporzionato vs valore su feature a esposizione zero:
  preferire fronti con impatto reale/quotidiano.

- Prettier: tech-debt CHIUSO. Root-cause risolta (`.lintstagedrc` formatta i TS,
  CI step `npm run prettier` BLOCCANTE) + sweep repo-wide a 0 drift; CI
  "Prettier (blocking)" verde. Vedi `docs/development-continuity-map.md` sezione
  "Tooling: formatting & lint enforcement".

Chiuso in questa tornata: QW1 — promemoria fiscali rianimati, SHIPPED e LIVE.

- Root cause: il cron `fiscal-deadline-check-daily` mandava `Bearer
  <service_role HS256>`, ma l'EF verifica via JWKS RS256 -> 401 "Unsupported
  alg" -> 0 promemoria (verificato su prod `net._http_response`).
- Fix: secret dedicato `CRON_SHARED_SECRET` (Vault + EF, NON service_role; Vault
  service_role NON ruotato perche' valido), helper `_shared/cronAuth.ts`
  fail-closed (gate `isCronAuthorized` else `AuthMiddleware`), notifiche
  idempotenti (marker `fiscal_reminder_notifications` scritto solo dopo invio
  riuscito, max 1 per `(deadline_key, channel)` -> no spam giornaliero).
- Review: spec v2 (BLOCK chiusa: no Vault rotation, key-space, anti-spam) +
  impl multi-superficie + RAG (FLAG chiusa: test `isCronAuthorized`, doc 30/06
  no-shift, `.env.example`). Tutte con RAG verificato sul sorgente.
- Smoke PROD: secret -> `200`, run1 4 task reali 30/06/2026 (2 f24 + 2 inps),
  run2 0 (idempotente), 0 notifiche (14gg > NOTIFY 7gg), bearer errato -> 401.
- SHIP: 2 migration (`db push`, history allineata), EF deployata
  (`qvdmzhyzpyaveniirsmo`), merge `main` (`e817934f`), CI `Check | push |
  success` sul fork. Vault `cron_shared_secret` creato (md5 == EF env).

Chiuso nelle tornate precedenti: BR1 — vista "Fatture" SHIPPED e LIVE.

- Spec v2.1 + piano v2: 3 review (2 esterne ChatGPT, review piano e review
  IMPLEMENTAZIONE multi-superficie), tutte con RAG e risolte.
- Esecuzione subagent-driven (12 commit, `7a414510`..`49fd44be`): helper+test,
  lista read-only, filtri (Tipo `@in` deterministico, selettore Anno), riepilogo
  direction-aware + multivaluta (set filtrato completo), show read-only, registry
  (resource read-only + AI capability), AI context
  (snapshot.financialDocuments whitelisted + caveat), prompt EF aggiornato,
  E2E smoke + controllori read-only.
- Verde: typecheck 0, build, 526 unit, E2E smoke. Review impl FLAG -> fix
  applicati (filtro `@in`, multivaluta, anti-leak settlement, route edit
  irraggiungibile, fixture controparte nulla).
- SHIP: EF `unified_crm_answer` deployata su prod; smoke AI PASSATO
  (fatturato netto 2025 = 1.300, nota credito sottratta, niente lessico di cassa);
  merge in `main` (`bdacd886`); Vercel Production `success`, alias
  `gestionale-rosario.vercel.app` HTTP 200. DB intatto (legge la vista
  `financial_documents_summary`, nessuna migration).
- Nota tech-debt (non BR1): 13 file con drift prettier pre-esistente su main
  (dashboard/invoicing/provider/fiscal) -> pulizia separata.

Chiuso in questa tornata (vedi storico sotto):

- TASK 5 (RLS backup fiscali) e TASK 4 (protezione cancellazioni: FK
  CASCADE->NO ACTION) IMPLEMENTATI, mergiati in `main` e LIVE su produzione
  (DB verificato via MCP; frontend Vercel deployment READY su `cb09ba8d`).
- Assessment esaustivo del gestionale completato:
  `docs/superpowers/2026-06-15-gestionale-assessment.md` (30 finding
  prioritizzati, ordine in 6 cicli, "cosa NON fare"). Da qui esce la coda
  lavori, di cui BR1 e' il primo big-rock scelto.
- ALLARME RISOLTO (QW1, 2026-06-16): i promemoria fiscali erano morti
  (`fiscal_deadline_check` 401, 0 task) per la scadenza reale 30/06/2026.
  Ora il cron autentica con `CRON_SHARED_SECRET`, smoke prod 200 + 4 task creati.

Fatto:

- creata roadmap generale:
  `docs/gestionale-roadmap-generale.md`
- aggiunte regole operative in `AGENTS.md`:
  - spec prima del piano;
  - review spec;
  - review piano;
  - review implementazione;
  - TDD su soldi/fiscalita';
  - determinismo;
  - controllori eseguibili;
  - Cantiere;
  - RAG prima delle review su lavori rischiosi/cross-file.
- aggiunta regola progetto:
  - migration sempre additive e indipendenti.
- creata spec RLS backup fiscali:
  `docs/superpowers/specs/2026-06-14-fiscal-backup-rls-hardening-design.md`
- creato piano RLS backup fiscali:
  `docs/superpowers/plans/2026-06-14-fiscal-backup-rls-hardening.md`
- interrogato DeepWiki/RAG dopo correzione del processo.
- ricevute review sub-agenti su:
  - copertura spec/piano/superfici;
  - sicurezza SQL/RLS;
  - migration history;
  - autosufficienza docs;
  - controllore RED.
- creati controllori:
  - `scripts/check-fiscal-backup-rls.sql`
  - `scripts/check-fiscal-backup-rest-anon.mjs`
- aggiunti script npm:
  - `npm run security:check:fiscal-backups`
  - `npm run security:check:fiscal-backups:rest`
- RED eseguito e confermato:
  - metadata/RLS fallisce con 4 tabelle target con RLS disabilitata;
  - REST anon fallisce con 4 risposte `206` e `Content-Range` positivo.
- creata migration locale:
  `supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- review implementazione sub-agente: `PASS` per applicazione mirata via
  `npx supabase db query --linked -f supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- applicato hardening remoto con:
  `npx supabase db query --linked -f supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- GREEN eseguito e confermato:
  - `npm run security:check:fiscal-backups` passa;
  - `npm run security:check:fiscal-backups:rest` passa;
  - REST anon ritorna `401` e nessun `Content-Range` per tutte e quattro le
    backup tables.
- verifica finale repo passata:
  - `make typecheck`
  - `npm run continuity:check`
  - `npx eslint scripts/check-fiscal-backup-rest-anon.mjs`
- aperta spec migration history:
  `docs/superpowers/specs/2026-06-14-migration-history-reconciliation-design.md`
- aperto piano migration history:
  `docs/superpowers/plans/2026-06-14-migration-history-reconciliation.md`
- DeepWiki/RAG interrogato per migration history; risultato parziale ma utile,
  verificato con `rg` e sorgente reale.
- query schema read-only eseguita: l'effetto fiscale poi canonizzato come
  `20260414192200` e l'hardening `20260614150557` risultano gia' presenti nello
  schema remoto (`ok = true` per tutti i check).
- limite sub-agenti emerso: `agent thread limit reached`; tutti i vecchi agenti
  risultano `completed`, ma il tool non espone un comando di chiusura ulteriore.
  Finche' il limite resta, review nuove vanno fatte inline o rinviate.
- Supabase MCP ufficiale:
  - skill ufficiali `supabase` e `supabase-postgres-best-practices` aggiornate
    da `https://github.com/supabase/agent-skills.git`;
  - server MCP corretto aggiunto come `supabase-gestionale`;
  - project ref corretto: `qvdmzhyzpyaveniirsmo`;
  - URL valido:
    `https://mcp.supabase.com/mcp?project_ref=qvdmzhyzpyaveniirsmo&features=database,docs,debugging,development,functions`;
  - configurazione pulita finale: rimosso il vecchio server globale
    `supabase` che puntava a `qivhseixrkoakywgwkal`; per questo repo resta un
    solo MCP Supabase, `supabase-gestionale`;
  - `.vscode/mcp.json` allineato allo stesso nome e URL;
  - errore corretto: era stato usato `qvdmzhyzpyaveniirsmos` (21 caratteri) e
    feature non valida `edge-functions`.
  - test MCP reale eseguito con `supabase-gestionale/execute_sql`:
    `select current_setting('server_version')` -> PostgreSQL `17.6`.
- MCP `supabase-gestionale/execute_sql` usato davvero tramite nuovo processo
  `codex exec`: la history remota contiene:
  - `20260414192200_fiscal_interests_and_compensation`
  - `20260614150557_harden_fiscal_backup_rls`
  - nessun `20260414211500`
- riconciliazione locale/remota applicata:
  - creato `supabase/migrations/20260414192200_fiscal_interests_and_compensation.sql`
    dal contenuto registrato nella history remota;
  - rimosso il timestamp locale fantasma
    `supabase/migrations/20260414211500_fiscal_interests_and_compensation.sql`;
  - registrato in `supabase_migrations.schema_migrations` il solo metadata
    della migration gia' applicata `20260614150557_harden_fiscal_backup_rls`;
  - nessun `db push`, nessun `db reset`, nessuna nuova modifica schema.

Non fatto:

- nessun codice applicativo modificato.

## Prossima Azione

**Ciclo 2 fiscale — formula reale SHIPPED e LIVE** (merge ff su `main` `f2924e96`,
CI `Check` success sul fork, Vercel prod alias HTTP 200, EF `fiscal_deadline_check`
deployata `qvdmzhyzpyaveniirsmo`, `npm run health:financial` = PASS dopo deploy).
Scoperta chiave (dalle dichiarazioni AdE reali di Rosario, SPID): la **formula
forfettaria standard è CORRETTA** e replica il commercialista al centesimo; il
problema NON era la formula ma i DATI. Oracoli reali: 2023 imposta 429 + INPS 2.249;
2024 imposta 233 + INPS 1.879. Il `total_inps` 3.667 in `fiscal_declarations` è il
TOTALE riconciliato (acconti+saldo), NON un bug — NON si tocca. I 3 numeri INPS
distinti: competenza (1.879) / versato-cassa (2.538, LM035, deduce l'imposta) / ciclo.

LIVE (4 commit, tutti verde + browser-verificato glance desktop, 0 console errors):
formula reale (`fiscalFormula.ts`, `inpsContributionsPaid.ts`, `aliquotaGs.ts` — 3
helper puri, oracoli verdi) + innesto in `buildFiscalYearEstimate` client+EF
(aliquota per-anno: 2023/2024 hardcoded verificati, 2025+ config; deduzione
cassa-fallback) + wiring F24→dashboard (single-source) + UI (card tasse mobile,
fix frizione `DashboardNetAvailabilityCard` Riserva-tasse 0→stima). Review impl
multi-superficie + RAG (2 PASS + 1 FLAG chiuso col parity sui rami nuovi). 672 unit.

**D3 SHIPPED 2026-06-19** (commit successivo a `e303ba08`): card anno-chiuso →
numeri REALI definitivi + pill `Definitivo`/`Stima`, desktop+mobile. Helper puro
`applyDefinitiveDeclaration` — INPS competenza = `total_inps − prior_advances_inps`
(verificato prod: 2023→2249, 2024→1879; `total_inps` ciclo NON toccato, DOM-8),
imposta = `total_substitute_tax` (2023→429, 2024→233); chiuso = totali>0 (2025-zero
→ stima). Override SOLO in `buildFiscalModel` (client+UI), formula condivisa client/EF
intatta (`fiscalParity.test.ts` verde). Controllori: helper test (oracoli),
`DashboardFiscalKpis.test.tsx` (pill), E2E `fiscal-definitivo.smoke.spec.ts`
(desktop+mobile reale + cleanup WF-19) + `fiscal-estimate.smoke.spec.ts` (formula INPS,
650,71/92,26). Browser-verificato desktop (glance, pill verde DEFINITIVO 1879/233) +
mobile (e2e viewport). 685 unit + 12 e2e verdi. **RAG rigenerati** (code :8001 clone
fresco GitHub, prosa :8002 token-safe — entrambi validati).

RIMANENTE per un prossimo ciclo (NON bloccante, documentato in backlog):
attribuzione **data-fattura** (serve BR2, oggi 0/31 payment linkati); D4 card
"prossima scadenza tutto compreso"; D5 confronto stima↔reale in
`DichiarazioneEntryDialog`; compensazioni F24 (`amount` negativo) senza test dedicato.

RIMANENTE (Fase 5-7, todo tracciati): wiring F24→dashboard (derivare
`contributiVersatiCassa` da `useFiscalReality`, single-source) · card UI (anno
chiuso → reali 2.112 non 3.900, label stima/definitivo, mobile parity, **usare
skill impeccable**) · attribuzione data-fattura (inerte finché BR2 non collega i
documenti: 0/31 payment hanno `financial_document_id`) · EF `fiscal_deadline_check`
(fetch declarations+F24) + deploy · review impl multi-superficie + RAG · browser
WF-17 + e2e. **Al merge: rigenerare entrambe le RAG** (richiesta utente) sullo
snapshot committato. Spec/piano: `docs/superpowers/specs|plans/2026-06-19-fiscal-estimate-calibration*`.

Per ogni nuovo lavoro: spec → review → piano → review → impl TDD → review impl →
browser WF-17, gate spec→codice deciso dall'utente.

- Cosa: colonna desktop "Da saldare" (ultima, destra, `tabular-nums`) + riga in
  `ClientMobileCard` (UI-7), da `client_commercial_position.balance_due`
  (canonico, no ricalcolo). Helper puro `clientBalanceCell.ts`. Export CSV esteso
  (`da_saldare`, full-view fetch, no `@in`). Frontend-only.
- Review: spec 2 (frontend PASS; data/TDD FLAG→risolte) + impl 2 (entrambi PASS),
  RAG :8001 + sorgente. Verde: typecheck/lint/build, 657 unit, e2e
  `client-list-balance.smoke` (valore reale 2984,50). WF-17 desktop+mobile 0
  errori console.
- Caveat post-deploy (R5/AC8): se la colonna è nascosta (pref colonne `clients`
  salvata), attivarla una volta da `ColumnVisibilityButton`.
- Follow-up LOW (non bloccanti, dai reviewer): se i clienti superano 1000 (cap
  perPage) un cliente oltre il cap mostrerebbe "—" pur avendo saldo; due
  formatter `eur` (helper + `ClientFinancialSummary`) — promuovere a util
  condivisa solo se nasce una 3ª superficie.
- Spec/piano: `docs/superpowers/specs|plans/2026-06-19-client-list-da-saldare-column*`.

Ciclo 2 fiscale (DIFFERITO su scelta utente): #3 imposta sostitutiva deduce INPS
stimato non-versato (vs regola cassa), #4 INPS sotto-stimata, #13 formula
duplicata client+EF (`fiscalModel.ts` + `_shared/fiscalDeadlineCalculation.ts`).
HIGH severity, money reale, intrecciato col layer dichiarazioni reali → spec
dedicata + grounding prod quando si riprende.

Fronti coda: BR2 (incassi↔fatture), Scope C (gated), Fase 2.

Storico QW3 (ciclo chiuso):

- Diagnosi (verificata su sorgente): `MobileAnnualDashboard` NON rendeva
  `DashboardCashFlowCard` (previsione cassa 30gg, #12) né `DashboardDeadlineTracker`
  ("Cosa devi fare", scadenzario, #11). Desktop le rende current-year-gated
  (`DashboardAnnual.tsx:128-132`). Dati già lato mobile
  (`useDashboardData` → `cashFlowForecast`/`alerts`). Parità UI-7, view-only.
- Fix: 1 file prodotto (`MobileDashboard.tsx`, +2 import +2 render condizionati,
  gating identico al desktop) + component test `MobileDashboard.parity.test.tsx`
  (falsificabile, gating current/past year) + smoke e2e
  `tests/e2e/mobile-dashboard-parity.smoke.spec.ts` (390px prima del login,
  mobile shell + entrambe le card + "Scaduti"/"Incassato"). Zero
  provider/EF/migration.
- Review: spec 2 revisori (frontend PASS; TDD FLAG→risolto) + impeccable `adapt`;
  impl 2 revisori (frontend/mobile PASS; TDD PASS, falsificabilità provata per
  MUTAZIONE: tolto wiring→RED, ripristinato). Tutte code RAG :8001 + sorgente.
- Verde: typecheck 0, lint 0, build, 650 unit, e2e mobile verde. WF-17 browser
  desktop+mobile: 0 errori console, layout pulito a 390px (summary scadenzario
  "Approccio Bambino" leggibile; riga scaduto tappabile, nome truncato come il
  componente desktop → accettato, no redesign).
- Spec/piano: `docs/superpowers/specs|plans/2026-06-19-qw3-mobile-scadenzario-cassa*`.
- Follow-up opzionale (LOW, non bloccante): nessun assert sull'importo cassa REALE
  su mobile nello smoke (il seed condiviso ha pagamenti tutti passati → inflows=0;
  toccare il seed = blast radius oltre QW3). Coperto dal data-flow del component test.

Coda lavori (ordine consigliato, ognuno spec→review→piano→review→impl):

- **QW3** mobile scadenzario + cassa — ✅ SHIPPED e LIVE (`df78f9cb`).
- **Scope C** /payments/create settle reale — SOLO quando l'emissione fatture da
  app sara' in uso reale (oggi esposizione 0); spec gia' pronta
  `docs/superpowers/specs/2026-06-19-payment-create-reconciliation-design.md`.
- **BR2** riconciliazione pagamenti/allocazioni + delta bollo €2.
- **Fase 2** "Verita' dati remoto vs locale vs XML".

Storno NON in capability registry AI (follow-up minore). Le 2 "storte" dev-only
note (StartPage setState non riproducibile, HMR localhost/127) NON valgono il
fix finche' non riproducibili.

--- (sotto: storico SHIP cicli chiusi, non azione corrente) ---

SHIP completato (storico FIX-3+4):

- EF `invoice_emit` deployata su prod (`qvdmzhyzpyaveniirsmo`, FIX-4); FIX-3 e'
  frontend (Vercel auto-deploy al merge).
- **Smoke PROD FIX-4 GREEN** (entita' usa-e-getta + cleanup completo, 0 leftover):
  emit con atteso manuale pre-esistente → `expectedPaymentAbsorbed:true`,
  `paymentId == atteso manuale`, nessuna riga nuova (1→1), 1 solo collegato
  `in_attesa`; void cleanup `paymentsDeleted:1`.
- Merge `main` (`7c7ec1c1`), push `origin`, CI `Check | push | success` sul fork,
  Vercel prod alias `HTTP 200`.

Verifiche locali (pre-merge): 632 unit, 7/7 e2e
(`invoice-void.smoke.spec.ts`: settle invariant a delta + absorb contro EF reali),
tsc 0, lint 0 errori, prettier clean, `deno check invoice_emit`, `continuity:check`.

Review: 4 pre-merge + 2 post-ship = **6 PASS** (DB/Edge, fiscale-cassa,
frontend/mobile, TDD; post-ship: money/Edge correctness + coverage/continuity).
Falsificabilita' provata (post-ship): iniettata regressione cassa-year nel RTL →
RED. FLAG chiuse: cassa-year lockata a clock congelato (WF-9); limite v1
void-after-absorb documentato in spec non-obiettivi (nessuna cassa persa).

Sintesi tecnica: due decider PURI (`projects/quickPaymentReconciliation.ts`,
`_shared/invoiceEmit.ts`) sul pattern `decideEmittedPaymentReconciliation` (match
per `financial_document_id`, SYSTEM-FIRST). FIX-3 = `QuickPaymentDialog` salda
l'atteso collegato (`useUpdate`, `payment_date` reale mai null/futuro, gate
`payment_type` B1, picker su >1 = ambiguous). FIX-4 = `invoice_emit` assorbe
l'atteso manuale (SELECT FOR UPDATE + UPDATE count-guard, PROJECT-LEVEL ONLY B2,
`expectedPaymentAbsorbed` nel result). Niente migration (FK da `20260616200000`).

Follow-up accodati (out-of-scope v1): flussi gemelli orfani `/payments/create`,
`client_create_payment`, `quote_create_payment` (stesso doppio conteggio se
incassano una fattura emessa da li'); IMPORTANT-5 AI registry (descrizione
`quick_payment` incompleta ma NON falsa). Limite v1: `invoice_void` cancella
l'atteso manuale assorbito (no ripristino, no cassa persa).

### Fatto in questa tornata (audit ciclo fatturazione, 2026-06-17)

- RAG re-embeddato su snapshot corrente (`eeb342fb`); audit 4 revisori: **cassa
  fiscale CLEAN**, 5 superfici sfuggite (veri positivi).
- **FIX-1** (void lasciava stale services/dashboard su mobile) + **FIX-2** (badge
  "Fatturato" anche su desktop, UI-7) SHIPPATI: `700bc0be`, CI verde, Vercel.
  Controllore falsificabile `voidInvoiceSurfaces.test.ts` (WF-18).
- Coda audit dopo FIX-3+4: IMPORTANT-5 (AI capability registry non conosce void +
  snapshot pendingPayments non collega balance_due), MINOR (bollo €2,
  import-dopo-void re-link services, ExpenseList badge/filter, flussi gemelli I5).

### Ultimo ciclo chiuso: invoice_void (Annulla emissione) — LIVE

Azione di dominio reversibile su `FinancialDocumentShow` (EF transazionale
`invoice_void`): cancella documento + incasso atteso e riporta lavori/spese a
"Da fatturare". Mai cancella un incasso `ricevuto` (409); mai tocca Aruba/SDI.

Pivot post review impl (FLAG, 2 veri positivi):

- **A** mancava controllore committato sul money path → `tests/e2e/invoice-void.smoke.spec.ts`
  (EF reali via HTTP + assert REST), 5/5: happy+FK-link, refuse-collected 409,
  idempotent, FK-scoped over-clear+DB-8, allocations-guard 409 + no-CASCADE.
- **B** over-clear: un-mark per `invoice_ref` string → reso SIMMETRICO all'emit
  per FK `financial_document_id` su `services`+`expenses` (migration
  `20260617120000`, no backfill: prod ha 0 fatture app-emesse). emit la popola,
  void smarca per FK; twin-guard rimosso (cade il falso-409 `issue_date`).
  Storici/omonimi (FK NULL) mai toccati; km da trigger esclusi (DB-8).
- WF-17 browser (UI smoke desktop+mobile 2/2, 0 console errors); fix
  `handleVoid` redirect-first (niente refetch del doc cancellato).

SHIP: migration `20260617120000` su prod via `db push` (history allineata,
registrata); EF `invoice_emit`+`invoice_void` deployate (`qvdmzhyzpyaveniirsmo`);
smoke prod emit→void GREEN (service reale ripristinato NULL/NULL, 0 residui);
merge `main` (`31e938e8`), CI run `success`, Vercel prod alias HTTP 200.
Re-review impl 4 revisori + RAG, FLAG chiusa col 5° controllore.

### Cicli chiusi e live precedenti

"Emetti fattura", QW1 e BR1 chiusi e live.

Coda lavori residua (ordine consigliato): QW2 card "Da incassare" (375 vs
6.412), QW3 mobile scadenzario+cassa, BR2 riconciliazione pagamenti/allocazioni,
bollo (Ciclo 5). Per ognuno: spec -> review -> piano -> review multi-superficie +
RAG -> esecuzione LOCALE prima del remoto.

BR3 (BIG-ROCK FUTURO, DIFFERITO, rischiosissimo) — **DB AI-driven headless**:
rendere il DB interrogabile da LLM esterni (connettore Supabase MCP di Claude
Desktop, agenti futuri) in modo SICURO e SEMANTICAMENTE CORRETTO, indipendente
dalla UI del CRM. Trigger: il connettore desktop su tabelle grezze ha risposto
"chi mi deve soldi" = 375 (1 riga `payments`) mentre il credito reale e' 7.131,37
(vista `client_commercial_position.balance_due`, verificato su prod). Candidati
NON decisi: (A) ruolo Postgres read-only limitato alle viste canoniche
(`client_commercial_position`, `project_financials`, `financial_documents_summary`,
`analytics_*`) con grezzi negati via GRANT/RLS; (B) layer semantico MCP/Edge che
ritorna risposte di dominio curate; (C) catalogo semantico sulle viste. Rischi:
DB prod, RLS/grant, dati fiscali esfiltrabili, eventuali path di scrittura.
Solo appuntato (2026-06-19) — spec+piano dedicati prima di toccare alcunche'.

Follow-up aperti di "Emetti fattura" (documentati in development-continuity-map +
backlog): Task 7b badge incasso in LIST desktop + card mobile (tocca infra
colonne); rigenerazione completa tipi `_shared/db.ts` (drift services insert in
invoice_import_confirm); test E2E Playwright del doppio re-import (oggi smoke
manuale ripetibile); v2 acconto pregresso / quote-service come sorgenti /
storno; delta bollo €2 come residuo (BR2).

### Ultimo ciclo chiuso: Emetti fattura (invoice_emit) — LIVE

Azione "Emetti e scarica XML" dal dialog bozza (progetto/cliente): registra
`financial_documents` (outbound) + crea incasso ATTESO `payments` (`in_attesa`,
cassa-neutro) + marca `services`/`expenses` (`invoice_ref`) + scarica XML
FatturaPA, in un'unica transazione (EF `invoice_emit`, pre-flight idempotente,
count guard). Re-import dell'XML emesso: riconciliazione STATUS-AGNOSTIC ancorata
a `payments.financial_document_id` -> ri-settla lo stesso incasso, NIENTE
doppioni (provato in PROD: emit -> re-import x2 = 1 doc + 1 payment ricevuto,
poi cleanup). 3 review multi-superficie + RAG (spec/piano/impl, ogni ciclo una
BLOCK reale chiusa). Migration additiva `20260616200000`
(`payments.financial_document_id` FK ON DELETE SET NULL) su prod; EF
`invoice_emit` + `invoice_import_confirm` + `invoice_import_extract` deployate
(ref `qvdmzhyzpyaveniirsmo`); merge `main` (`1eaef0d0`), CI verde sul fork.

### Ultimo ciclo chiuso: QW1 (Fiscal Reminder Cron Auth) — LIVE

Cron `fiscal-deadline-check-daily` autentica ora con `CRON_SHARED_SECRET`
dedicato (Vault + EF, NON service_role). Helper `_shared/cronAuth.ts`
fail-closed, notifiche idempotenti (`fiscal_reminder_notifications`). Smoke prod:
secret -> 200, 4 task reali 30/06/2026, idempotente, 0 spam, bearer errato 401.
Migration `20260616182600` + `20260616182718`, EF deployata, merge `main`
(`e817934f`), CI verde sul fork. Vault `service_role_key` NON ruotato (valido).

### Ultimo ciclo chiuso: TASK 4 (Fiscal Cascade Protection) — LIVE

FK `CASCADE -> NO ACTION` su financial_documents/projects/services/quotes + UX
delete pessimistic. Mergiato in `main` (`cb09ba8d`) e live: DB verificato via MCP
(4 FK `NO ACTION`, 0 orfani), Vercel production `READY`, alias `HTTP 200`.
Artefatti: spec/piano `2026-06-14-fiscal-cascade-protection*`, migration
`20260614185413_harden_cascade_protection_fiscal.sql`, controllore
`scripts/check-cascade-protection.sql` (`security:check:cascade-protection`),
UX `delete-button.tsx` + `misc/blockedDeleteOnError.ts`. 3 review
multi-superficie con RAG (spec BLOCK, piano FLAG, impl BLOCK), tutte risolte.

Guardrail di processo aggiunto: hook `UserPromptSubmit` in `.claude/settings.json`
(RAG attivo + review multi-superficie obbligatori) + trigger `WF-15` in
`.claude/rules/learning.md`.

TASK 5 (RLS backup) e TASK 4 (cascade protection) chiusi e live. Prossima azione:
BR1 (vista Fatture, in corso). Fase 2 roadmap ("Verita' dati remoto vs locale vs
XML") resta piu' avanti nella coda.

Stato verifiche finali ultimo ciclo (TASK 4):

- `npm run security:check:fiscal-backups` passa
- `npm run security:check:fiscal-backups:rest` passa
- `npm run continuity:check` passa
- `make typecheck` passa
- Vercel production `READY` su commit `cb09ba8d`, alias production `HTTP 200`

## Lavoro Attivo

Tema:

- Nessun ciclo attivo.
- chiusi e live: QW1 (cron auth promemoria fiscali), BR1 (vista Fatture),
  TASK 4 (cascade protection), TASK 5 (RLS backup).

Artefatti BR1:

- assessment sorgente coda lavori:
  `docs/superpowers/2026-06-15-gestionale-assessment.md`
- spec BR1:
  `docs/superpowers/specs/2026-06-16-fatture-view-design.md`
- piano BR1: da creare (writing-plans) dopo review utente spec.

Artefatti storici (cicli chiusi):

- roadmap:
  `docs/gestionale-roadmap-generale.md`
- spec TASK 4:
  `docs/superpowers/specs/2026-06-14-fiscal-cascade-protection-design.md`
- piano TASK 4:
  `docs/superpowers/plans/2026-06-14-fiscal-cascade-protection.md`
- controllore TASK 4:
  - `scripts/check-cascade-protection.sql`
  - `npm run security:check:cascade-protection`
- migration TASK 4:
  `supabase/migrations/20260614185413_harden_cascade_protection_fiscal.sql`
- spec TASK 5:
  `docs/superpowers/specs/2026-06-14-fiscal-backup-rls-hardening-design.md`
- piano TASK 5:
  `docs/superpowers/plans/2026-06-14-fiscal-backup-rls-hardening.md`
- controllori TASK 5:
  - `scripts/check-fiscal-backup-rls.sql`
  - `scripts/check-fiscal-backup-rest-anon.mjs`
- migration TASK 5:
  `supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- spec/piano Fase 2:
  da creare prima di modificare dati, schema o flussi fiscali.

## RAG / Code-RAG

> **MIGRAZIONE 2026-06-21**: i motori DeepWiki sono DISMESSI — code-RAG `:8001`
> e deepwiki-prose `:8002`. Due motori, entrambi su Qdrant (`:6333`) + Ollama
> `bge-m3` (1024-dim), mai blendare i corpora: per il CODICE skill
> `code-rag-local` (collezioni `code_*`, tool `mcp__qdrant__*`); per
> PROSA/DOCUMENTI skill `prose-rag-local` (collezioni `prose_*`). Validazione
> doc↔codice via skill `doc-code-validation` (oracoli i due sopra, non un terzo
> indice). I riferimenti a `:8001`/`:8002` nelle sessioni datate qui sotto sono
> record storici (RAG usato in quella data), NON istruzioni correnti.

Motore corrente (CODICE) — skill `code-rag-local`:

- Qdrant (`:6333`) + Ollama `bge-m3` (1024-dim), chunking AST tree-sitter
- tool: `mcp__qdrant__*` (es. `search_code`, `index_codebase`, `reindex_changes`)
- runtime sotto Node 22 (nvm), NON Node 25 di sistema
- corpus CODE-ONLY di default (`.md`/`.markdown` esclusi dal server patchato →
  niente drift doc↔codice; segreti `.env` gia' esclusi)
- dopo ogni (re)index verificare 0 embed rifiutati
  (`docker logs qdrant --since 10m | grep -c ' 400 '` deve essere 0)
- index/reindex + troubleshooting (dimension mismatch, embed abortiti,
  Qdrant/Ollama/SSD down) → seguire lo skill `code-rag-local`
- conclusione: il code-RAG resta supporto, non fonte di verita'. Ogni file o
  claim suggerito dal RAG va verificato sul sorgente reale prima di implementare,
  concludere review o dichiarare "fatto".

Prosa/documenti (separato) — skill `prose-rag-local`: Qdrant (`:6333`) + Ollama
`bge-m3`, collezioni `prose_*`. Per QUESTO repo l'indice prosa dedicato ESISTE:
collezione `prose_gestionale_docs` in Qdrant (`bge-m3` 1024-dim); reindex via
`scripts/reindex_prose_rag_local.sh` (recipe `957c3025`).

Query eseguite:

- riferimenti a `fiscal_*_backup_20260414` e pattern `_backup_YYYYMMDD`
- superfici esistenti per Supabase security, RLS, migration, continuity check e
  guardrail

Risultato utile:

- RAG non ha trovato consumer runtime applicativi delle tabelle backup fiscali;
- ha segnalato come superfici da verificare:
  - provider fiscale;
  - test fiscali/dashboard;
  - supporto E2E;
  - migrations;
  - scripts;
  - continuity checks.

Verifica sul sorgente reale prima dei controllori:

- `rg` ha trovato riferimenti backup solo in:
  `scripts/fiscal-reconciliation-2026-04-14.sql`
- quei riferimenti sono commenti di restore manuale, non consumer runtime;
- il runtime usa le tabelle reali:
  - `fiscal_declarations`
  - `fiscal_obligations`
  - `fiscal_f24_submissions`
  - `fiscal_f24_payment_lines`
  - `fiscal_f24_payment_lines_enriched`
- superfici runtime verificate:
  - `src/components/atomic-crm/providers/supabase/fiscalRealityProvider.ts`
  - `supabase/functions/fiscal_deadline_check/index.ts`
  - `supabase/migrations/20260402020254_fiscal_reality_layer.sql`
  - `supabase/migrations/20260414192200_fiscal_interests_and_compensation.sql`

Dopo i controllori, riferimenti backup attesi anche in:

- `scripts/check-fiscal-backup-rls.sql`
- `scripts/check-fiscal-backup-rest-anon.mjs`
- `package.json`

Questi sono guardrail, non consumer runtime.

## Review Sub-Agenti

Esiti ricevuti:

- spec/piano/superfici: `FLAG/BLOCK` finche' Cantiere e piano non venivano
  riallineati ai controllori e ai comandi REST;
- controllore RED: `BLOCK` verso migration finche' il controllore non copriva
  tabelle mancanti, privilegi effettivi e policy;
- security: `FLAG`, piano valido ma da rafforzare con `PUBLIC`, privilegi
  effettivi, policy e REST;
- implementazione: `PASS` per applicazione mirata via `db query`, con nota
  non bloccante di preferire REST `HEAD` per non scaricare righe;
- migration history: raccomandata Option A per riproducibilita' piena; applicata
  poi riconciliazione metadata dopo prove schema e verifica MCP.

Azioni applicate dopo review:

- controllore SQL rafforzato;
- controllore REST aggiunto e convertito a `HEAD`;
- piano aggiornato con comandi RED reali;
- Cantiere aggiornato.

## Gate Aperti

- [x] Review interna post-RAG della spec RLS.
- [x] Review interna post-RAG del piano RLS.
- [x] Decisione operativa su migration history: Option B per hardening
  immediato, niente `db push`.
- [x] Creare controllori RED prima della fix.
- [x] Eseguire RED e documentare fallimento atteso.
- [x] Creare migration minima locale.
- [x] Review implementazione.
- [x] Applicare fix minima via `db query`.
- [x] Verifica GREEN.
- [x] Aggiornare docs canonical coinvolti.
- [x] Eseguire verifica finale repo.
- [x] Aprire spec/piano per migration history reconciliation.
- [x] Sbloccare MCP Supabase corretto (`supabase-gestionale`).
- [x] Allineare localmente la migration fiscale al timestamp remoto reale
  `20260414192200`.
- [x] Eliminare il timestamp fantasma locale `20260414211500`.
- [x] Registrare in history remota il metadata della migration RLS gia'
  applicata `20260614150557`.
- [x] Verificare via MCP `supabase-gestionale/execute_sql` che la history
  remota contenga `20260414192200` e `20260614150557`, non `20260414211500`.
- [x] Eseguire giro finale guardrail + continuity + typecheck.

## Stop Point

Non procedere con DB remoto se:

- il code-RAG locale (skill `code-rag-local`, Qdrant) non e' stato usato per
  plan/review di lavori cross-file o ad alto rischio;
- qualcuno propone `npx supabase db push` senza prima verificare lo stato
  migration via MCP o CLI;
- non esiste un controllo RED prima della fix;
- il SQL proposto cancella dati o crea policy permissive;
- REST anon continua a leggere dati dopo la fix.
- un controllo finale fallisce dopo la riconciliazione.

## Regole Di Aggiornamento

Aggiornare questo file prima della risposta finale quando cambia:

- prossima azione;
- stato di spec/piano;
- esito RAG;
- esito review;
- test/controllore richiesto;
- decisione su migration;
- stop point;
- verifica finale.

Formato richiesto:

- mantenere il documento breve;
- lasciare una sola prossima azione chiara;
- non duplicare lunghi dettagli gia' presenti in spec o piano;
- linkare sempre il documento sorgente invece di riscriverlo tutto;
- segnare chiaramente se una review e' valida, invalida o da rifare.
