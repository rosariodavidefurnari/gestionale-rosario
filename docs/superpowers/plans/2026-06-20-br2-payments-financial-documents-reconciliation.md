# BR2 — Riconciliazione storica incassi ↔ fatture — Piano operativo

Data: 2026-06-20
Stato: **v2 — REVIEW PIANO MULTI-SUPERFICIE + RAG FATTA** (5 revisori: DB, fiscale,
frontend/mobile, provider/Edge, TDD; 1 BLOCK + 4 FLAG, TUTTI CHIUSI nel blocco
autoritativo sotto). Pronto per l'esecuzione **dopo via libera utente**.
Relazione con la spec:
`docs/superpowers/specs/2026-06-20-br2-payments-financial-documents-reconciliation-design.md`
(v2, gate DECISO: U5-A link **25** + escludi scaduto, U3-A SCRIPT, U1/U2/U4).

Gate spec→codice = decisione UTENTE: **nessun DB write / nessun apply** finché
l'utente non dà il via DOPO questo piano. Local-first.

## REVISIONE PIANO (post review multi-superficie + RAG) — AUTORITATIVA

Vince sul corpo. Verdetti: fiscale/frontend/provider/DB **FLAG**, TDD **FLAG+BLOCK**;
nessun data-harm (il backfill è corretto e reversibile). Correzioni recepite (tutte
su file:line verificati):

- **P1 (BLOCK, db+tdd) — il seed LOCALE è STALE, l'oracolo locale NON è 25.**
  `supabase/seed_domain_data.sql` (ultimo tocco `39fc47ff` 2026-03-08) ha **29
  payment** (28 ricevuto, 1 in_attesa, **0 scaduto**) e **40 doc** (31 outbound, 9
  inbound), ≠ prod (32/28/1-scaduto). Locale il CTE linkerebbe **28** (tutti i
  ricevuto matchano 1:1), niente scaduto da escludere. **FIX**: il rehearsal locale
  valida la **LOGICA dello script** (match 1:1 fail-closed, idempotenza,
  view-neutrality, esclusione non-ricevuto) con oracolo **derivato a runtime dal seed**
  (`eligible_count` qualunque sia, oggi 28), NON `==25`. L'oracolo **25 si pinna SOLO
  su prod** (C1 RED 25/0, C3 GREEN 25). Niente claim di determinismo locale sul 25
  (anti-WF-5: non indebolire l'oracolo per farlo combaciare col locale). Osservazione:
  il seed è driftato 3 mesi → refresh seed (`npx supabase db dump --data-only`) è un
  follow-up separato (blast radius E2E), NON parte di BR2.
- **P2 (FLAG db) — baseline-before/compare = SOLO locale.**
  `financial-baseline-before.sql`/`compare.sql` usano meta-comandi psql `\echo` e
  CREATE/DROP di tabelle helper (`_migration_baseline.*`) → incompatibili con MCP
  `execute_sql` (pure SQL) e SCRIVONO sul DB. Usarli SOLO sul path LOCALE psql (step
  4). Per la **view-neutrality su PROD**: query pura `information_schema.views ilike
  '%financial_document_id%'` (= 0, spec R3) + `npm run health:financial` (pure
  supabase-js SELECT). La FK è view-neutral per costruzione (0 viste la leggono;
  `20260401094930_single_source_financials.sql` filtra i payment solo per
  `status/project/client`).
- **P3 (FLAG fiscale) — C3-fiscal bindato a un runnable esistente.** Il "0-delta
  `buildFiscalYearEstimate`" non ha SQL equivalente. Riusare **`npm run
  smoke:ef-reminder-parity`** (`scripts/prod-smoke-ef-reminder-parity.ts`,
  `EXPECTED_TOTAL=9005.91`, esercita `buildFiscalReminderComputation →
  buildFiscalYearEstimate` con select payment FK-free) PRE e POST apply su prod →
  identico PASS = 0-delta. È strutturalmente garantito (la stima non legge la FK,
  `fiscalModel.ts:227-265`); il vero presidio è INV-1 (UPDATE solo `financial_document_id`).
- **P4 (FLAG tdd) — C2 auto-falsificante in-SQL, niente `.expected.txt` senza
  comparatore.** Non esiste harness che diffa output SQL vs file atteso. Ripiegare il
  footer di partizione in una **tabella in-SQL `CASE ... THEN 'OK' ELSE 'MISMATCH'`**
  (pattern `fiscal-reconciliation-2026-04-14.sql:264-286`): un singolo SELECT che si
  auto-falsifica su drift (`link=25 AND skip_scaduto=1 AND skip_no_doc=6 AND
  25+1+6=32 → OK`). Niente file esterno + diff manuale.
- **P5 (FLAG tdd) — `health:financial` floor, non magic-number.** `linkedCount` cresce
  a ogni emit reale (FIX-3/4) → `==25` darebbe false-FAIL al primo incasso da app, e
  in locale vale ~28/0. Usare **`linkedCount >= 25`** (floor BR2: i link storici non
  spariscono) nel guard ricorrente, + invariante unicità `HAVING count(*)>1 → 0`
  (genuino 0-anomaly). Il `==25` esatto solo come **acceptance one-shot post-apply**
  (non nel health ricorrente).
- **P6 (FLAG/MINOR convergente) — rischio residuo re-import sui 25 (NON bloccante).**
  Dopo backfill, i 25 ricevuto hanno FK NOT NULL → un FUTURO re-import del loro XML
  raggiunge il SETTLE branch (`invoice_import_confirm/index.ts:343,385-390`,
  status-agnostic) che fa `payment_date = documentDate` (= issue_date). Per fatture a
  cavallo d'anno (DOM-8 Gustare `FPR 10/23` emessa 29/12/2023, incassata 30/01/2024)
  sposterebbe la cassa 2024→2023. È un MIGLIORAMENTE vs oggi (oggi FK NULL → CREATE →
  doppione ricevuto), NON introdotto dal backfill (solo da un re-import futuro), fuori
  scope BR2 (lega a U4 data-fattura). **Documentare** in Rischi residui + learning;
  l'idempotenza è su STATUS+dedup, NON su `payment_date`.
- **MINOR (db) — join con `direction`.** Aggiungere al CTE `fd.direction='outbound'
  AND fd.document_type='customer_invoice'`: `document_number` è free-text condiviso
  tra direzioni (la UNIQUE è `(client_id,direction,document_number,issue_date)`,
  `20260302010500:31`; il seed ha 9 inbound) → senza filtro un doc inbound omonimo
  fail-closerebbe un link reale.
- **MINOR (db) — run-protocol multi-statement.** MCP `execute_sql` ritorna solo
  l'ULTIMO resultset. C1/C2 (read-only) come **call SEPARATE PRIMA** dell'apply (RED
  mostrato); UPDATE+C3 come call di apply che finisce in **un solo** SELECT di verifica
  (BEGIN/COMMIT supportato, pattern fiscal-reconciliation).
- **MINOR (frontend) — C4 caso `[scaduto]`-solo + reclassify C4/INV-6.** Aggiungere
  l'assert esatto `canVoidInvoiceFromPayments(outbound, [pay('scaduto')]) === true`
  (lo scenario reale FPA 1/23; oggi i test coprono solo `[in_attesa,scaduto]`
  insieme). **C4/INV-6 pure-fn ESISTONO GIÀ e passano** (30 test verdi) e il backfill
  NON tocca quelle funzioni → sono **test di DOCUMENTAZIONE** (razionale esclusione
  scaduto / badge per-design), NON gate RED→GREEN. Il vero RED/GREEN di INV-6 è lo
  **step browser WF-17** (badge assente pre → "Incassata" post sui 25). Mutation test
  onesto: rimuovere `status='ricevuto'` dal CTE → **C1/C3 RED** (NON C4, che è pure-fn).
- **MINOR (frontend) — lista Fatture invariata.** `FinancialDocumentListContent` +
  mobile card leggono solo `financial_documents_summary` (0 fetch payments) → il badge
  collection esiste SOLO su `FinancialDocumentShow.tsx:210` → backfill **invisibile in
  lista** per-design. WF-17 va fatto sul detail Show.
- **MINOR (provider) — branch flip data-driven.** `invoice_import_confirm` per i 25
  passa da CREATE a SETTLE puramente dal dato (`:343 WHERE financial_document_id IS NOT
  NULL`): nessun redeploy (BE-1 non scatta), è il miglioramento R4 voluto. Citazioni
  spec corrette (`projects/quickPaymentReconciliation.ts`, `src/lib/ai/unifiedCrmReadContext.ts`).

## REVISIONE 2 (transversal, post-richiesta utente) — AUTORITATIVA

6 revisori trasversali (closure, coerenza spec↔piano, **cassa-integrity adversary**,
superfici-mancate, determinismo local↔prod, esecuzione/TDD). **0 BLOCK**; tutti i
prior findings (B1-B5, P1-P6) confermati CHIUSI su file:line; **cassa-integrity PASS**
(tracciato backfill→viste→re-import→void→emit→cash_movements→allocations: nessun euro
si muove/duplica/sparisce, sicuro per costruzione). Hardening recepiti:

- **T1 (FLAG, money) — controllore INV-1 eseguibile.** Le colonne cassa
  (`amount/status/payment_date/stamp_amount/total_amount`) erano protette SOLO da
  ispezione visiva dell'UPDATE → viola EXECUTABLE GUARDRAILS per DOM-1. **FIX**:
  nell'apply, dentro la stessa transazione, catturare un aggregato cassa dei 25 id
  PRIMA dell'UPDATE (`sum(amount), count per status, max(payment_date),
  sum(stamp_amount via doc), sum(total_amount via doc)`) e asserirlo IDENTICO dopo,
  nella tabella C3 OK/MISMATCH. Mutation: aggiungere `, status='ricevuto'` al SET →
  C3 RED.
- **T2 (FLAG, exec) — abort-on-MISMATCH transazionale.** Il verdetto C3 era
  reporting-only (nessun `RAISE`/`ROLLBACK`) → un risultato a sorpresa committava
  comunque. **FIX**: avvolgere l'apply in un `DO`/funzione che `RAISE EXCEPTION` se
  `post-UPDATE linked != (SELECT count(*) FROM eligible)` o se l'aggregato cassa T1
  differisce → ROLLBACK automatico. Difesa-in-profondità oltre al C1 RED pre-gate +
  CTE idempotente bounded.
- **T3 (FLAG, determinism) — decider puro C5 PROMOSSO (non più opzionale).** I 3 rami
  di sicurezza (scaduto→skip, 2-match→skip-ambiguous, inbound-omonimo→skip-no-outbound)
  NON sono triggerati da alcun dato né in seed né in prod → l'unico modo deterministico
  di testarli è un'unit pura. **FIX**: `decidePaymentDocumentLink(payment, docs)` →
  `link|skip(reason)` con fixture falsificabili per i 3 rami. Correggere anche il
  claim di mutation FALSO del piano v2 ("rimuovere direction='outbound' → collisioni
  inbound locale": sui dati seed i 9 inbound NON sono omonimi di alcun `invoice_ref`
  → no-op; la mutation reale vive nell'unit C5, non sul seed).
- **T4 (FLAG, missed-surface) — nominare 3 superfici neutre nella spec.** I 2 registry
  AI (`crmCapabilityRegistry.ts:194`, `crmSemanticRegistry.ts:474`) referenziano la FK
  in PROSA descrivendo il flusso settle-by-FK (resta corretto post-backfill: i 25
  storici rientrano nello stesso ramo già descritto = R4/P6) → nessuna stringa da
  cambiare; e `financial_documents_summary` (`settled_amount`/`settlement_status` da
  `financial_document_cash_allocations`, **0 righe prod = colonna morta**, MAI dalla
  FK) → backfill-neutro. Vanno ENUMERATE (spec table diceva "0 ref": vero solo per il
  context builder runtime, non per i registry). Tutte verificate NEUTRE.
- **T5 (MINOR) — chiarire oracolo C2 prod-pinned vs locale runtime.** Le costanti
  `25/1/6/32` della tabella verdetto C2 sono PROD-pinnate allo snapshot 2026-06-20 →
  C1/C2 verdetto girano SOLO su prod; in locale girare solo l'eligible-count con
  oracolo runtime (28 sul seed), non la partizione pinnata. + cassa-adversary:
  P6 è un TRADE (commercial-duplicate → fiscal-date-shift cross-year), non un
  "miglioramento netto"; aggiungere assert `allocations row-count = 0` a C3 (hardening).
- **T6 (doc-align)**: spec `==25`→`>=25` (health ricorrente, ==25 solo acceptance
  one-shot); spec "Decisioni aperte" → marcare U5=A DECISO + U5-B follow-up; spec riga
  181 `db query --linked`→MCP/psql; nota C5 promosso; cite void delete FK-scoped.

## Obiettivo del piano

Collegare i **25** payment `ricevuto` ai rispettivi `financial_documents` outbound via
`payments.financial_document_id`, con SCRIPT committato idempotente, ciclo RED→GREEN
verificabile, report in-SQL auto-falsificante, controllori riusati, zero impatto su
viste/dashboard/fiscale, scaduto `FPA 1/23` ESCLUSO. Nessuna Edge Function toccata.

## Ciclo RED → GREEN (MONEY/FISCAL TDD)

- **RED (prod read-only, prima dell'apply)**: C1 conta 25 collegabili (`ricevuto`,
  outbound 1:1, FK NULL) e 0 collegati. Committato e MOSTRATO rosso. +
  `npm run smoke:ef-reminder-parity` = 9.005,91 (baseline fiscale).
- **GREEN (post-apply, prod)**: 25 collegati, 0 residui, 2ª run 0 righe, INV-2 unicità
  0, view-neutrality (information_schema.views=0 + health linkedCount>=25), 0-delta
  fiscale (smoke parity ancora 9.005,91), scaduto NULL.
- **REFACTOR**: solo dopo verde.

## File coinvolti

NUOVI:

- `scripts/br2-link-payments-financial-documents.sql` — sezioni delimitate
  (pattern `fiscal-reconciliation-2026-04-14.sql`), eseguite UNA PER VOLTA via MCP
  `execute_sql` (P-run-protocol):
  1. **CTE `eligible`** = `payments p` JOIN `financial_documents fd` ON
     `fd.client_id=p.client_id AND trim(fd.document_number)=trim(p.invoice_ref) AND
     fd.direction='outbound' AND fd.document_type='customer_invoice'`, WHERE
     `p.financial_document_id IS NULL AND p.status='ricevuto'`, con guardia 1:1
     simmetrica (`NOT EXISTS` di un 2° match su entrambi i lati → fail-closed).
  2. **C1 (read-only, call separata)**: `eligible` count (prod atteso 25) +
     `financial_document_id IS NOT NULL` count (atteso 0).
  3. **C2 report in-SQL (read-only, call separata)**: 1 riga per payment
     (`payment_id, invoice_ref, doc_id|null, decision, reason, flag_div25, flag_bollo`)
     + tabella verdetto `CASE WHEN link=N_eligible AND skip_scaduto=… AND skip_no_doc=…
     AND somma=32 THEN 'OK' ELSE 'MISMATCH'` (auto-falsificante, no file esterno).
  4. **APPLY transazionale con abort (T1+T2)**: `BEGIN;` → cattura aggregato cassa
     dei 25 id in una temp/CTE (`sum(amount), count per status, max(payment_date),
     sum(stamp_amount)/sum(total_amount) via doc`) → `UPDATE payments SET
     financial_document_id = eligible.doc_id` solo righe `eligible` (INV-1: SET con la
     SOLA colonna FK) → `DO`/funzione che `RAISE EXCEPTION` (→ ROLLBACK) se
     `linked != count(eligible)` OPPURE l'aggregato cassa post ≠ pre → verify SELECT
     (PRIMA di `COMMIT`, ordine come `fiscal-reconciliation-2026-04-14.sql:75,264,288`)
     → `COMMIT;`.
  5. **C3 verify** (l'unico resultset della call apply): linked=25 (prod),
     remaining_eligible=0, uniqueness `count>1`=0, scaduto `FPA 1/23` = NULL,
     **aggregato cassa pre==post (INV-1)**, allocations row-count=0, tabella `OK/MISMATCH`.
- `scripts/br2-link.decider.test.ts` (o estendere) — **C5 (T3) decider puro**
  `decidePaymentDocumentLink(payment, docs)` → `link|skip(reason)`: fixture
  falsificabili per i 3 rami di sicurezza che né seed né prod triggerano (scaduto→skip,
  2-match→skip-ambiguous, inbound-omonimo→skip-no-outbound, ricevuto+1-match→link).

MODIFICATI:

- `scripts/check-prod-financial-health.mjs` — assert `linkedCount >= 25` (floor, non
  ==) + uniqueness `count(financial_document_id)>1 → 0`. Esteso `npm run health:financial`.
- `src/components/atomic-crm/invoices/invoiceVoidRules.test.ts` — aggiungere l'assert
  C4 mancante `canVoidInvoiceFromPayments(outbound, [pay('scaduto')]) === true`
  (documenta perché lo scaduto è escluso) + `[pay('ricevuto')] === false` (se non già).

RIUSATI (no modifica):

- `scripts/financial-baseline-before.sql` + `compare.sql` → SOLO locale (P2), psql.
- `scripts/prod-smoke-ef-reminder-parity.ts` (`npm run smoke:ef-reminder-parity`) →
  0-delta fiscale pre/post (P3).
- `financialDocumentHelpers.test.ts` (INV-6 badge, GIÀ verde — test di documentazione).

DOCS (stesso commit — COMMIT GATE):

- `docs/development-continuity-map.md` — BR2 (link storico 25, scaduto escluso,
  void-gap latente + rischio residuo re-import payment_date, lista invariata).
- `docs/historical-analytics-handoff.md` — data-fattura: link presente (25),
  attribuzione competenza inerte (spec fiscale dedicata).
- `.claude/rules/learning.md` — nuovo trigger DB: "backfill di una FK che abilita
  un'azione distruttiva (void) o un settle (re-import) → verifica SIMMETRIA del
  rovescio + payment_date overwrite prima di collegare" (cugino DB-9/DB-11).
- `docs/CANTIERE.md` — stato BR2.

## Step ordinati

1. **RED prod (read-only)**: scrivere lo script; eseguire C1 + C2 (call separate,
   solo SELECT via MCP `execute_sql`) → 25 collegabili / 0 collegati + report `OK`.
   `npm run smoke:ef-reminder-parity` = 9.005,91. Commit RED (script) PRIMA dell'apply.
2. **Controllori unit**: C4 (`[scaduto]`-solo) + **C5 decider** (T3, 3 rami safety) +
   estensione `health:financial` (floor>=25 + uniqueness). `make test` verde. (I rami
   safety si testano QUI, non sul seed/prod che non li triggerano.)
3. **LOCAL rehearsal** (`make supabase-reset-database`): eseguire lo script in locale →
   valida SOLO **happy-path link + idempotenza** (oracolo **runtime** `eligible_count`
   del seed, oggi ~28; NON 25), `financial-baseline-before`+`compare` diff=0 (psql
   locale), nessun non-ricevuto linkato. NON pretende di validare i rami safety
   (seed: 0 scaduto, 0 collisioni, 9 inbound non-omonimi → rami a vuoto; coperti da C5).
4. **Browser WF-17 locale** (desktop + mobile, su `FinancialDocumentShow`): 2 doc
   collegati → badge "Incassata", nessun bottone "Annulla emissione"; (verifica anche
   che l'`ExpectedPaymentOrphanHint` resti vuoto). 0 errori console. Lista Fatture:
   nessun badge (invariata, per-design).
5. **Review piano** già fatta (questo blocco). Eventuali nuove FLAG → chiudere.
6. **GATE UTENTE**: via libera esplicito all'apply prod.
7. **PROD apply** (dopo via libera): `smoke:ef-reminder-parity` pre (9.005,91) →
   apply call (BEGIN/UPDATE/COMMIT + C3 SELECT) via MCP `execute_sql` → C3 GREEN
   (25, idempotenza 2ª run 0, uniqueness 0, scaduto NULL) → view-neutrality
   (`information_schema.views`=0 + `npm run health:financial` linkedCount>=25) →
   `smoke:ef-reminder-parity` post (ancora 9.005,91 = 0-delta fiscale).
8. **Commit unico**: script + C4 test + health + docs + learning + CANTIERE. Push →
   CI verde sul fork (`-R rosariodavidefurnari/gestionale-rosario`, WF-16/WF-7).
   NESSUN EF deploy (BR2 non tocca Edge Functions).

## Controllori (riepilogo — falsificabili reali in grassetto)

| ID | Cosa | Verde se | Tipo |
| --- | --- | --- | --- |
| **C1** | conta collegabili/collegati (prod) | **25 / 0** pre-apply | RED gate |
| **C2** | report in-SQL OK/MISMATCH | OK (partizione 25+1+6=32) | self-falsifying |
| **C3** | post-apply (prod) | 25 linked, 0 residui, 2ª run 0, uniq 0, scaduto NULL | GREEN gate |
| **INV-1 (T1)** | aggregato cassa 25 id pre==post + DO/RAISE abort (T2) | identico → COMMIT, diff → ROLLBACK | money gate |
| **C3-views** | information_schema.views + health + allocations=0 | 0 viste FK, linkedCount>=25 | invariante |
| **C3-fiscal** | `smoke:ef-reminder-parity` pre/post | 9.005,91 identico | 0-delta |
| **C5 (T3)** | decider puro `decidePaymentDocumentLink` 3 rami | scaduto/2-match/inbound→skip, ok→link | logica safety |
| C4 | void-rules unit (`[scaduto]`→true, `[ricevuto]`→false) | come atteso | documentazione |
| INV-6 | badge: pure-fn GIÀ verde + **WF-17 browser** | "Incassata" sui 25 post | runtime gate |
| local | rehearsal happy-path link + idempotenza (NON i rami safety) | eligible_count del seed | logica |

Mutation test (impl review): rimuovere `status='ricevuto'` dal CTE → **C1/C3 RED**;
aggiungere `status='ricevuto'` al SET dell'UPDATE → **INV-1 (T1) ROLLBACK**; i 3 rami
safety → **C5 unit RED** (NON testabili su seed/prod: nessun dato li triggera).

## Verifiche finali (prima di "fatto")

- `make typecheck` 0, `make lint` 0, `make build`, `make test` (incl. C4),
  `npm run continuity:check`.
- WF-17 browser desktop+mobile (INV-6). E2E progetto solo se tocco render (WF-21:
  `npx playwright test` reale).
- CI post-push verde (WF-7).

## Stop point (NON superare)

- Nessun apply prod prima di: local rehearsal OK + WF-17 OK + via libera utente.
- NON collegare lo scaduto `FPA 1/23` (resta NULL) — U5-A.
- NON toccare `invoice_void`/`invoiceVoidRules`/EF runtime (solo il TEST C4).
- NON modificare amount/status/payment_date/stamp_amount/total_amount.
- NON usare `db push`/`db reset` sul remoto; apply solo via MCP `execute_sql`.
- NON gatare l'apply su un oracolo locale `==25` (locale ≠ prod, P1).
- Se C1 RED ≠ 25/0, o C3 non GREEN, o `information_schema.views` ≠ 0, o
  `smoke:ef-reminder-parity` ≠ 9.005,91 post → FERMARSI (no apply al buio).

## Rischi residui (accettati / documentati)

- **Void-gap latente** (storici diventerebbero void-eligibili se collegati con payment
  pending): mitigato escludendo lo scaduto; follow-up U5-B (hardening `source_path`).
- **Re-import payment_date overwrite (P6)**: un re-import futuro dei 25 setterebbe
  `payment_date=issue_date` → shift cassa cross-year (Gustare FPR 10/23). Non
  introdotto dal backfill, fuori scope (lega a U4). Documentato in learning.
- **Seed locale stale** (P1): il 25 vale solo su prod; refresh seed = follow-up.
- 6 no-doc + 2 no-payment: non risolti (follow-up), nel report C2.
- Bollo storico + anomalia +25%: report-only (Ciclo 5).
