# Riconciliazione incasso atteso su /payments/create (scope A) — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans.
> Deriva dalla spec autoritativa:
> `docs/superpowers/specs/2026-06-19-payment-create-reconciliation-design.md`
> (LEGGERE il blocco "REVISIONE SPEC AUTORITATIVA": F1-F5 vincolanti).

**Goal:** su `/payments/create`, quando registrare un incasso orfanerebbe un
incasso ATTESO emesso (FIX-3 gemello), mostrare una card di AVVISO non bloccante
che spiega il doppione e indirizza all'Incasso rapido del progetto (che salda).
Frontend-only, display-only (nessuna scrittura), riusa il decider esistente.

## REVISIONE PIANO (post plan-review + RAG) — AUTORITATIVA

Vince sul corpo. Plan-review: **FLAG**, 2 HIGH (tsc/test-breaking) + low, fix
verificati su file:line:

- **PR-H1 — `buildProjectShowPath` 2° arg OBBLIGATORIO** (`paymentLinking.ts:141`).
  `buildProjectShowPath(projectId)` con 1 arg → tsc fail. **Fix**: in Task 2 rendere
  il 2° param opzionale con default `= {}` (`defaults: Record<string,...> = {}`),
  così `buildProjectShowPath(projectId)` compila e ritorna `/projects/<id>/show`.
  ATTENZIONE: la fn ritorna `string | null` (null se projectId vuoto) → in Task 3
  gattare il `<Link>` su path non-null.
- **PR-H2 — mock `react-router` deve essere PASSTHROUGH** (Task 4). La card importa
  `Link` da `react-router`; il recipe di `QuickPaymentDialog.test.tsx:21` mocka
  `react-router` NON-passthrough (solo `useLocation`) → `Link` undefined → render
  throw. **Fix**: `vi.mock("react-router", async () => ({ ...(await
  vi.importActual("react-router")), useLocation: () => ({ search: "" }) }))` oppure
  wrappare in `<MemoryRouter>`. (QuickPaymentDialog non rende `<Link>`, per questo
  il suo recipe non basta.)
- **PR-L1 — `toNum` è privato** (`QuickPaymentDialog.tsx:42`, non esportato) →
  in Task 3 definire un helper locale identico (shape candidate uguale a
  `QuickPaymentDialog.tsx:140-147`, no seconda verità).
- **PR-L2 — mock `useRecordContext`** (ra-core) nel test: default `undefined`
  (create); per il caso edit ritornare un record. Il recipe mock-by-filter-key
  (`financial_document_id@not.is`) di QuickPaymentDialog TRANSFERISCE.
- CONFERMATI corretti: Task 1 predicato + `exp()`/`draft()` helper bastano; F1
  gate `useRecordContext()===undefined` (precedente `ClientInputs.tsx:33`,
  `CreateBase` non crea record context, `EditBase` sì); `Link` da `react-router`
  è la convenzione (`PaymentShow.tsx:24`); `{enabled}` 3° arg reale; filtro key+null
  combacia.

### REVISIONE PIANO v2 — review TRASVERSALE (4 competenze) — AUTORITATIVA

DB/RLS/provider: **PASS** (`not.is.null` serializza ok, RLS authenticated ok,
`financial_document_id` indicizzato `20260616200000:31`, nessun trigger su read).
Sweep superfici: **PASS** — tabella completa, NESSUN writer mancante: PaymentCreate
(target), QuickPaymentDialog (FIX-3), invoice_emit (emitter), invoice_import_confirm
(non setta mai la FK, ha sua riconciliazione), invoiceImportProvider#5 (DEAD/test-only),
DeadlineTracker "Incassato" (UPDATE non create), invoice_void (un-mark). Routing:
**PASS** (HashRouter → `<Link to="/projects/x/show">` ok, precedente
`PaymentShow.tsx:179`). Lifecycle: **FLAG** → correzioni:

- **V2-A (a11y/UI)**: usare il componente `@/components/ui/alert` `<Alert role="alert">`
  (ha già `role="alert"`) invece di un `<div>` nudo; per il colore warning usare il
  pattern `ExpenseInputs.tsx:135` `bg-amber-50 text-amber-700 dark:bg-amber-950/30
  dark:text-amber-400` (NON copiare `PaymentInputs.tsx:390` `text-amber-700` SENZA
  `dark:` → è un bug dark-mode esistente). CTA come `<Link className={buttonVariants(...)}>`
  (anchor reale + look bottone, a11y; precedente `PaymentShow.tsx:67`).
- **V2-B (copy IT, Approccio Bambino)**: Titolo `Questa fattura ha già un incasso
  atteso`; importo a rischio grande (`text-2xl font-bold tabular-nums`,
  `formatCurrency(candidate.amount)`); corpo 1 riga `Registrare qui creerebbe un
  doppione. Salda direttamente dal progetto.`; CTA `Vai al progetto e salda`. Vietato
  gergo ("orfano"/"emit-linked") nel testo utente.
- **V2-C (H2 — invariante load-bearing + test mancante)**: ra-core applica il
  field-level `defaultValue="in_attesa"` (PaymentInputs:235) SOLO se `formValue==null`
  (`useApplyInputDefaultValues`); quindi URL `status=ricevuto` (handoff
  `buildPaymentCreatePathFromDraft`) → form default `ricevuto` vince → **card scatta
  ON-LOAD**. Documentare l'invariante e AGGIUNGERE in Task 4 il caso: create +
  `defaultValues={{project_id, status:"ricevuto", payment_type:"saldo"}}` + 1
  candidato emesso → card VISIBILE al primo render (prova `useWatch`=defaults +
  status default non clobbera). È il path AI-handoff reale, oggi non coperto.
- **V2-D (M4)**: lo `SelectInput` status differisce il change via `setTimeout(0)`
  (`select-input.tsx:194`) → la card ricalcola al tick successivo. In Task 5.2 (WF-17)
  confermare che la card appare SUBITO dopo aver messo "ricevuto", non solo da URL.
- **V2-E (non-goal esplicito)**: project_id null + client_id set (pagamento
  client-level) → card silente (`enabled:!!projectId`), CORRETTO (rischio orfano è
  project-scoped). Dichiararlo non-obiettivo.

Stato: review piano (base + trasversale) chiusa → via libera all'IMPL con tutte le
correzioni sopra vincolanti.

---

**Regole:** SYSTEM-FIRST (riusa `decideQuickPaymentTarget`, no seconda verità),
UI-7 (PaymentCreate/Inputs unica per desktop+mobile), display-only (nessun
`setValue`/create/update), F1 create-only gate, F2 steer link semplice, F3 filtro
key+null, F4 predicato puro, F5 RTL form-context reale.

---

## Task 1 — Predicato puro `wouldOrphanExpectedPayment` (F4, RED→GREEN)

**File:** modify `src/components/atomic-crm/projects/quickPaymentReconciliation.ts`
+ test `quickPaymentReconciliation.test.ts`.

- [ ] **1.1 test RED**: in append a `quickPaymentReconciliation.test.ts`:
  - `wouldOrphanExpectedPayment([exp("p1")], {status:"ricevuto", payment_type:"saldo"})` → `true` (settle)
  - `[exp("p1"),exp("p2")]` ricevuto saldo → `true` (ambiguous)
  - `[]` → `false`; `[exp linked]` + `status:"in_attesa"` → `false`; `payment_type:"rimborso_spese"` → `false`
- [ ] **1.2 impl**: 
  ```ts
  export const wouldOrphanExpectedPayment = (
    candidates: ExpectedPaymentCandidate[],
    draft: { status: string; payment_type: string },
  ): boolean => decideQuickPaymentTarget(candidates, draft).action !== "create";
  ```
  (delega al decider; NON re-implementare i gate.)
- [ ] **1.3** `npx vitest run quickPaymentReconciliation.test.ts` → verde. Commit step.

## Task 2 — Esporre `buildProjectShowPath` (F2)

**File:** modify `src/components/atomic-crm/payments/paymentLinking.ts`.

- [ ] **2.1**: `export const buildProjectShowPath` (riga ~141) E rendere il 2°
  param opzionale: `defaults: Record<string, string | number | null | undefined> = {}`.
  Così `buildProjectShowPath(projectId)` compila (1 arg) e ritorna
  `/projects/<id>/show` pulito (nessun launcher param → no banner AI, no auto-open).
  La fn ritorna `string | null` (null se projectId vuoto) → Task 3 gatta il `<Link>`
  su path non-null. Caller interno `buildProjectQuickPaymentPathFromDraft:332` (passa
  2 arg) non impattato.
- [ ] **2.2** `npx tsc --noEmit` verde.

## Task 3 — Card avviso `ExpectedPaymentOrphanHint` in PaymentInputs (F1/F2/F3)

**File:** modify `src/components/atomic-crm/payments/PaymentInputs.tsx`.

- [ ] **3.1** nuovo componente interno `ExpectedPaymentOrphanHint`:
  - `useRecordContext()` → se DEFINITO (edit mode) ritorna `null` (F1 create-only).
  - `useWatch` su `project_id`, `status`, `payment_type`.
  - `useGetList<Payment>("payments", { filter: { "project_id@eq": String(projectId),
    "status@eq":"in_attesa", "financial_document_id@not.is": null },
    pagination:{page:1,perPage:100} }, { enabled: !!projectId })` (F3 key+null).
  - mappare a `ExpectedPaymentCandidate[]` (id, amount toNum, status,
    financial_document_id ?? null).
  - se `!wouldOrphanExpectedPayment(candidates, {status, payment_type})` → `null`.
  - altrimenti: card amber (pattern `QuotePaymentSuggestionCard`: dashed border,
    muted) — UN messaggio chiaro (Approccio Bambino) con l'importo atteso grande +
    1 sola CTA `Link` a `buildProjectShowPath(projectId)` ("Vai al progetto e
    registra lì l'incasso per saldare la fattura"). NESSUN `setValue` (display-only).
  - import `Link` da `react-router` (come altri link interni) o `<a href={#/...}>`.
- [ ] **3.2** montare `<ExpectedPaymentOrphanHint />` in `PaymentDetailInputs`
  dopo lo `status` (vicino all'azione, non in cima).
- [ ] **3.3** `npx tsc --noEmit` verde.

## Task 4 — RTL test (F5, form-context reale)

**File:** create `src/components/atomic-crm/payments/PaymentInputs.test.tsx`
(o `ExpectedPaymentOrphanHint.test.tsx`).

- [ ] **4.1** wrapper: `QueryClientProvider` + RHF `useForm()`+`FormProvider`
  con `defaultValues`; mock `ra-core` `useGetList` (branch su chiave
  `financial_document_id@not.is` → candidati; altrimenti []), `useRecordContext`
  (default `undefined` = create), `useGetOne` se serve. Render solo la card.
- [ ] **4.2** casi:
  - create + project + ricevuto + saldo + 1 candidato emesso → testo avviso +
    bottone (role link) verso `/projects/<id>/show` presenti.
  - edit mode (`useRecordContext` → record) → `null` (F1).
  - status `in_attesa` → `null`; `payment_type:"rimborso_spese"` → `null`;
    0 candidati → `null` (gate flip, non solo lista vuota).
  - assert **nessun `setValue`** chiamato (display-only).
- [ ] **4.3** `npx vitest run` sul file → verde.

## Task 5 — Verifica finale + browser WF-17 (con DATI DEMO + cleanup sistematico)

- [ ] **5.1** `npx vitest run` (tutta la suite) + `npx tsc --noEmit` + `npm run lint`
  + `npm run prettier` → verdi.
- [ ] **5.2 WF-17 browser desktop + mobile — DATI DEMO DETERMINISTICI + TEARDOWN.**
  La card scatta solo con un atteso EMESSO collegato (oggi inesistente in locale):
  va CREATO il dato demo e RIMOSSO sistematicamente. Pattern obbligatorio (mirror
  dello smoke prod `prod-smoke-fix4.mjs` già usato: setup → asserzioni → `finally`
  cleanup completo → verifica 0 leftover):
  - **Setup** (script idempotente, marker riconoscibile es. `DEMO-ORPHAN-<ts>`):
    creare client + project + service (`km_distance:0` per non innescare il trigger
    km) e un `payment` `in_attesa` con `financial_document_id` non nullo sul progetto
    — via REST con la stessa via dello smoke (o `invoice_emit` su un service usa-e-getta,
    che popola la FK). NIENTE scrittura su dati reali del dominio.
  - **Test**: aprire `/payments/create?project_id=<demo>&status=ricevuto&payment_type=saldo`,
    desktop + mobile: card visibile, importo grande, CTA `Vai al progetto e salda`
    naviga al project show, 0 errori console dal surface.
  - **Teardown in `finally`** (sempre, anche se il test fallisce): cancellare in
    ordine inverso payment/doc (via `invoice_void` se emesso) → service → project →
    client → eventuale smoke user. POI verificare **0 leftover**
    (`like 'DEMO-ORPHAN-%'` → 0 righe su clients/projects). Nessun residuo nel DB.
  - Locale: usare il Supabase locale (`55321`), MAI prod per la creazione demo.
- [ ] **5.3 esposizione prod (determinismo, R1, READ-ONLY).** `select count(*) from
  payments where financial_document_id is not null` → atteso 0 (gap teorico oggi).
  Solo lettura: su prod NON creare dati demo.

## Task 6 — Docs + commit unico + ship

- [ ] **6.1** docs: `development-continuity-map` (sezione FIX-3 gemello) + handoff +
  backlog (segna gemello /payments/create coperto con A; C deferred) + CANTIERE +
  learning (estendi DB-10/UI sul riuso decider per warn cross-surface).
- [ ] **6.2** branch `fix/payment-create-orphan-hint`, commit unico (codice+test+docs),
  pre-commit verde.
- [ ] **6.3** review impl multi-superficie + RAG → poi merge `main` + CI
  (`gh -R rosariodavidefurnari/...`). Frontend-only → Vercel auto-deploy. Nessuna EF.

## Self-review (writing-plans)
- Copertura spec autoritativa: F1 (3.1 create-only), F2 (Task2 export + 3.1 link),
  F3 (3.1 filtro key+null), F4 (Task1 predicato), F5 (Task4 form-context). ✓
- Display-only: nessun create/update/setValue (Task3 + assert 4.2). ✓
- No seconda verità: warn delega a `decideQuickPaymentTarget`. ✓
- Tipi: `ExpectedPaymentCandidate` riusato; predicato shape identica al decider. ✓
