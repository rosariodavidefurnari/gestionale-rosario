# Riconciliazione incasso atteso su /payments/create (FIX-3 gemello) — Design Spec

Data: 2026-06-19
Stato: SCOPE DECISO = **A (avviso + scorciatoia, frontend-only)** dall'utente
2026-06-19. **Review spec multi-superficie + RAG FATTA** (3 revisori; money PASS,
frontend FLAG, TDD FLAG) → vedi blocco autoritativo sotto. Pronta per il PIANO.
(C = chiusura totale nel form, rimandata a quando l'emissione da app è in uso.)

## REVISIONE SPEC (post review multi-superficie + RAG) — AUTORITATIVA

Vince sul corpo. Money reviewer: **PASS** (esposizione=0 VERIFICATA sul sorgente —
solo `invoiceEmit.ts:202-203` scrive `in_attesa`+`financial_document_id`; seed
(`seed_domain_data.sql`) non ha la colonna, `invoice_import_confirm` non la setta,
migration `20260616200000` additiva senza backfill → nessun atteso orfanabile oggi;
fiscale intatto; A-now/C-later corretto). Frontend + TDD: **FLAG**, correzioni
obbligatorie prima del piano (tutte verificate su file:line):

- **F1 (BLOCKER) — gate create-only.** `PaymentInputs.tsx` è importato sia da
  `PaymentCreate.tsx:67` sia da `PaymentEdit.tsx:30`. Una card lì scatterebbe anche
  in EDIT — incluso quando l'utente apre l'atteso emesso stesso per segnarlo
  ricevuto (UPDATE che NON crea doppione) → falso allarme. La card deve renderizzare
  SOLO in create: `useRecordContext() === undefined` (pattern repo, es.
  `ClientInputs.tsx:33`). RTL: caso "nascosta in edit".
- **F2 (BLOCKER) — steer link = `/projects/:id/show` SEMPLICE.** NON usare
  `buildProjectQuickPaymentPathFromDraft` (`paymentLinking.ts:324`): inietta
  `launcher_source=unified_ai_launcher` + `open_dialog=quick_payment` →
  (a) banner falso "Aperto dalla chat AI" in `QuickPaymentDialog.tsx:318` e
  (b) auto-open del dialog (`:193-201`). Link semplice al project show (l'utente
  clicca "Pagamento" da sé, che salda via FIX-3). `buildProjectShowPath`
  (`paymentLinking.ts:141`) è PRIVATO → esportarlo o costruire inline il path come
  `PaymentShow.tsx:180`.
- **F3 — filtro candidati key+null.** Usare `{ "project_id@eq": projectId,
  "status@eq": "in_attesa", "financial_document_id@not.is": null }` (chiave
  `field@operator` + valore JS `null`), come `QuickPaymentDialog.tsx:127-138`. NON
  la stringa letterale `"financial_document_id@not.is null"` (il corpo §"riuso" va
  letto con questa correzione) → altrimenti fetch vuota = warn mai (falso negativo).
- **F4 (TDD) — predicato puro falsificabile.** Aggiungere a
  `quickPaymentReconciliation.ts`:
  `wouldOrphanExpectedPayment(candidates, draft) = decideQuickPaymentTarget(candidates, draft).action !== "create"`
  + unit test (pinna "settle|ambiguous→warn; create→silent"). NON re-implementare i
  gate `ricevuto`/absorbable nella card (seconda verità): delegare al decider.
- **F5 (TDD) — RTL con form-context REALE.** Nessun test atomic-crm usa
  `FormProvider`/`useForm` oggi → wrapper `useForm()+FormProvider` con
  `defaultValues={{project_id,status,payment_type}}` è un DELIVERABLE nominato
  (preferito al mock di `useWatch`, anti-tautologia). Mock `useGetList` per chiave
  `financial_document_id@not.is`. Assert: testo+bottone presenti quando candidato
  emesso + ricevuto + assorbibile; **null** se gate flip (`in_attesa`/`rimborso_spese`)
  o 0 candidati; **NESSUN `setValue`** (display-only, a differenza di
  `QuotePaymentSuggestionCard` che auto-applica); target bottone via il path reale.
- **MINOR**: ref file — l'handoff quote è in `QuoteShowActions.tsx` (non
  `QuoteShow.tsx`); aggiungere `PaymentList` "Crea" tra gli handoff che ereditano
  il fix (tutti atterrano su `/payments/create`). Money R1: il piano citi la prova
  CODE-level dell'esposizione=0 + query prod `select count(*) from payments where
  financial_document_id is not null` (atteso 0) come check determinismo.

Stato: review spec chiusa → via libera al PIANO (con F1-F5 vincolanti).

Origine: follow-up dichiarato out-of-scope v1 di FIX-3+4
(`2026-06-17-expected-payment-reconciliation-design.md`, nota I5). FIX-3 ha
riconciliato l'incasso atteso SOLO in `QuickPaymentDialog`; gli altri flussi di
creazione pagamento restano "gemelli orfani".

## Problema (verificato sul reale)

Dopo `invoice_emit` esiste un `payment` ATTESO (`in_attesa` +
`financial_document_id`) per la fattura emessa. FIX-3 fa sì che l'Incasso rapido
dal progetto (`QuickPaymentDialog`) lo SALDI invece di creare un doppione. Ma se
l'utente registra l'incasso da un'ALTRA superficie, l'atteso resta orfano →
doppio conteggio in `pendingPaymentsTotal` ("Da incassare", lato dashboard/AI;
NB: la card "Da incassare" post-QW2 legge `balance_due` cumulativo, ma il forecast
cashflow e l'AI usano ancora `pendingPaymentsTotal`).

Superfici di creazione pagamento (mappate via RAG :8001 + verificate su sorgente):

- **`src/components/atomic-crm/payments/PaymentCreate.tsx` + `PaymentInputs.tsx`**
  — UNICO writer reale del flusso `/payments/create`. `CreateBase redirect="show"`
  + `Form` + `FormToolbar` (save standard ra-core → `dataProvider.create`).
  Campi via `useWatch`: `client_id`, `project_id`, `quote_id`, `payment_type`,
  `amount`, `status` (default `in_attesa`). `defaultValues` da URL search.
- **`ClientShow.tsx` (`client_create_payment`)** e **`QuoteShow.tsx`
  (`quote_create_payment`)** — NON scrivono: sono handoff di NAVIGAZIONE a
  `/payments/create` con context in querystring (`buildPaymentCreatePathFrom*`).
  Quindi il writer da coprire è uno solo: PaymentCreate.
- **`invoice_import_confirm` (EF)** — ha già la sua riconciliazione
  status-agnostic per `financial_document_id` (FIX "Emetti fattura"): FUORI scope.
- **`QuickPaymentDialog`** — già coperto da FIX-3.

## Esposizione attuale (deterministico)

Su PROD ci sono **0 fatture app-emesse** (verificato nei cicli invoice_emit/void:
nessuna riga con `financial_document_id` app-generato; backfill non necessario).
Quindi oggi `/payments/create` NON può orfanare un atteso emesso (non ne
esistono). Il buco è **reale ma a esposizione zero ORA**; diventa attivo appena
l'utente inizia a emettere fatture dall'app. Questo pesa sulla scelta di scope:
non over-ingegnerizzare un percorso ancora non esercitato.

## Fonte di verità / riuso (SYSTEM-FIRST)

Esiste già il decider puro `decideQuickPaymentTarget(candidates, draft)` →
`settle | create | ambiguous` (`projects/quickPaymentReconciliation.ts`, gate
`payment_type` saldo/acconto/parziale) e il pattern candidati
(`useGetList payments project_id@eq + status@eq in_attesa +
financial_document_id@not.is null`). RIUSARE quello, non inventarne un terzo.

## Decisione di design — OPZIONI (da decidere in review)

- **A — Hint + steer (basso rischio, NON chiude al 100%)**: in `PaymentInputs`
  una card (pattern `QuotePaymentSuggestionCard`) che, quando `project_id` set +
  `status=ricevuto` + tipo assorbibile + esiste ≥1 atteso emesso collegato,
  AVVISA: "Questo progetto ha una fattura emessa con incasso atteso €X.
  Registrando qui crei un doppione: usa l'Incasso rapido dal progetto per saldarlo"
  + bottone che naviga al progetto/apre `QuickPaymentDialog` (che già salda).
  Frontend-only, zero rischio sul save generico. Mitiga, non impedisce.
- **C — Settle reale nel create (chiude al 100%, rischio medio)**: custom save in
  PaymentCreate: se il decider dice `settle` (project ctx + ricevuto + assorbibile
  + 1 candidato) → `update` di quella riga (status ricevuto, payment_date reale
  mai null/futuro, amount) invece di `create`, redirect alla riga saldata; su
  `ambiguous` (>1) → blocca + steer al picker del dialog; altrimenti create
  normale. Riusa il decider. Più codice/rischio sul form generico (usato anche per
  client-level/quote-level/no-project).
- **B — Provider-level guard (scartata)**: intercettare in `dataProviderPayments`
  ogni create → troppo implicito, rompe la prevedibilità del provider.

**Raccomandazione**: **A adesso** (proporzionata all'esposizione zero, riusa il
settle esistente, frontend-only), **C come follow-up** quando l'emissione da app
è realmente in uso e si vuole la chiusura totale. Decisione finale all'utente in
review (tradeoff UX/effort non deducibile dal repo).

## Non-obiettivi

- NON toccare `invoice_import_confirm` (ha già la sua riconciliazione).
- NON inventare un terzo decider: riusare `decideQuickPaymentTarget`.
- NON cambiare il default `in_attesa` del form generico.
- NON gestire qui client-level senza progetto (out-of-scope, come FIX-4 B2).

## Invarianti / rischi

| Sev | Rischio | Mitigazione |
|---|---|---|
| 🔴 | Doppio conteggio "Da incassare" (il buco) | A: steer al settle esistente; C: settle in place |
| 🟠 | (C) settle della riga sbagliata su >1 atteso | decider `ambiguous` → blocca + picker dialog |
| 🟠 | (C) cassa errata / payment_date null su ricevuto | `paymentDate` oppure `todayISODate()`, mai null (VP2/DOM-1) |
| 🟠 | Mobile parity | PaymentCreate/Inputs unica per desktop+mobile (`useIsMobile` solo layout) |
| 🟡 | A non impedisce il doppione | accettato: esposizione zero ora + steer chiaro |

## Controllori (MONEY — TDD)

- Riuso `decideQuickPaymentTarget` (già testato).
- A: RTL sulla hint card (mostra avviso + link solo quando candidato emesso esiste
  + ricevuto + tipo assorbibile; nascosta altrimenti).
- C (se scelto): RTL che il save chiama `update` non `create` su settle; e2e
  invariante DB (no doppione).
- Browser WF-17 desktop+mobile.

## Review gate

1. Review spec multi-superficie + RAG (DB/payments, fiscale cassa, frontend/mobile,
   provider, TDD) + **decisione scope A vs C**.
2. Piano + review piano.
3. Impl TDD → review impl.
4. Browser desktop+mobile.
5. Ship: frontend-only (Vercel al merge) se A; se C resta frontend (nessuna EF).

## Stop point

- Niente settle "alla cieca" su match ambiguo.
- Niente seconda verità: riusare il link `financial_document_id` + il decider.
- Niente "fatto" senza parità desktop/mobile e browser su entrambe.
