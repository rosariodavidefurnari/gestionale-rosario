# BR2 — Riconciliazione storica incassi ↔ fatture (`payments.financial_document_id`) — Design Spec

Data: 2026-06-20
Stato: **v2 — REVIEW MULTI-SUPERFICIE + RAG FATTA** (5 revisori: DB/Postgres,
fiscale forfettario, frontend/mobile, provider/Edge, TDD; verdetti 1 PASS, 3 FLAG,
1 BLOCK). Blocco autoritativo sotto: vince sul corpo. **1 BLOCK convergente CHIUSO**
(scaduto void-cascade → escludere lo scaduto, link 25). **GATE UTENTE 2026-06-20 —
DECISO**: U5=A (escludi scaduto, link **25**), U3=A (SCRIPT committato + gate
manuale), U1=solo backfill+report, U2=collega AQUACHETA +report, U4=data-fattura
fuori BR2. **Piano in corso** (`plans/2026-06-20-br2-...`). Nessun codice/DB write
finché l'utente non dà il via esplicito DOPO la review del piano. Gate spec→codice = decisione UTENTE (nessun
codice/migration/script finché non dà il via). RAG `:8001` rigenerato sullo
snapshot corrente `1704a926` (code-only, validato 0 429/mismatch) prima di
scrivere e di OGNI revisore.

## REVISIONE SPEC (post review multi-superficie + RAG) — AUTORITATIVA

Vince sul corpo. Verdetti: **fiscale-forfettario PASS** (la neutralità fiscale è
verificata sul reale: `fiscalModel.ts:227-233` + `_shared/fiscalDeadlineCalculation.ts`
leggono SOLO `payment.amount`+`payment_date`+`status='ricevuto'`, mai la FK/issue_date/
total/stamp → il backfill non muove alcun numero fiscale oggi; DOM-1/DOM-8 intatti;
bollo D4 fiscalmente inerte; data-fattura fuori BR2 = confine corretto). DB/Postgres,
frontend/mobile, TDD = **FLAG**; provider/Edge = **BLOCK**. Correzioni recepite
(tutte verificate su file:line + prod):

- **B1 (BLOCK convergente, 3 revisori) — lo `scaduto FPA 1/23` diventa void-eligibile
  col backfill.** Il gate void NON ha flag di provenienza app-emessa: i 28 doc
  storici sono protetti OGGI solo da `linkedPayments.length === 0`
  (`canVoidInvoiceFromPayments` `invoiceVoidRules.ts:23-26`; mirror EF
  `_shared/invoiceVoid.ts:18-19` reason `non_app_emessa`). Collegare lo `scaduto`
  gli dà 1 payment collegato, tutti in `(in_attesa,scaduto)` → `.every(...)=true` →
  il bottone "Annulla emissione" APPARE su una fattura 2023 storica, e
  `invoice_void` cancella il payment `WHERE status IN ('in_attesa','scaduto')`
  (`invoice_void/index.ts:113-116`) → **perdita di cassa reale**, contro l'intento
  stesso della FK migration ("deleting a financial_document must NEVER delete the
  real cash record"). La mia R1 originale ("0 app-emessi → void non li tocca") era
  l'INVERSO della realtà. **CHIUSO**: D5 → default **ESCLUDERE lo scaduto**, link
  **25**, oracoli pinnati a 25. I **25 `ricevuto` sono sicuri** (linked ricevuto →
  `.every` FALSE → non void-eligibile). Discriminatore di provenienza reale e
  verificato su prod: **`financial_documents.source_path IS NOT NULL` su tutti i 28
  import** (0 NULL), omesso dall'emit (`invoiceEmit.buildFinancialDocumentInsert`) →
  base per la **companion option** (U5-B): gate void su `source_path IS NULL` per
  collegare anche lo scaduto in sicurezza + hardening generale del void.
- **B2 (FLAG frontend convergente) — il badge incasso su `FinancialDocumentShow`
  cambia, INV-3 va riformulata.** `FinancialDocumentShow.tsx:135-149` fetcha i
  payment per `financial_document_id@eq` e rende `CollectionBadge`. Oggi 0 collegati
  → badge nullo. Dopo backfill i 25 doc collegati rendono badge **"Incassata"** (è
  il SENSO della feature, non un bug). Riformulato: INV-3 = "nessun valore di
  VISTA/dashboard/fiscale cambia (verificato, 0 viste leggono la FK)"; la pagina
  Fatture Show **acquista per-design** il badge collection sui 25 doc collegati →
  nuova **INV-6** + controllore badge. Niente divergenza desktop/mobile (componente
  condiviso).
- **B3 (FLAG TDD) — oracoli e controllori.** (a) Pinnare l'oracolo a **25** ovunque
  (C1/C2/C3/R2). (b) NON reinventare i controllori: riusare
  `scripts/financial-baseline-before.sql` + `financial-baseline-compare.sql` per il
  diff view-neutrality (C3) e `npm run health:financial`
  (`scripts/check-prod-financial-health.mjs`) per gli invarianti payment↔doc. (c)
  Aggiungere assert INV-2 unicità: `SELECT financial_document_id,count(*) ... HAVING
  count(*)>1 → 0`. (d) C2 = report a partizione DISGIUNTA con footer di conteggi
  (link=25, scaduto_escluso=1, no_doc=6 → 32; doc-side: 26 matchati + 2 no-payment =
  28; flag +25%=2 e bollo=13 sono SOTTOINSIEMI dei 25/26, non bucket separati). (e)
  Gate esplicito RED→GREEN (MONEY/FISCAL TDD): C1 committato e mostrato RED (25
  scollegati / 0 collegati) PRIMA dell'apply. (f) C4 = test falsificabile: un doc
  con 1 payment `scaduto` collegato È void-eligibile oggi (RED documenta perché lo
  scaduto è escluso), e lo scaduto reale resta `financial_document_id IS NULL`.
- **B4 (FLAG DB/MINOR) — forma e citazioni.** (a) D3 run-method: usare **MCP
  `execute_sql`** (preferito) o `psql -f`, NON `db query --linked -f` (il precedente
  `fiscal-reconciliation-2026-04-14.sql:48-55` usa MCP/psql). (b) Citare la vista
  reale `supabase/migrations/20260401094930_single_source_financials.sql` (filtra i
  payment solo per `status/project/client`, mai la FK) — il RAG aveva allucinato sia
  "high impact balance_due" sia nomi-file di migration inesistenti: NON portarli nel
  piano. (c) Espandere la tabella superfici a tutti gli **8** consumer FK.
- **B5 (FLAG provider/MINOR) — R4 phantom-settle sullo scaduto.** Se lo scaduto
  fosse collegato, un futuro re-import del suo XML lo setterebbe `status='ricevuto'`,
  `payment_date=2023-10-30` (`invoice_import_confirm/index.ts:386-390`, settle
  status-agnostic) → cassa 2023 fabbricata, contro la nota seed "Mai pagata".
  Risolto da B1 (escluso). I 25 `ricevuto` re-importati settlano in-place idempotente
  (già `ricevuto`) → no doppione (R4 resta un MIGLIORAMENTE per i 25).
- **MINOR fiscale**: rafforzare C3 con un assert 0-delta LETTERALE sull'output di
  `buildFiscalYearEstimate` (non solo le 3 viste commerciali), perché il dolore
  principale dell'utente sono i numeri fiscali. Bollo + anomalia +25% restano
  report-only (DOM-2 / §97, "non correggere alla cieca").

**U5 — scaduto: DECISO = A** (gate utente 2026-06-20): escludere lo scaduto, link 25,
hardening void (`source_path IS NULL`) = follow-up U5-B documentato ma NON preso. La
sezione "Decisioni aperte" sotto è ora un RECORD dell'esito (non più aperta).

## REVISIONE 2 (transversal) — note di allineamento

2ª review trasversale (6 revisori, **cassa-integrity PASS**, 0 BLOCK, tutti i prior
findings confermati chiusi). Allineamenti recepiti (dettaglio nel PIANO, blocco
"REVISIONE 2" autoritativo):

- **T1/T2/T3 (nel piano)**: controllore eseguibile INV-1 (checksum cassa pre==post +
  `DO/RAISE` abort-on-MISMATCH) e decider puro **C5 PROMOSSO** (i 3 rami safety
  scaduto/2-match/inbound non sono triggerati da seed/prod → unit test è l'unico modo
  deterministico). Il rehearsal locale valida SOLO happy-path+idempotenza.
- **T4 — surface table**: la riga "AI snapshot / registry" diceva "0 ref": vero solo
  per il context builder runtime. I 2 registry (`crmCapabilityRegistry.ts:194`,
  `crmSemanticRegistry.ts:474`) referenziano la FK in PROSA (descrivono il settle-by-FK,
  resta corretto post-backfill, nessuna stringa da cambiare); `financial_documents_summary`
  deriva `settled_amount`/`settlement_status` da `financial_document_cash_allocations`
  (**0 righe prod = colonna morta**), MAI dalla FK. Tutte NEUTRE, ora enumerate.
- **T6**: health ricorrente = `linkedCount >= 25` (floor; `==25` solo acceptance
  one-shot — la metrica cresce a ogni emit reale). Run-method precedente = MCP/psql
  (NON `db query --linked`). Void delete è FK-scoped (`WHERE financial_document_id=…
  AND status IN (in_attesa,scaduto)`).

## Contesto / Origine

`payments.financial_document_id` (FK additiva, migration
`20260616200000_payments_financial_document_link.sql`, `ON DELETE SET NULL`) è
l'ancora anti-doppio-conteggio del flusso "Emetti fattura" (FIX-3+4): `invoice_emit`
crea l'incasso atteso con la FK, `invoice_import_confirm` riconcilia per quella FK.

I pagamenti STORICI (pre-FK, dal `seed_domain_data.sql` / import XML BR1) NON hanno
mai avuto la FK valorizzata. Risultato: i due insiemi — 28 fatture
(`financial_documents`) e 32 incassi (`payments`) — sono **completamente scollegati**.
BR2 stabilisce il collegamento storico mancante. È il prerequisito dichiarato (DOM-8)
per l'attribuzione ricavi per **data fattura** (competenza) che oggi è "inerte finché
BR2 non collega i documenti".

## Problema (verificato sul reale — prod `qvdmzhyzpyaveniirsmo`, 2026-06-20)

Query read-only su prod (deterministiche, riproducibili):

- `payments`: **32** totali (31 `ricevuto`, 1 `scaduto`), **0** con
  `financial_document_id` valorizzato, **32/32** hanno `invoice_ref` non vuoto.
- `financial_documents`: **28**, tutte `direction='outbound'`, **0** con payment
  collegato.
- Match candidato `(client_id + invoice_ref = document_number)`:
  - **26** payment matchano 1 doc, **tutti 1:1** (0 doc con >1 payment), **0**
    ambiguità cross-client (0 match con client diverso).
  - dei 26: **24** con `payment.amount = total_amount` (cassa = imponibile);
    **2** con cassa divergente — AQUACHETA `FPR 5/23` (cassa 465 vs total 372,
    +93) e `FPR 9/23` (cassa 312,50 vs 250, +62,50): entrambi **esattamente +25%**,
    anomalia dato seed, **NON** bollo.
  - **6** payment SENZA doc corrispondente: LAURUS S.R.L. (`FPR 1/23`, `FPR 1/24`,
    `FPR 3/26`, `FPR 6/23`) + GUSTARE 2026 (`FPR 1/26`, `FPR 2/26` parziale,
    `FPR 3/26`). Sono fatture mai importate in `financial_documents` (LAURUS non ha
    alcun doc; le 2026 non ancora importate).
  - **2** doc SENZA payment per `invoice_ref`: Comune di Aidone `FPA 1/25` e
    `FPA 2/25` (tre fatture €200 stesso periodo, una sola ha l'incasso per-ref).

`document_number` ha formato `"FPR 5/23"` / `"FPA 1/23"` (prefisso + numero/anno),
identico a `invoice_ref` → il match esatto su stringa è valido (0 normalizzazione
necessaria sui 26; verificare comunque trim a runtime).

### Bollo €2 (assessment #14/#15)

- 13 doc con `stamp_amount = 2.00` (Σ €26). `stamp_amount` è **separato** da
  `total_amount` (per i bollo-doc `total = taxable`, lo stamp NON è incluso nel
  total). I 13 doc sono esattamente quelli con `total ≠ taxable+tax+stamp`.
- Per i pair matchati con bollo, la cassa = `total` (imponibile, **senza** i €2) →
  storicamente il bollo **non** è stato incassato dal cliente.
- **Verità di dominio confermata dall'utente (2026-06-20)**: «in passato a volte
  addebitavo il bollo ai clienti, a volte no; oggi lo addebito sempre». Quindi
  l'incoerenza storica è reale e **non correggibile con una formula** (assessment
  §97: "NON correggere alla cieca dati storici").

## Obiettivi

1. Collegare deterministicamente i **25** payment `ricevuto` esatti `(client_id +
   invoice_ref = document_number)` al rispettivo `financial_documents.id`,
   valorizzando `payments.financial_document_id` SOLO dove oggi è `NULL` (additivo,
   idempotente). Lo `scaduto` (26°) è ESCLUSO per default (B1/U5-A).
2. Rendere il collegamento **riproducibile e verificabile**: chiave naturale (no
   UUID hardcoded), controllore RED→GREEN, report di dry-run versionato.
3. Produrre un **report deterministico** dei casi NON auto-collegabili (6 no-doc, 2
   no-payment) e delle anomalie da segnalare all'utente (2 cassa-divergenti +25%, 13
   bollo non incassati) — senza modificarli.
4. Abilitare (non implementare) l'attribuzione per data-fattura: dopo il backfill, i
   payment riferiscono il documento e la sua `issue_date` diventa disponibile per la
   competenza.

## Non-obiettivi (espliciti)

- **NON** creare/importare le fatture mancanti dei 6 payment no-doc (LAURUS, GUSTARE
  2026). Richiede import XML / nuovo `financial_document` → fronte separato.
- **NON** risolvere i 2 doc senza incasso (Comune Aidone duplicati €200):
  informativo, decisione utente.
- **NON** correggere il bollo storico né l'anomalia +25% AQUACHETA: solo report.
  La riconciliazione bollo (incassare/assorbire) resta assessment Ciclo 5.
- **NON** implementare l'attribuzione ricavi per data-fattura nel layer fiscale
  (cambia `buildFiscalYearEstimate`/cassa→competenza, money + rischio proprio →
  spec dedicata successiva). BR2 = solo il LINK abilitante.
- **NON** introdurre UI nuova per il linking manuale degli edge case (follow-up).
- **NON** toccare lo schema oltre l'eventuale necessità: la colonna/FK/indice
  esistono già (`20260616200000`).

## Fonti di verità

- prod `qvdmzhyzpyaveniirsmo` (query read-only sopra) — stato reale.
- `supabase/migrations/20260616200000_payments_financial_document_link.sql` — FK.
- `supabase/seed_domain_data.sql` — dato di dominio locale (stesse righe).
- `supabase/functions/_shared/invoiceImportConfirm.ts` (`:456-468`) — match
  reconciliation per FK + client + invoice_ref, status-agnostic.
- `supabase/functions/invoice_void/index.ts` (`:113-116`) — delete payment
  `WHERE financial_document_id = documentId AND status IN ('in_attesa','scaduto')`
  (FK-scoped).
- `scripts/fiscal-reconciliation-2026-04-14.sql` — **precedente** di reconciliation
  come SCRIPT committato applicato via **MCP `execute_sql` / `psql -f`** (`:48-55`),
  non migration, non `db query --linked`.

## Decisioni (proposte — da validare in review + gate utente)

- **D1 — Algoritmo di match: esatto, 1:1, fail-closed.** Collegare un payment SSE
  esiste **esattamente un** `financial_documents` con `client_id` uguale e
  `trim(document_number) = trim(invoice_ref)` **e** `payment.status='ricevuto'`. Se 0
  o >1 match, o status non `ricevuto`, → NON collegare, finisce nel report. (Sui dati
  attuali: 26 match esatti di cui 25 `ricevuto` collegabili + 1 `scaduto` escluso;
  0 collisioni.)
- **D2 — Collegare i 25 ricevuto, anche i 2 cassa-divergenti.** La FK è
  **provenienza** (a quale fattura si riferisce l'incasso), non un'asserzione che gli
  importi quadrino. I 2 AQUACHETA si riferiscono davvero a quelle fatture → si
  collegano; l'anomalia +25% va nel report come flag separato. (Alternativa scartata:
  escluderli → provenienza incompleta senza beneficio.)
- **D3 — SCRIPT committato, non migration.** Backfill come
  `scripts/br2-link-payments-financial-documents.sql`, applicato via **MCP
  `execute_sql`** (preferito) o `psql -f` (gate manuale), NON migration né
  `db query --linked` (allineato al precedente `fiscal-reconciliation-2026-04-14.sql:48-55`).
  Motivo: tiene le migration schema-only e disaccoppia il replay schema dal dato di
  dominio. Idempotente: `WHERE financial_document_id IS NULL` + join chiave naturale +
  `status='ricevuto'` → ri-eseguibile (2ª run = 0 righe).
  - **Trade-off (B4)**: lo script NON è auto-replayato su `db reset` locale (solo il
    seed lo è). Se serve la replayability locale del link → migration additiva
    natural-key. Proposta: script (gate manuale prod) + decisione utente U3.
- **D4 — Bollo + anomalia +25% = report-only.** Nessuna scrittura (fiscalmente
  inerte, fiscale reviewer PASS). Output del controllore elenca i 13 bollo non
  incassati e i 2 +25% per decisione utente.
- **D5 — Scaduto `FPA 1/23` = ESCLUSO (default, B1 CHIUSO).** NON collegare lo
  `scaduto`: il backfill lo renderebbe void-eligibile (`canVoidInvoiceFromPayments`
  `.every(in_attesa||scaduto)=true`) → bottone "Annulla emissione" su fattura 2023
  storica → delete cassa reale. Resta `financial_document_id IS NULL`, nel report.
  Companion alternativa (U5-B): hardenare il gate void su `source_path IS NULL`
  (28/28 import hanno `source_path` non-null, verificato prod) + UI mirror +
  controllore + redeploy EF → poi collegare anche lo scaduto (26). Default = A
  (escludere, link 25).

## Invarianti

- INV-1: solo `UPDATE payments SET financial_document_id = <id> WHERE financial_document_id IS NULL AND status='ricevuto'`
  sui 25 match; nessun INSERT/DELETE, nessuna modifica di `amount`, `status`,
  `payment_date`, `stamp_amount`, `total_amount`.
- INV-2: 1 payment → ≤1 doc, 1 doc → ≤1 payment collegato (verificato 1:1).
  Controllore: `SELECT financial_document_id,count(*) ... HAVING count(*)>1 → 0`.
- INV-3: nessun valore di **VISTA DB / dashboard / fiscale** cambia (R3 — 0 viste
  leggono la FK; fiscale reviewer PASS, stima `buildFiscalYearEstimate` non legge la
  FK). NON significa "nessuna UI cambia": vedi INV-6.
- INV-4: idempotenza — seconda esecuzione tocca 0 righe.
- INV-5: lo `scaduto` (1), i 6 no-doc, i 2 no-payment, i 13 bollo, i 2 +25% restano
  invariati (FK NULL, nessun importo/stato toccato).
- INV-6 (B2, per-design): la pagina Fatture `FinancialDocumentShow` acquista il badge
  collection **"Incassata"** sui 25 doc collegati (oggi 0 collegati → badge nullo). È
  la feature, non una regressione. Controllore: i 25 doc rendono tono `received`; lo
  scaduto escluso NON rende badge (resta neutral). Nessuna divergenza desktop/mobile
  (componente condiviso).

## Rischi e mitigazioni (verificati sul sorgente)

- **R1 — void-cascade sullo `scaduto` (era FALSA, B1 CHIUSO).** Il gate void NON ha
  flag provenienza: i 28 storici sono protetti SOLO da `linkedPayments.length===0`
  (`invoiceVoidRules.ts:23-26`, mirror EF `_shared/invoiceVoid.ts:18-19`). Collegare
  lo `scaduto` → `.every(in_attesa||scaduto)=true` → "Annulla emissione" su fattura
  2023 storica → `invoice_void` cancella la cassa (`index.ts:113-116`). **Mitigazione
  applicata**: D5 = ESCLUDERE lo scaduto (link 25). I 25 `ricevuto` sono sicuri
  (linked ricevuto → `.every` FALSE → non void-eligibile). Companion U5-B: gate void
  su `source_path IS NULL`. Controllore C4 falsificabile.
- **R2 — link errato → import futuro settla il payment sbagliato.**
  `invoice_import_confirm` dopo backfill matcha per FK (settle-in-place). Mitigazione:
  match 1:1 esatto + `ricevuto` (D1) → 0 collisioni sui dati reali; controllore conta
  righe attese = **25** prima dell'apply (dry-run).
- **R3 — impatto viste/dashboard.** FALSIFICATO sul reale: `information_schema.views`
  con `view_definition ilike '%financial_document_id%'` → **0 viste**; la vista
  canonica `20260401094930_single_source_financials.sql` filtra i payment solo per
  `status/project/client`, mai la FK. Backfill **balance/dashboard/fiscale-neutro**
  (il RAG aveva allucinato "high impact su balance_due" + nomi-file migration
  inesistenti: smentito su prod; non portare le citazioni RAG nel piano).
- **R4 — re-import storico oggi crea duplicato.** `invoiceImportConfirm` (`:468`):
  payment con FK NULL "are never matched" → oggi re-importare un XML storico CREA un
  doppione. Dopo backfill i 25 `ricevuto` settlano in-place (idempotente, già
  ricevuto) → BR2 **migliora** la robustezza. (Lo `scaduto` escluso evita il
  phantom-settle a `ricevuto`+data 2023 — B5.)
- **R5 — replayability locale.** Lo script dipende dalle righe seed. Su
  `test-data-controller` (E2E) i payment non hanno `invoice_ref`
  (`test-data-controller.ts:134-140`) → join mai matcha → no-op sicuro (verificato).
  Su `db reset` locale col domain seed → collega gli stessi 25.
- **R6 — `invoice_ref` editabile (DB-9).** È free-text scrivibile da UI/import.
  Mitigazione: il backfill è one-shot sul dato corrente verificato; non instaura una
  logica runtime che si fidi della stringa (quella resta la FK).

## Controllori (RED → GREEN, deterministici)

- **C1 — pre-apply (RED, committato e mostrato PRIMA dell'apply, gate MONEY/FISCAL
  TDD)**: query versionata che conta `payments` `ricevuto` con
  `financial_document_id IS NULL` + match esatto 1:1 → atteso **25**; e `… IS NOT
  NULL` → atteso **0**. (Stato corrente = "da collegare".)
- **C2 — dry-run report a partizione DISGIUNTA**: 1 riga per payment (`payment_id,
  doc_id|null, decision link|skip, reason, flags[]`) + footer di conteggi:
  `link=25, scaduto_escluso=1, no_doc=6` (= 32 payment, partizione chiusa);
  doc-side `matchati=26, no_payment=2` (= 28). I flag `+25%=2` e `bollo=13` sono
  SOTTOINSIEMI dei 25/26 (non bucket separati). **Tabella verdetto in-SQL OK/MISMATCH**
  (T5: costanti 25/1/6/32 PROD-pinnate → verdetto solo su prod; in locale solo
  eligible-count runtime). Nessun caso silenziosamente ignorato (WF "no silent caps").
- **C3 — post-apply (GREEN)**: 25 collegati, 0 collegabili residui, 2ª run = 0 righe
  (idempotenza); INV-2 unicità (count>1 → 0); **INV-1 checksum cassa pre==post +
  DO/RAISE abort (T1/T2)**; allocations row-count=0. View-neutrality: in PROD via
  `information_schema.views` (0 viste FK) + `npm run health:financial` (assert
  `linkedCount >= 25` floor — `==25` solo acceptance one-shot, la metrica cresce a
  ogni emit reale; + uniqueness); in LOCALE via `financial-baseline-before.sql` +
  `compare.sql` (psql, T2 — quei file usano `\echo`/CREATE table, NON eseguibili su
  MCP). **Più** assert 0-delta fiscale via `npm run smoke:ef-reminder-parity`
  (9.005,91 pre/post — esercita `buildFiscalYearEstimate`). NON reinventare diff ad-hoc.
- **C4 — void-safety (B1) falsificabile**: (a) test che un doc con 1 payment
  `scaduto` collegato È void-eligibile oggi (RED documenta perché lo scaduto è
  escluso — o, se U5-B, diventa il GREEN del gate `source_path`); (b) query che lo
  scaduto reale `FPA 1/23` resta `financial_document_id IS NULL` post-apply.
- **C5 — pure decider** (se il piano vuole esporre il match a una UI futura di linking
  manuale): funzione pura `decidePaymentDocumentLink(payment, docs)` →
  `link|skip(reason)` con unit test falsificabile. Opzionale in v1 (il backfill è SQL).

## Criteri di accettazione

1. Script applica esattamente i **25** link (C1 RED→C3 GREEN), idempotente; lo
   scaduto `FPA 1/23` resta FK-NULL (U5-A) salvo scelta U5-B.
2. INV-1..INV-6 rispettate; diff viste = 0 (baseline-before/compare); INV-2 unicità
   (count>1 → 0); 0-delta `buildFiscalYearEstimate`.
3. Report C2 committato a partizione disgiunta (footer conteggi, partizione chiusa
   25+1+6=32), diff RED su drift — nessun caso silenziosamente ignorato.
4. B1 chiusa: scaduto escluso (o void-gate hardenato su `source_path`, U5-B);
   C4 falsificabile.
5. RAG `:8001` (snapshot `1704a926`) usato in spec e in OGNI revisore; ogni claim RAG
   verificato sul sorgente reale (allucinazioni balance_due + nomi-file scartate).
6. Review multi-superficie (1 PASS + 3 FLAG + 1 BLOCK) tutte risolte prima del piano.
7. Continuity docs aggiornati (`development-continuity-map.md`,
   `historical-analytics-handoff.md` se cambia lo stato data-fattura) nello stesso
   commit del codice. Learning: nuovo trigger DB (backfill FK → simmetria void,
   cugino DB-9/DB-11).

## Superfici verificate (RAG fresco + sorgente reale)

Tutti gli **8** consumer FK (grep `financial_document_id` su `src/`+`supabase/`):

| Superficie | Legge la FK? | Effetto backfill (25 ricevuto) | Fonte |
| --- | --- | --- | --- |
| Viste DB (`balance_due`, `client_commercial_position`, `project_financials`, `monthly_revenue`) | **NO** (0 viste) | neutro | prod `information_schema.views`; `20260401094930_single_source_financials.sql` |
| Stima fiscale (`fiscalModel.ts`, `_shared/fiscalDeadlineCalculation.ts`) | NO (solo amount/date/status) | neutro (DOM-1, reviewer PASS) | `fiscalModel.ts:227-233,421` |
| `FinancialDocumentShow` (badge collection + bottone void) | **SÌ** (`financial_document_id@eq`) | **per-design**: badge "Incassata" sui 25; void NON attivato (ricevuto non void-eligibile) | `FinancialDocumentShow.tsx:135-149,210`; `financialDocumentHelpers.ts:144-161` |
| `invoice_void` / `invoiceVoidRules` | SÌ (gate + delete `in_attesa`/`scaduto`) | scaduto ESCLUSO (B1) → nessun nuovo void-target | `invoiceVoidRules.ts:13-27`; `invoice_void/index.ts:113-116` |
| `invoice_import_confirm` (`_shared/invoiceImportConfirm.ts`) | SÌ (settle per FK) | 25 ricevuto → settle-in-place idempotente (migliora) | `:456-468` |
| `invoice_emit` (absorb) | SÌ ma `in_attesa AND FK IS NULL` | neutro (backfill su ricevuto) | `invoice_emit/index.ts:88-92` |
| `quickPaymentReconciliation` / `QuickPaymentDialog` | SÌ ma filtra `in_attesa` | neutro | `projects/quickPaymentReconciliation.ts:42-44` |
| `PaymentInputs` `ExpectedPaymentOrphanHint` | SÌ ma filtra `in_attesa` | neutro | `PaymentInputs.tsx:294-295` |
| AI snapshot runtime (`unifiedCrmReadContext`) | NO (select payment senza FK) | neutro | `src/lib/ai/unifiedCrmReadContext.ts:281,483-510` (0 ref FK) |
| AI registry semantico/capability (T4) | SÌ in **PROSA** (descrive settle-by-FK) | neutro: la prosa resta corretta post-backfill (i 25 entrano nello stesso ramo già descritto), 0 stringhe da cambiare | `crmCapabilityRegistry.ts:194`; `crmSemanticRegistry.ts:474` |
| Vista `financial_documents_summary` (T4) | NO (settled da `cash_allocations`) | neutro: `settled_amount`/`settlement_status` da `financial_document_cash_allocations` (**0 righe prod = colonna morta**), MAI dalla FK | `20260302010500:137-193`; `financialDocumentHelpers.ts:130-131` |

## Decisioni AL GATE (esito 2026-06-20) — record, non più aperte

- **U5 — Scaduto `FPA 1/23` → ESITO: A.** ESCLUDERE lo scaduto, link **25**.
  Void-hardening (B: gate `source_path IS NULL` + EF + mirror + redeploy) = follow-up
  U5-B documentato, NON preso.
- **U1 — Scope → ESITO: confermato.** Solo backfill + report; 6 no-doc e 2 no-payment
  = follow-up.
- **U2 — AQUACHETA +25% → ESITO: collegare + segnalare.** Provenienza corretta; i 2
  importi già alimentano la cassa fiscale oggi (anomalia nel dato, non nel link).
- **U3 — Forma → ESITO: SCRIPT committato + gate manuale** (MCP/psql).
- **U4 — data-fattura attribution → ESITO: fuori BR2** (spec fiscale dedicata dopo,
  cassa→competenza, money + rischio proprio).
