# Riconciliazione incasso atteso (FIX-3+4) — Design Spec

Data: 2026-06-17
Stato: v2 (semantica utente confermata + review spec multi-superficie integrata)

## REVISIONE v2 (post review spec multi-superficie + RAG) — AUTORITATIVA

Vince sul corpo dove confligge. Review FLAG (3 revisori, RAG + sorgente). Nucleo
giusto (settle + absorb, riuso `decideEmittedPaymentReconciliation`), ma 5
correzioni money-critical (tutte verificate su file:line):

- **VP1 — bersaglio corretto = `pendingPaymentsTotal`, NON `balance_due`.**
  `project_financials.total_paid` conta solo `status='ricevuto'`
  (`20260401094930:58-60`) → `balance_due` non raddoppia mai. La metrica gonfiata
  e' `pendingPaymentsTotal` (`dashboardModel.ts:299-306`, somma i non-ricevuto) +
  consumer status-based (`quotePaymentsSummary.pendingTotal`,
  `dashboardDeadlineTracker`, badge `FinancialDocumentShow`). Il controllore RED
  asserisce `pendingPaymentsTotal` (cala) — e separatamente `cashReceivedNet`
  (sale 1 sola volta). NON `balanceDue`.
- **VP2 — `payment_date` cash-basis deterministico.** Il settle usa la DATA REALE
  d'incasso inserita; se vuota NON azzera (fallback al `payment_date` esistente o
  `todayISODate()`), MAI `null` su `ricevuto` (altrimenti la cassa cade nell'anno
  di `created_at` — DOM-1/WF-8). Pattern da `invoice_import_confirm:381-390`.
- **VP3 — match multiplo = `ambiguous`, CHIEDI quale (CONFERMATO utente).** I
  decider ritornano `settle | create | ambiguous` (non binari). QuickPayment parte
  da un PROGETTO e non conosce il numero fattura, quindi "progetto con 2+ fatture
  aperte" e' il caso NORMALE: su >1 atteso collegato → mostra la lista (fattura N -
  importo) e l'utente sceglie quale saldare. `create` silenzioso e' VIETATO
  (ri-orfana gli attesi = la regressione stessa). Allineato al 409 dell'import
  (`invoiceImportConfirm.ts:484-486`).
- **VP4 — chiave di match dell'absorb (FIX-4) disciplinata come l'import.**
  `decideEmitExpectedPayment(...) → absorb | create | ambiguous`. Candidato =
  stesso `amount` (tolleranza cent) + `payment_type` compatibile
  (`saldo/acconto/parziale`, MAI `rimborso*`); emit project-level filtra
  `project_id = source.id`; emit client-level (`project_id` null) con >1 manuale →
  NON assorbe (ambiguous/create). L'absorb allinea `invoice_ref = documentNumber`
  (coerenza col decider import) + `FOR UPDATE` + `WHERE financial_document_id IS
  NULL` (idempotente, no UNIQUE violation col driver Kysely-Deno senza savepoint).
- **VP5 — NON PIU' APPLICABILE (corretto dalla review piano, verificato live).**
  La biforcazione foundation-basis di `20260307200325:73-78` e' stata ELIMINATA da
  `20260401094930_single_source_financials.sql` (DROP VIEW + CREATE VIEW):
  `project_financials.total_paid = SUM(...) WHERE status='ricevuto'`, nessun ramo
  `total_paid_foundation`/allocation. Quindi il settle in_attesa→ricevuto muove
  `balanceDue` del dialog su TUTTI i progetti — nessuna incoerenza, nessun
  controllore di biforcazione (Task 5.3 rimosso). Verificato sul DB locale (0
  occorrenze foundation/allocation nella view live).

Incasso parziale (CONFERMATO): il settle aggiorna `amount` all'incassato e chiude;
il residuo vive in `balance_due` (cumulativo) — distinto da `pendingPaymentsTotal`.

Cassa-once GIA' SAFE: il settle e' UPDATE della stessa riga (non INSERT) → nessun
secondo `ricevuto`. Mobile parity GIA' OK: `QuickPaymentDialog` ha un solo
consumer (`ProjectShow.tsx:173`), logica interna identica desktop/mobile. Nessun
trigger su `payments` oltre `updated_at` (verificato; RAG aveva allucinato
`on_payment_change`).

Controllori (riuso harness): ESTENDERE `tests/e2e/invoice-void.smoke.spec.ts`
(ha gia' `api.emit()` + query/PATCH payments); decider puri sul pattern
`invoiceImportConfirm.test.ts:128-175`. (1-2 unit decider settle/absorb incl.
ramo `ambiguous`; 3 e2e emit→incasso = 1 payment ricevuto, `pendingPaymentsTotal`
−importo nell'anno del `payment_date`; 4 emit assorbe manuale = 1 in_attesa; 5
`cashReceivedNet` +importo 1 volta; 6 progetto foundation-basis; 7 browser WF-17.)

Stato: v2 chiudibile → via libera al PIANO.

Stato (storico): draft (in attesa review utente + multi-superficie)
Origine: audit post-ship ciclo fatturazione (2026-06-17), IMPORTANT-3 + IMPORTANT-4
(radice convergente: l'incasso ATTESO generato dall'emissione non viene
riconciliato con l'incasso reale ne' con un atteso manuale pre-esistente →
doppio conteggio in "Da incassare").

## Problema (verificato sul reale)

`invoice_emit` crea, in transazione, un `payment` ATTESO `in_attesa` con
`financial_document_id` (l'incasso che ti aspetti dalla fattura). Ma:

- **IMPORTANT-3** — `QuickPaymentDialog.tsx:182-192` fa SEMPRE `create("payments",
  ...)` con un payload SENZA `financial_document_id`. Quindi quando registri
  l'incasso reale, nasce un pagamento NUOVO `ricevuto` e l'`in_attesa` emesso
  resta orfano → "Da incassare" (`pendingPaymentsTotal`, status != ricevuto) lo
  conta in eterno.
- **IMPORTANT-4** — `invoice_emit/index.ts:49-63` controlla idempotency solo sul
  documento `(client_id, direction, document_number, issue_date)`;
  `buildExpectedPaymentInsert` crea SEMPRE un nuovo `in_attesa`. Se il progetto ha
  gia' un `in_attesa` MANUALE (il workflow reale traccia il dovuto cosi' — seed
  `20260302170000:323-327`), l'emit ne aggiunge un secondo → doppio atteso sullo
  stesso lavoro.

Cassa fiscale NON impattata (solo `ricevuto` entra in cassa); il danno e' su
forecast / "Da incassare" / dashboard.

## Fonte di verita' / riuso (SYSTEM-FIRST)

Esiste GIA' la semantica di settle-in-place per gli incassi emessi:
`supabase/functions/_shared/invoiceImportConfirm.ts` —
`decideEmittedPaymentReconciliation` matcha per `financial_document_id` (+ client
+ invoice_ref) e RI-SETTLA lo stesso incasso senza duplicare (usato da
`invoice_import_confirm`, status-agnostic). FIX-3+4 deve RIUSARE questa nozione di
"link per `financial_document_id`", non inventarne una terza.

## Decisione di design (semantica CONFERMATA dall'utente 2026-06-17)

1. **Incasso rapido salda l'atteso collegato (FIX-3)**: quando `QuickPaymentDialog`
   registra un incasso (`ricevuto`) per un progetto/cliente che ha un `payment`
   `in_attesa` con `financial_document_id` non nullo, deve **aggiornare quella
   riga** (`status='ricevuto'`, `payment_date`, eventuale `amount`/`method`),
   NON creare un nuovo pagamento. Se non esiste un atteso collegato → crea come
   oggi.
2. **Emit assorbe l'atteso manuale pre-esistente (FIX-4)**: `invoice_emit`, prima
   di creare l'atteso, cerca un `in_attesa` sulla stessa source (project/client)
   con `financial_document_id` NULL; se lo trova lo **collega** (set
   `financial_document_id = doc.id`, resta `in_attesa`) invece di crearne un
   secondo. Se non lo trova → crea come oggi.

## Non-obiettivi

- NON toccare la base imponibile fiscale (cassa = solo `ricevuto`).
- NON inventare una terza logica di reconciliation: riusare il match per
  `financial_document_id`.
- NON gestire qui i MINOR (bollo, import-dopo-void, ExpenseList) ne' IMPORTANT-5
  (AI registry/snapshot) — accodati.
- NON cambiare la UX di QuickPayment oltre il comportamento di save (no nuovi
  campi visibili) salvo un eventuale micro-hint "salda incasso atteso fattura N".

## Superfici coinvolte (sweep)

- `src/components/atomic-crm/projects/QuickPaymentDialog.tsx` — al save: query
  `payments` per `project_id`/`client_id` + `status=in_attesa` +
  `financial_document_id` not null; se match → `update` quella riga; else `create`.
  Decider PURO testabile `decideQuickPaymentTarget(existingExpected, draft)` →
  `{ action: "settle", paymentId } | { action: "create" }`.
- `supabase/functions/invoice_emit/index.ts` + `_shared/invoiceEmit.ts` — prima di
  `buildExpectedPaymentInsert`, SELECT `payments` `in_attesa` su source con
  `financial_document_id IS NULL`; se match → `UPDATE ... SET
  financial_document_id = doc.id` (assorbi) invece di INSERT. Decider PURO
  `decideEmitExpectedPayment(existingUnlinkedPending, request)`.
- Provider: il QuickPayment usa `useCreate`/`useUpdate` ra-core; eventuale metodo
  esplicito se serve atomicita'.
- `types.ts` — gia' ha `Payment.financial_document_id`.
- Mobile: `QuickPaymentDialog` e' usato anche su mobile → parita' (UI-7).

## Invarianti / rischi

| Sev | Rischio | Mitigazione |
|---|---|---|
| 🔴 | Doppio conteggio "Da incassare" (la regressione stessa) | settle-in-place + absorb; controllore RED che dimostra il raddoppio prima |
| 🔴 | Settle della riga SBAGLIATA (piu' attesi collegati) | match deterministico: se >1 in_attesa collegato → NON indovinare, fallback create + warn (o usare il piu' recente con conferma); decider testato |
| 🟠 | Cassa errata | l'update in_attesa→ricevuto aggiunge l'importo alla cassa una sola volta (no doppio); verificare con query |
| 🟠 | TOCTOU emit (race su assorbimento) | l'absorb e' dentro la tx emit con FOR UPDATE sull'atteso candidato |
| 🟠 | Mobile mostra comportamento diverso | QuickPayment condiviso; test su entrambe le viewport |
| 🟡 | Amount divergente (atteso 1000 vs incasso 950 parziale) | decidere: settle aggiorna amount? o lascia e crea delta? (domanda aperta) |

## TDD / Controllori (MONEY — RED prima)

1. `decideQuickPaymentTarget` puro: con atteso collegato → `settle(paymentId)`; senza
   → `create`; con >1 atteso collegato → `create` (no-guess) o conferma.
2. `decideEmitExpectedPayment` puro: con in_attesa manuale non collegato su source →
   `absorb(paymentId)`; senza → `create`.
3. E2E money: emit → QuickPayment incassa → **1 solo** payment `ricevuto`,
   `pendingPaymentsTotal` torna a 0 per quel progetto (non raddoppia).
4. E2E money: progetto con in_attesa manuale → emit → **1 solo** in_attesa
   collegato (non 2).
5. Cassa: dopo settle, `cashReceivedNet` aumenta dell'importo una sola volta.
6. Browser WF-17 desktop + mobile: incasso rapido su fattura emessa → niente
   doppione visibile.

## Semantica — CONFERMATA dall'utente (2026-06-17)

1. **Incasso parziale**: il settle aggiorna `amount` all'incassato (950) e chiude
   l'atteso (`ricevuto`); il residuo (50) resta "Da incassare" via `balance_due`
   (lavoro − incassato, cumulativo) — coerente col modello canonico. CONFERMATO.
2. **Match multiplo** (>1 atteso collegato sullo stesso progetto): NON indovinare
   → fallback `create` di un pagamento normale + hint. CONFERMATO.

## Review gate

1. Review utente spec (domande aperte).
2. Review spec multi-superficie + RAG (DB/payments, fiscale cassa, frontend/mobile,
   provider/EF, TDD).
3. Piano + review piano.
4. Impl TDD → review impl.
5. Browser desktop + mobile (WF-17).
6. PROD gated (OK utente): deploy EF `invoice_emit` (FIX-4 tocca l'EF);
   FIX-3 e' frontend (Vercel). Smoke prod emit→incasso→1 pagamento.

## Stop point

- Niente settle "alla cieca" su match ambiguo.
- Niente seconda verita': riusare il link `financial_document_id`.
- Niente prod senza verde locale + browser + OK utente.
