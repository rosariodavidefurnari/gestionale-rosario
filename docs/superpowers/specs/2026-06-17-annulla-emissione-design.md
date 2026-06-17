# Annulla Emissione Fattura (invoice void) — Design Spec

Data: 2026-06-17
Stato: draft
Origine: l'utente osserva (giustamente) che nel gestionale nulla deve essere
irreversibile — il gestionale e' un REGISTRO + generatore XML, l'emissione
legale/irreversibile avviene su Aruba (SDI), NON nel gestionale. Oggi pero'
"Emetti fattura" crea record che dalla UI NON si possono annullare → porta a
senso unico.

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
