# Annulla Emissione Fattura (invoice void) — Design Spec

Data: 2026-06-17
Stato: draft
Origine: l'utente osserva (giustamente) che nel gestionale nulla deve essere
irreversibile — il gestionale e' un REGISTRO + generatore XML, l'emissione
legale/irreversibile avviene su Aruba (SDI), NON nel gestionale. Oggi pero'
"Emetti fattura" crea record che dalla UI NON si possono annullare → porta a
senso unico.

## REVISIONE v2 (post review multi-superficie + RAG) — AUTORITATIVA

Dove confligge col corpo sotto, vince questa. La review (5 revisori, RAG +
sorgente; ha anche smascherato un'allucinazione RAG su `fiscalModel`) ha trovato
4 critical convergenti, corretti qui, ogni claim riverificato su file:line.

- **V1 — `scaduto` e' cassa-neutro e VOIDABILE (non solo `in_attesa`).**
  `fiscalModel.ts:217,546` fanno `if (payment.status !== "ricevuto") continue`:
  quindi `scaduto` NON e' in cassa (come `in_attesa`), ed e' proprio lo scenario
  tipico (fattura sbagliata mai pagata, ora scaduta). Regola corretta: void
  ammesso se TUTTI i payment collegati ∈ `{in_attesa, scaduto}`; **RIFIUTO 409
  solo se esiste UN payment `ricevuto`** (incasso reale). Corregge l'incoerenza
  interna del corpo (riga 72 vs 76/88).
- **V2 — Un-mark deterministico (no doppia fatturazione).** L'identita' e'
  `UNIQUE(client_id, direction, document_number, issue_date)`
  (`financial_documents_foundation.sql:31`): `document_number` da solo NON e'
  unico. Un-mark `invoice_ref = document_number AND client_id` potrebbe
  scollegare i lavori di una SECONDA fattura omonima. Fix: PRIMA dello storno,
  guard `COUNT(*)` su `financial_documents` outbound con stesso
  `client_id + document_number`; se `>1` → **409 "numero fattura ambiguo"** (non
  indovinare). Se esattamente 1 (quella in storno), l'un-mark per
  `invoice_ref + client_id` e' sicuro. Un-mark `expenses` deve mirrorare
  `source_service_id IS NULL` (DB-8) come fa l'emit.
- **V3 — DELETE fail-closed + lock (TOCTOU).** Il driver Kysely Deno non ha
  savepoint e `invoice_import_confirm` settla `ricevuto` senza `FOR UPDATE`:
  finestra in cui il void cancella un incasso reale. Fix: a inizio tx
  `SELECT ... FOR UPDATE` su documento e payment; tutte le verifiche PRIMA di
  ogni DELETE; il DELETE payment e' `WHERE financial_document_id = id AND status
  IN ('in_attesa','scaduto') RETURNING id`; confronto count cancellati vs attesi
  → se diverge **rollback** (qualcuno ha incassato nel frattempo). Controllore
  RED che settla `ricevuto` tra guard e delete.
- **V4 — Guard cascade allocations.** `financial_documents` ha `ON DELETE
  CASCADE` verso `financial_document_project_allocations` (`:36`) e
  `financial_document_cash_allocations` (`:61`). Oggi benigno (emit non scrive
  allocazioni) ma invariante latente: pre-delete `COUNT(*)=0` su ENTRAMBE →
  **409** se `>0` (non cancellare allocazioni a cascata). Controllore RED con
  allocazione fittizia.

### Correzioni IMPORTANT

- **Decisione unica `canVoidEmittedInvoice({document, linkedPayments})`** pura,
  usata SIA dalla UI SIA dall'EF (no drift). Rami: outbound + customer_invoice +
  tutti i payment ∈ {in_attesa,scaduto} → ok; almeno un `ricevuto`/mixed →
  reject; 0 payment (storica/importata) → reject; inbound/credit_note → reject.
- **Gating UI**: sollevare il fetch dei payment nel parent
  `FinancialDocumentShowContent` (oggi vive DENTRO `CollectionBadge`,
  `FinancialDocumentShow.tsx:32-46`) e riusare lo stesso dato; il bottone compare
  solo se `canVoidEmittedInvoice` ok.
- **UI placement + mobile (WF-17)**: `PaymentShow:65` NON mappa 1:1 — su
  `FinancialDocumentShow` lo slot destro dell'header e' occupato dal Totale
  (`:154-161`) e c'e' `mb-28 md:mb-2` (`:121`). Bottone in una RIGA/sezione
  dedicata del Card, full-width, variante destructive, sopra l'area `mb-28`;
  verifica esplicita su desktop E mobile.
- **Path/risorsa corretti**: il file e' `invoices/FinancialDocumentShow.tsx`
  (NON `invoicing/`); la resource UI e' la VIEW `financial_documents_summary`
  (read-only), l'EF opera sulla TABELLA `financial_documents`.
- **Idempotenza**: documento gia' annullato/inesistente → ritorno
  `{status:"already_voided"}` 200 (non 500). Controllore doppio-void.
- **config.toml** `[functions.invoice_void] verify_jwt=false` nello stesso commit
  (BE-2); deploy manuale `--project-ref qvdmzhyzpyaveniirsmo` (BE-1/BE-8).

### Note (MINOR)

- `UPDATE services` riattiva il trigger `sync_service_km_expense` (no-op
  idempotente, non tocca `invoice_ref`) — atteso.
- Riga rischi "neutro": vero per la cassa FISCALE; il forecast
  (`pendingPaymentDrilldowns`) perde l'atteso — effetto VOLUTO dello storno.
- DELETE id-scoped su `financial_document_id`, MAI per `invoice_ref`; ordine
  payment→documento corretto vs FK `ON DELETE SET NULL`.
- Read-only preservato (azione di dominio, non CRUD): `moduleRegistry.test.ts`
  resta verde → citarlo come controllore di non-regressione.

### Controllori v2 (MONEY/FISCAL — RED prima)

1. `canVoidEmittedInvoice` puro: tutti i rami sopra.
2. EF/E2E: emit → void → 0 financial_documents, 0 payments per quel ref, lavori
   tornano "Da fatturare".
3. void rifiutato 409 se UN payment `ricevuto`; **ammesso** se `scaduto`.
4. due fatture outbound omonime stesso cliente → void → **409 ambiguo** (nessun
   lavoro dell'altra fattura toccato).
5. allocazione fittizia presente → void → 409.
6. TOCTOU: payment settato `ricevuto` tra guard e delete → rollback (0 cancellati).
7. dopo void, `buildFiscalYearEstimate`/`analytics_yearly_cash_inflow` invariati.
8. read-only `moduleRegistry.test.ts` verde; doppio-void → already_voided 200.

## Problema

`invoice_emit` crea, in transazione: 1 riga `financial_documents` (outbound,
customer_invoice), 1 `payment` atteso (`in_attesa`, `financial_document_id`), e
marca i `services`/`expenses` con `invoice_ref = document_number`. La resource
`financial_documents_summary` e' read-only (verificato: `moduleRegistry.test.ts:67-79`,
no edit/delete; smoke `invoices.smoke.spec.ts`). Quindi se l'utente emette per
sbaglio NON ha un modo dalla UI per tornare indietro: i lavori restano
"Fatturato", l'incasso atteso resta, la fattura resta. Verificato: NESSUNO
storno/void esiste oggi nel repo.

## Obiettivo

Azione di dominio **"Annulla emissione"** su `FinancialDocumentShow`, che in
un'unica transazione server-side:

1. cancella il `payment` atteso collegato (`financial_document_id = doc.id`),
2. cancella la riga `financial_documents`,
3. ripulisce `invoice_ref` su `services`/`expenses` marcati da quella fattura
   (match `invoice_ref = document_number` + `client_id`), che tornano
   "Da fatturare".

Reversibile, sicura, con conferma. Rende "Emetti" libero da usare (sbagli →
annulli), senza che il gestionale tocchi mai Aruba/SDI.

## Non-Obiettivi

- NON trasmettere/annullare nulla su Aruba/SDI (confine: gestionale = registro;
  Aruba = emissione legale). Lo storno e' SOLO sul record interno.
- NON rendere `financial_documents_summary` scrivibile via CRUD: lo storno e'
  un'azione di dominio (bottone → EF), il guard read-only (no edit/create) resta.
- NON annullare fatture NON emesse dall'app (storiche/importate senza
  `payment.financial_document_id`), ne' `inbound`, ne' note di credito.
- NON gestire la nota di credito fiscale (quella e' un altro documento, futura).

## Fonti di verita' (verificate su sorgente + RAG)

- `invoice_emit/index.ts` — cosa crea l'emit (doc + payment in_attesa +
  invoice_ref su services/expenses).
- `payments.financial_document_id` (migration `20260616200000`, FK
  `ON DELETE SET NULL`) — link app-emesso.
- `FinancialDocumentShow.tsx` — oggi senza toolbar azioni; pattern toolbar da
  `PaymentShow.tsx:65-84` (`<div flex flex-wrap gap-2>` con azioni custom).
- Viste che leggono payments filtrano `status='ricevuto'` per la cassa
  (`project_financials`, `analytics_yearly_cash_inflow`,
  `client_commercial_position`) → un payment `in_attesa` cancellato e' gia'
  cassa-neutro.
- `financial_documents_summary` (turnover) si riduce correttamente cancellando
  il documento (effetto voluto dello storno).
- NON esiste oggi un guard che impedisca di cancellare un payment `ricevuto`
  (RAG: "pattern standard ma non implementato") → lo costruisco nello storno.

## Decisione di design

### Invariante di sicurezza (CRITICO)

Lo storno e' permesso SOLO se la fattura e' **app-emessa e non ancora
incassata**:

- il documento e' `direction='outbound'` + `document_type='customer_invoice'`;
- esiste un `payment` con `financial_document_id = doc.id`;
- quel payment e' **`in_attesa`** (NON `ricevuto`/`scaduto` con incasso).

Se il payment collegato e' `ricevuto` → **RIFIUTO esplicito (409)**: "Fattura
gia' incassata: registra prima lo scollegamento dell'incasso, poi annulla."
(Cancellare un incasso reale = perdita del dato cassa: vietato dallo storno.)
Se non esiste payment app-link (fattura storica/importata) → l'azione NON
compare / 409: "Questa fattura non e' stata emessa dall'app, non e' annullabile
da qui."

### EF transazionale `invoice_void`

Pattern blueprint `invoice_import_confirm` (transaction + `SET LOCAL ROLE
authenticated` + jwt claim). In transazione:

1. SELECT documento per id → verifica `outbound`/`customer_invoice`.
2. SELECT payment(s) `financial_document_id = id` → se 0 → 409 (non app-emessa);
   se uno e' `ricevuto`/`scaduto` con incasso → 409 (gia' incassata).
3. `UPDATE services SET invoice_ref = NULL WHERE invoice_ref = document_number
   AND client_id = doc.client_id`; idem `expenses` (anche queste tornano
   "Da fatturare").
4. `DELETE FROM payments WHERE financial_document_id = id` (solo in_attesa).
5. `DELETE FROM financial_documents WHERE id = id`.
   Ritorno `{ status:"voided", servicesUnmarked, expensesUnmarked, paymentDeleted }`.

Funzione pura testabile `canVoidEmittedInvoice({ document, linkedPayments }) →
{ ok } | { ok:false, reason }` per la decisione (no DB), usata dall'EF.

### Provider + UI

- Provider method `voidEmittedInvoice(documentId)` (Provider-First) → EF.
- `FinancialDocumentShow`: toolbar azioni (pattern PaymentShow). Bottone
  **"Annulla emissione"** visibile SOLO per outbound customer_invoice
  app-emessa (esiste payment con financial_document_id) e non incassata.
  `window.confirm` ("Annulli la fattura N? I lavori torneranno Da fatturare e
  l'incasso atteso sara' rimosso. L'XML gia' caricato su Aruba NON viene
  toccato."). On success: notify + redirect alla lista Fatture + refresh.
- Visione browser desktop E mobile obbligatoria (WF-17).

## Invarianti / rischi

| Sev | Rischio | Mitigazione |
|---|---|---|
| 🔴 | Cancellare un incasso reale (`ricevuto`) | EF rifiuta 409 se payment ricevuto; controllore RED |
| 🔴 | Annullare una fattura storica/importata | EF rifiuta se nessun payment app-link |
| 🟠 | Un-mark di lavori sbagliati (invoice_ref omonimo) | match `invoice_ref = document_number AND client_id`; controllore |
| 🟠 | Cassa fiscale alterata | il payment era `in_attesa` (gia' escluso dalla cassa) → storno neutro; controllore |
| 🟠 | read-only rotto | azione di dominio (EF), niente CRUD edit/delete; test guard resta verde |
| 🟡 | Confine Aruba | copy chiaro: lo storno NON tocca Aruba/SDI |

## TDD / Controllori (MONEY/FISCAL — RED prima)

1. `canVoidEmittedInvoice`: ok per outbound+customer_invoice+payment in_attesa;
   reject per payment ricevuto; reject per 0 payment app-link; reject per
   inbound/credit_note.
2. EF/E2E: emit → void → 0 financial_documents, 0 payments per quel ref,
   services tornano "Da fatturare" (invoice_ref null).
3. void rifiutato (409) se il payment e' `ricevuto`.
4. dopo void, `buildFiscalYearEstimate`/`analytics_yearly_cash_inflow`
   invariati (il payment era in_attesa).
5. read-only resta: `moduleRegistry.test.ts` (edit/create undefined) verde.

## Criteri di accettazione

- Da una fattura app-emessa non incassata: "Annulla emissione" → fattura +
  incasso atteso rimossi, lavori "Da fatturare", redirect lista.
- Fattura incassata → bottone assente o 409 con messaggio chiaro.
- Fattura storica → non annullabile.
- typecheck/lint/test verdi; EF deployata (ref `qvdmzhyzpyaveniirsmo`,
  `config.toml verify_jwt=false`); browser desktop + mobile verificati.

## Review gate

1. Review spec (multi-superficie + RAG).
2. Piano + review piano (multi-superficie + RAG).
3. Impl locale TDD → review impl (multi-superficie + RAG).
4. Browser desktop + mobile (WF-17).
5. PROD gated (OK utente): migration n/a (nessuno schema nuovo) + deploy EF
   `invoice_void` + smoke prod (emit→void→cleanup).

## Stop point

- Niente prod senza verde locale + browser desktop/mobile + OK utente.
- Lo storno NON cancella mai un incasso `ricevuto` ne' tocca Aruba/SDI.
