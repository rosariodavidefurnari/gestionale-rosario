# Emetti Fattura (invoice_emit) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development
> (o executing-plans). Step con checkbox `- [ ]`. Deriva dalla spec v2
> autoritativa: `docs/superpowers/specs/2026-06-16-invoice-emit-design.md`.

**Goal:** dalla bozza fattura esistente, un'azione "Emetti fattura" che in
un'unica transazione registra la fattura (`financial_documents` outbound), crea
l'incasso ATTESO (`payments` `in_attesa`, fiscalmente neutro) e marca i lavori
come fatturati (`invoice_ref`), senza doppi conteggi al re-import dell'XML.

**Architecture:** Edge Function transazionale `invoice_emit` (atomica) invocata
da un metodo provider `emitInvoice`, agganciata come terza azione in
`InvoiceDraftDialog`. Migration additiva `payments.financial_document_id` come
ancora anti-doppione. `invoice_import_confirm` esteso con un ramo additivo
update-in-place. `invoices`/`financial_documents_summary` restano read-only.

**Tech Stack:** React 19 + TS + ra-core, Supabase (Postgres + Edge Functions
Deno/Kysely), Vitest, ra-data-postgrest.

**Regole attive:** MONEY/FISCAL TDD (RED prima), additive migration (DB-2),
config.toml per nuova EF (BE-2), deploy EF manuale (BE-1, ref
`qvdmzhyzpyaveniirsmo` BE-8), date via `dateTimezone` (WF-8/WF-10), km no-doppio
(DB-8), dedup guard flow rapidi (WF-14), parita' mobile (UI-7), niente prod
senza verde locale + OK utente.

---

## REVISIONE v2 (post review piano multi-superficie + RAG) — AUTORITATIVA

Dove confligge col corpo sotto, vince questa. La review (5 revisori, RAG +
sorgente) ha trovato 5 critical che rendevano il piano non eseguibile; corretti
qui, ogni claim riverificato sul sorgente.

### Nuovo Task 0 — Estendere i tipi Kysely (`_shared/db.ts`) [C3]

`db.ts` `Database` ha solo `payments: PaymentsTable` (no `financial_documents`,
no `services`); `PaymentsTable` non ha `financial_document_id` (verificato
`_shared/db.ts:91,118-125`). Prima di tutto: aggiungere
`FinancialDocumentsTable`, `ServicesTable`, `ExpensesTable` (i campi usati:
`id`, `invoice_ref`, `source_service_id`, `project_id`, `client_id`) e
`financial_document_id: string | null` a `PaymentsTable`; registrarle in
`Database`. Controllore eseguibile (no `deno check` in CI):
`deno check supabase/functions/invoice_emit/index.ts` deve passare.

### C1 — Idempotenza EF SENZA insert+catch in transazione

Il driver Deno (`_shared/db.ts:154-155`) ha solo `begin`, niente savepoint: una
violazione UNIQUE aborta la transazione, il `catch` JS non recupera, il COMMIT
fallisce (rollback totale). VIETATO il pattern "insert + catch 23505". Invece:
**pre-flight SELECT** su `financial_documents` per `(client_id,
direction='outbound', document_number, issue_date)` PRIMA di aprire le scritture;
se esiste → ritorna `{status:"already_emitted", financialDocumentId}` senza
scrivere. (In alternativa `onConflict(...).doNothing().returning('id')` e
`rows.length===0` ⇒ already_emitted.) Controllore #8 riscritto su questo.

### C1bis — Guard server-side dentro l'EF (deferral acconto + race)

- L'EF RIFIUTA `grossTaxable !== netCollectable` con errore esplicito
  ("acconto pregresso non supportato in v1"): il deferral acconto e' garantito
  server-side, non solo dalla UI.
- Dopo gli UPDATE: se `servicesMarked + expensesMarked !=
  serviceIds.length + expenseIds.length` ⇒ throw ⇒ rollback (race draft-vs-emit:
  qualche riga gia' fatturata altrove). Controllore sul confronto count.

### C2 + C4 — Re-import: funzione pura + group-by, ancora primaria `financial_document_id`

Il prompt import crea **un record per riga** (verificato
`invoice_import_extract/index.ts:59`): una fattura emessa re-importata genera N
record con stesso `invoice_ref`. Il "trova payment in_attesa" dopo il 1° update
ritorna 0 per i record 2..N ⇒ cadono nel create ⇒ duplicati. Correzione:

- Estrarre funzione PURA testabile (vitest) in `_shared/invoiceImportConfirm.ts`:
  `decideEmittedPaymentReconciliation({ recordsForInvoiceRef, emittedPayment })
  → { action: "settle"|"create", paymentIdToSettle?, skipRecordIndexes }`.
  Regola: se esiste un payment emesso dall'app per quell'`invoice_ref`
  (ancora PRIMARIA `financial_document_id IS NOT NULL`; fallback `invoice_ref`
  solo se nato dall'emit), allora 1 record → settle (in_attesa→ricevuto +
  payment_date reale), gli altri N-1 → skip. Mai toccare payment `in_attesa`
  MANUALI (senza `financial_document_id`).
- Nel loop di `invoice_import_confirm` tenere un `Set<invoiceRef>` gia'
  riconciliati per non ri-processare le righe 2..N.
- Test puro con N=3 righe stesso ref ⇒ 1 settle + 2 skip. (In v1 senza acconto
  e' 1→1, ma il guard intra-batch va comunque scritto.)

### C4 — Falsificabilita' dei controllori (layer dichiarato)

I test `_shared/*.test.ts` sono solo su funzioni pure (vitest non apre Postgres;
no `deno test` in CI). Mappare ogni controllore al suo layer:
- pure (vitest): `computeInvoiceDraftAmounts`, builder serviceIds/expenseIds,
  `decideEmittedPaymentReconciliation`, `isInvoiceBillingComplete`,
  validazione EF (`grossTaxable!=netCollectable`).
- E2E smoke (`tests/e2e/invoices.smoke.spec.ts` + `resetAndSeedTestData`):
  **controllore cardine #1** (emit → 1 financial_document + 1 payment; re-import
  stesso XML ⇒ ancora 1), #3 (project_financials invariato), #4 (ri-bozza
  collectable<=0). Dichiarato esplicitamente, non "query a mano".

### C5 — Nuovo task prima della UI: `isInvoiceBillingComplete`

`billingComplete` NON esiste (grep src/ = 0); `clientBilling.ts` ha solo helper
di display; `buildInvoiceDraftXml` non valida (tag vuoti → Aruba scarta in
silenzio, DOM-3). Nuovo task: helper PURO testato
`isInvoiceBillingComplete({ client, issuer }) → { ok, missing: string[] }` sui
campi realmente usati dall'XML (issuer: name, vatNumber, address*; client:
name|billing_name, vat_number|fiscal_code, billing_address_*). Il gate del
bottone e il RED Task 6 dipendono da questo; la UI mostra i `missing`.

### Correzioni IMPORTANT/MINOR

- **F4 (rationale corretto):** la vista corrente
  `20260401094930_single_source_financials.sql` legge `total_paid` da
  `payments WHERE status='ricevuto'` (no dual-path). L'emit e' cassa-neutro
  perche' il payment nasce `in_attesa` (filtrato via), NON per via di
  `payment_semantics_basis`. Controllore #3: `project_financials`
  `total_paid`/`balance_due` invariati post-emit.
- **Task 5b match primario** su `financial_document_id` (non
  `client_id+invoice_ref+in_attesa`, che catturerebbe payment manuali).
- **Task 3 RED con fixture reali:** `buildService(id, {fee_shooting, fee_editing,
  fee_other, discount})` (netto via `calculateServiceNetValue`,
  `crmSemanticRegistry.ts:177-184`), `buildExpense`; aggiungere caso
  **service km-only** (netValue=0, kmValue>0) ⇒ in `serviceIds`.
  `buildInvoiceDraftFromClient` ritorna `null` (non draft vuoto) quando
  collectable<=0 (`:171`): la parita' id↔lineItems vale solo sul draft non-null.
- **Task 7 fetch bulk:** LIST = un solo `useGetList('payments', {filter:
  {'financial_document_id@in': ids}})`; SHOW = `@eq` su record.id; documento
  senza payment (import storico) ⇒ badge NEUTRO, mai falso "non saldata".
- **Task 8 sweep registry:** aggiornare `crmCapabilityRegistry.ts:359-366`
  ("dialog senza scritture DB" diventa falso) e `crmSemanticRegistry.ts:474`
  ("dedup stretto invoice_ref"); se si tocca `src/lib/semantics/`, includere
  ANCHE `historical-analytics-handoff.md` + `historical-analytics-backlog.md` +
  `architecture.md` nello stesso commit (`check-continuity.mjs:157-182`).
  Aggiungere `client_commercial_position` ai docs (consumer payments, protetto
  da `status='ricevuto'`).
- **Minori:** Task 1 usa `--local` non `--linked` (verifica locale, lo stop
  point vieta prod); verifica `confdeltype` nel WHERE (`where confdeltype='n'`,
  assert count=1) non come colonna grezza; dedup guard UI su
  `financial_documents_summary` (`client_id@eq` + `document_number@eq`), il vero
  anti-doppio-click resta la UNIQUE server-side; riferimento Sheet =
  `DichiarazioneEntryDialog.tsx:292-306`; RIMUOVERE "MobileDashboard parity"
  (non consuma il dialog) — la parita' mobile reale e' il branch Sheet; estrarre
  hook `useEmitInvoice` (dedup async su mock getList + builder messaggio puro,
  WF-14) per non gonfiare il dialog; rinominare `invoiceNumber`→`documentNumber`;
  documentare i limiti v1: re-emit con stesso numero ma `issue_date` diversa NON
  bloccato dalla UNIQUE (2 documenti) → `window.confirm` + nota; delta bollo €2
  = residuo noto → BR2.

### Ordine task v2

Task 0 (db.ts types) → Task 1 (migration) → Task 2 (amounts helper) →
Task 2b (`isInvoiceBillingComplete`) → Task 3 (builder ids) →
Task 3b (`decideEmittedPaymentReconciliation` puro) → Task 4 (EF, pre-flight +
guard) → Task 5 (provider) → Task 5b (import update-in-place con group-by) →
Task 6 (UI, `useEmitInvoice`, Sheet) → Task 7 (stato incasso bulk) →
Task 8 (continuity + registry) → E2E smoke + verifiche finali.

---

## Scoping v1 (decisione di sicurezza)

- **Sorgenti:** solo `source.kind in ('project','client')`. Quote/singolo
  service fuori scope (non hanno `invoice_ref` marcabile).
- **Acconto pregresso fuori scope v1.** Se la bozza contiene la riga
  `kind:"payment"` ("Pagamenti gia ricevuti", `receivedTotal>0`), il bottone
  Emetti e' DISABILITATO con messaggio ("Fattura con acconto pregresso:
  gestione manuale per ora"). Cosi' `grossTaxable == netCollectable` e non c'e'
  ambiguita' lordo/netto ne' del bollo. L'acconto arriva in una v2 dedicata.
- **Annullo/storno fuori scope v1** (rimedio manuale documentato).
- **`financial_documents_summary.settlement_status` NON si ricabla**: lo stato
  d'incasso in Fatture si deriva dal payment collegato (Task 8).

---

## File Structure

- Create: `supabase/migrations/<ts>_payments_financial_document_link.sql`
- Modify: `src/components/atomic-crm/types.ts` (Payment.financial_document_id)
- Modify: `src/components/atomic-crm/invoicing/invoiceDraftTypes.ts`
  (`computeInvoiceDraftAmounts`, campi opzionali `serviceIds`/`expenseIds`)
- Test: `invoiceDraftTypes.test.ts` (esiste? altrimenti create)
- Modify: `buildInvoiceDraftFromProject.ts`, `buildInvoiceDraftFromClient.ts`
  (espongono `serviceIds[]`/`expenseIds[]`)
- Test: `buildInvoiceDraftFromProject.test.ts`, `buildInvoiceDraftFromClient.test.ts`
- Create: `supabase/functions/invoice_emit/index.ts` + `supabase/functions/_shared/invoiceEmit.ts` (logica pura)
- Test: `supabase/functions/_shared/invoiceEmit.test.ts`
- Modify: `supabase/config.toml` (`[functions.invoice_emit] verify_jwt = false`)
- Create: `src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.ts`
- Modify: `providers/supabase/dataProvider.ts` (wire `emitInvoice`)
- Modify: `supabase/functions/invoice_import_confirm/index.ts` (+ `_shared/invoiceImportConfirm.ts`) ramo update-in-place
- Test: `_shared/invoiceImportConfirm.test.ts`
- Modify: `invoicing/InvoiceDraftDialog.tsx` (terza azione + Sheet mobile + dedup guard)
- Test: `InvoiceDraftDialog.test.tsx`
- Modify: `invoices/FinancialDocumentShow.tsx` + `FinancialDocumentListContent.tsx` (stato incasso dal payment)
- Modify continuity: `docs/architecture.md`, `docs/development-continuity-map.md`
- Modify: `.claude/rules/learning.md` (nuovi trigger se emergono)

---

## Task 1: Migration `payments.financial_document_id`

**Files:** Create `supabase/migrations/<ts>_payments_financial_document_link.sql`;
Modify `src/components/atomic-crm/types.ts`.

- [ ] **Step 1 — RED (controllo):** query che dimostra l'assenza della colonna.

Run (locale): `npx supabase db query --linked` su DB locale con
`select column_name from information_schema.columns where table_name='payments' and column_name='financial_document_id';`
Atteso: 0 righe (RED).

- [ ] **Step 2 — Migration additiva (replayable, DB-2).**

```sql
-- Link a payment to the financial_document it settles.
-- Anchor for anti-double-counting: emit creates payment(in_attesa) carrying
-- the financial_document_id; the XML re-import matches on it (or on
-- client_id+invoice_ref+in_attesa) and updates in place instead of inserting.
-- Additive + replayable. ON DELETE SET NULL: deleting a document must NEVER
-- delete the real cash record, only unlink it.
alter table public.payments
  add column if not exists financial_document_id uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'payments_financial_document_id_fkey'
      and table_name = 'payments'
  ) then
    alter table public.payments
      add constraint payments_financial_document_id_fkey
      foreign key (financial_document_id)
      references public.financial_documents(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_payments_financial_document_id
  on public.payments (financial_document_id);
```

- [ ] **Step 3 — Apply locale:** `npx supabase migration up` (o reset). Verifica
  colonna presente (query Step 1 → 1 riga) e FK `SET NULL` via
  `confdeltype='n'` in `pg_constraint`.

- [ ] **Step 4 — types.ts:** aggiungere `financial_document_id?: string | null`
  a `Payment` (vicino a `invoice_ref`).

- [ ] **Step 5 — Commit** (con continuity docs Task 9 se chiusura, altrimenti
  con questo task): `feat(payments): additive financial_document_id link (SET NULL)`.

---

## Task 2: Helper importi `computeInvoiceDraftAmounts`

**Files:** Modify `invoicing/invoiceDraftTypes.ts`; Test `invoiceDraftTypes.test.ts`.

Distinguere LORDO documento da NETTO da incassare (spec F3). NON toccare
`computeInvoiceDraftTotals` (usato dall'XML: invariato).

- [ ] **Step 1 — RED test:**

```ts
import { computeInvoiceDraftAmounts } from "./invoiceDraftTypes";

it("separates gross document amount from net collectable", () => {
  const lineItems = [
    { description: "Servizio", quantity: 1, unitPrice: 1000, kind: "service" as const },
    { description: "Km", quantity: 1, unitPrice: 100, kind: "km" as const },
    { description: "Pagamenti gia ricevuti", quantity: 1, unitPrice: -300, kind: "payment" as const },
  ];
  const a = computeInvoiceDraftAmounts(lineItems);
  expect(a.grossTaxable).toBe(1100);     // esclude la riga payment
  expect(a.stampDuty).toBe(2);           // 1100 > 77.47
  expect(a.grossTotal).toBe(1102);
  expect(a.netCollectable).toBe(800);    // 1100 - 300
  expect(a.hasPriorReceived).toBe(true);
});
```

Run: `npx vitest run src/components/atomic-crm/invoicing/invoiceDraftTypes.test.ts` → FAIL (funzione assente).

- [ ] **Step 2 — Implementazione:**

```ts
export type InvoiceDraftAmounts = {
  grossTaxable: number;   // imponibile lordo: somma righe service+km+expense (no payment/stamp)
  stampDuty: number;      // bollo sul lordo
  grossTotal: number;     // grossTaxable + stampDuty
  netCollectable: number; // grossTaxable - acconti gia ricevuti (riga payment)
  hasPriorReceived: boolean;
};

export const computeInvoiceDraftAmounts = (
  lineItems: InvoiceDraftLineItem[],
): InvoiceDraftAmounts => {
  const normalized = normalizeInvoiceDraftLineItems(lineItems);
  const grossTaxable = normalized
    .filter((li) => li.kind !== "payment" && li.kind !== "stamp_duty")
    .reduce((sum, li) => sum + getInvoiceDraftLineTotal(li), 0);
  const priorReceived = normalized
    .filter((li) => li.kind === "payment")
    .reduce((sum, li) => sum + getInvoiceDraftLineTotal(li), 0); // negativo
  const stampDuty = grossTaxable > 77.47 ? 2 : 0;
  return {
    grossTaxable,
    stampDuty,
    grossTotal: grossTaxable + stampDuty,
    netCollectable: grossTaxable + priorReceived,
    hasPriorReceived: priorReceived !== 0,
  };
};
```

- [ ] **Step 3 — GREEN:** vitest verde. **Step 4 — Commit.**

---

## Task 3: Builder espone `serviceIds[]` / `expenseIds[]`

**Files:** Modify `invoiceDraftTypes.ts` (campi opzionali), `buildInvoiceDraftFromProject.ts`,
`buildInvoiceDraftFromClient.ts`; Test relativi.

Spec F1: l'EF deve sapere QUALI record marcare. `expenseIds` ESCLUDE
`source_service_id` (DB-8). Gli id devono corrispondere esattamente alle
lineItems incluse.

- [ ] **Step 1 — Tipi:** aggiungere a `InvoiceDraftInput`:
  `serviceIds?: Identifier[]; expenseIds?: Identifier[];`.

- [ ] **Step 2 — RED test (project):**

```ts
it("exposes contributing service and expense ids, excluding km auto-expense", () => {
  const service = makeService({ id: "s1", project_id: "p1", net_value: 500, km_distance: 10 });
  const kmAutoExpense = makeExpense({ id: "e_auto", project_id: "p1", source_service_id: "s1", expense_type: "spostamento_km" });
  const realExpense = makeExpense({ id: "e1", project_id: "p1", expense_type: "materiale", amount: 100 });
  const draft = buildInvoiceDraftFromProject({ project, client, services: [service], expenses: [kmAutoExpense, realExpense] });
  expect(draft.serviceIds).toEqual(["s1"]);
  expect(draft.expenseIds).toEqual(["e1"]);     // e_auto escluso (source_service_id)
});
```

Run vitest → FAIL.

- [ ] **Step 3 — Implementazione (project):** raccogliere gli id mentre si
  costruiscono le lineItems. In `buildInvoiceDraftFromProject.ts`:
  - mappare `projectServices` includendo solo i service con `netValue>0 || kmValue>0` in `serviceIds`;
  - nel loop expenses (gia' filtra `!source_service_id`) raccogliere `expenseIds` per le righe con `amount !== 0`;
  - ritornare `serviceIds`/`expenseIds` solo quando `collectableAmount > 0` (coerente con `lineItems`).

- [ ] **Step 4 — Idem per `buildInvoiceDraftFromClient.ts`** (stessa logica per i
  service/expense del cliente non fatturati).

- [ ] **Step 5 — GREEN** vitest. **Step 6 — Commit.**

---

## Task 4: Edge Function `invoice_emit` (transazionale)

**Files:** Create `supabase/functions/invoice_emit/index.ts`,
`supabase/functions/_shared/invoiceEmit.ts` (puro), Test `_shared/invoiceEmit.test.ts`;
Modify `supabase/config.toml`.

Blueprint: `invoice_import_confirm/index.ts:248-471` (CORS → authenticate →
`db.transaction` con `SET LOCAL ROLE authenticated` + jwt claim). Date via
`_shared/dateTimezone.ts` (WF-8).

- [ ] **Step 1 — config.toml (BE-2):** aggiungere
  `[functions.invoice_emit]\nverify_jwt = false`. Verifica con
  `grep "functions.invoice_emit" supabase/config.toml`.

- [ ] **Step 2 — Contratto input (`_shared/invoiceEmit.ts`, tipi + validazione pura):**

```ts
export type InvoiceEmitRequest = {
  clientId: string;
  source: { kind: "project" | "client"; id: string };
  documentNumber: string;
  issueDate: string;          // YYYY-MM-DD (client, via toISODate)
  dueDate?: string;           // default issueDate
  grossTaxable: number;
  stampAmount: number;
  grossTotal: number;
  netCollectable: number;     // == grossTotal in v1 (no acconto)
  serviceIds: string[];
  expenseIds: string[];
};
// validateInvoiceEmitRequest: clientId/documentNumber non vuoti,
// grossTotal>0, netCollectable>0, kind in (project,client),
// rifiuta se hasPriorReceived (netCollectable != grossTaxable) -> errore
// "acconto pregresso non supportato in v1".
```

RED test: `validateInvoiceEmitRequest` con input invalido → errore atteso.

- [ ] **Step 3 — Handler transazionale (`index.ts`):** in UNA transazione:
  1. `insert into financial_documents` (`client_id`, `direction='outbound'`,
     `document_type='customer_invoice'`, `document_number`, `issue_date`,
     `due_date`, `taxable_amount=grossTaxable`, `total_amount=grossTotal`,
     `stamp_amount`, `currency_code='EUR'`) → `returning id`.
     Gestire violazione `financial_documents_identity_unique`:
     catturare e ritornare `{ status: "already_emitted" }` (idempotenza, Task 4 controllore 8).
  2. `insert into payments` (`client_id`, `project_id` (se source project),
     `status='in_attesa'`, `payment_type='saldo'`, `amount=netCollectable`,
     `payment_date=dueDate`, `invoice_ref=documentNumber`,
     `financial_document_id=<id step1>`).
  3. `update services set invoice_ref=documentNumber where id = any(serviceIds) and (invoice_ref is null or invoice_ref='')`.
  4. `update expenses set invoice_ref=documentNumber where id = any(expenseIds) and (invoice_ref is null or invoice_ref='') and source_service_id is null`.
  Ritorno: `{ status:"emitted", financialDocumentId, paymentId, servicesMarked, expensesMarked }`.
  NESSUN insert in `financial_document_project_allocations`/cash allocations (spec F4).

- [ ] **Step 4 — Deno test** dei pezzi puri (validazione, costruzione record).
  Run: `deno test supabase/functions/_shared/invoiceEmit.test.ts` (se l'env lo
  permette) + vitest mirror se i puri sono importabili.

- [ ] **Step 5 — Commit** `feat(invoicing): invoice_emit edge function (transactional)`.

---

## Task 5: Provider method `emitInvoice`

**Files:** Create `dataProviderInvoiceEmit.ts`; Modify `dataProvider.ts`.

Blueprint: `dataProviderInvoiceImport.ts:104-127`.

- [ ] **Step 1 — RED test:** mock `supabaseClient.functions.invoke('invoice_emit', ...)`,
  asserire che `emitInvoice(request)` passi il body corretto e ritorni la risposta.
- [ ] **Step 2 — Implementazione** `emitInvoice(request: InvoiceEmitRequest)` che
  invoca l'EF e ritorna `{ status, financialDocumentId, paymentId, ... }`.
- [ ] **Step 3 — Wire** in `dataProvider.ts` (metodo custom, come gli altri).
- [ ] **Step 4 — GREEN + Commit.**

---

## Task 5b: invoice_import_confirm — update-in-place (anti doppio conteggio)

**Files:** Modify `supabase/functions/invoice_import_confirm/index.ts` +
`_shared/invoiceImportConfirm.ts`; Test `_shared/invoiceImportConfirm.test.ts`.

Spec F2. Ramo ADDITIVO PRIMA del path di create esistente.

- [ ] **Step 1 — RED test (il bug):** scenario emit poi re-import stesso
  `document_number`/cliente. Con la logica attuale → 2 payment. Asserire (RED)
  che oggi crea il doppione, (GREEN) che dopo il fix resta 1.

```ts
it("re-import of an emitted invoice updates the expected payment in place (no duplicate)", async () => {
  // arrange: 1 payment in_attesa con invoice_ref='FT-1', financial_document_id set
  // act: confirm import draft con stesso client + invoice_ref, status ricevuto
  // assert: payments count invariato (1); status='ricevuto'; payment_date aggiornata
});
```

- [ ] **Step 2 — Implementazione:** nuova funzione
  `findEmittedExpectedPayment({trx, clientId, invoiceRef})`:
  `select id from payments where client_id=? and invoice_ref is not distinct from ? and status='in_attesa'`.
  - se 1 risultato → `update payments set status='ricevuto', payment_date=<documentDate reale>, financial_document_id=coalesce(financial_document_id, <match>)` e **SALTA** la creazione dei payment per quella fattura (collasso N→1).
  - se >1 → throw errore esplicito (non indovinare).
  - se 0 → path storico invariato (create).
  Integrare nel loop di creazione payment senza regredire i casi senza `invoice_ref`.

- [ ] **Step 3 — GREEN** + test extra: import senza invoice_ref → comportamento
  storico invariato (nessuna regressione). **Step 4 — Commit.**

---

## Task 6: UI — terza azione in `InvoiceDraftDialog`

**Files:** Modify `invoicing/InvoiceDraftDialog.tsx`; Test `InvoiceDraftDialog.test.tsx`.

Spec F6, F11, UI-7, WF-14.

- [ ] **Step 1 — RED test:** rendering del dialog
  - bottone "Emetti e scarica XML" PRESENTE per source project/client con
    `collectable>0`, numero compilato, billing completo, `!hasPriorReceived`;
  - ASSENTE per source quote/service, draft vuoto, o `hasPriorReceived`.
- [ ] **Step 2 — Implementazione:**
  - terzo bottone accanto a PDF/XML, gate:
    `source.kind in ('project','client') && hasInvoiceDraftCollectableAmount(draft) && documentNumber.trim() && billingComplete && !computeInvoiceDraftAmounts(draft.lineItems).hasPriorReceived`.
  - on click: **dedup guard (WF-14)** — query `financial_documents` per
    `client_id + document_number` (via provider/dataProvider getList); se match →
    `window.confirm`. Poi `emitInvoice(...)` con importi da
    `computeInvoiceDraftAmounts` + `serviceIds`/`expenseIds` dal draft + date via
    `toISODate`/`todayISODate`.
  - feedback (pattern `AiInvoiceImportView`): "Fattura registrata · 1 incasso
    atteso" / "Gia' emessa, saltata" (status `already_emitted`).
  - bottone disabilitato durante submit.
  - **Mobile (UI-7):** branching `useIsMobile()` → `Sheet` (pattern
    `DichiarazioneEntryDialog.tsx:329`), CTA in footer sticky.
- [ ] **Step 3 — GREEN** + verifica i 4 consumer ereditano correttamente (sweep
  `ProjectShow`, `ClientShow`, `QuoteShow`, `ServiceShow`). **Step 4 — Commit.**

---

## Task 7: Stato incasso in Fatture dal payment collegato

**Files:** Modify `invoices/FinancialDocumentShow.tsx`,
`invoices/FinancialDocumentListContent.tsx`.

Spec F7. NON ricablare `settlement_status` (view). Derivare lo stato dal payment
con `financial_document_id` = id documento.

- [ ] **Step 1 — RED test:** documento emesso con payment `in_attesa` → mostra
  "Da incassare"; con payment `ricevuto` → "Incassata"; senza link → fallback
  neutro (non "non saldata" falso).
- [ ] **Step 2 — Implementazione:** fetch dei payment per
  `financial_document_id` (provider) e derivazione stato; mostrare badge.
  Mantenere `invoices` read-only (nessun create/edit; test guard
  `moduleRegistry.test.ts` invariato).
- [ ] **Step 3 — GREEN + Commit.**

---

## Task 8: Continuity + learning

**Files:** `docs/architecture.md`, `docs/development-continuity-map.md`,
`.claude/rules/learning.md`.

- [ ] Documentare: nuova EF `invoice_emit`, colonna `payments.financial_document_id`,
  flusso emit, scoping v1 (no acconto/quote/service), legame anti-doppione,
  superfici a rischio (`project_financials`, `financial_documents_summary`).
- [ ] Nuovi trigger learning se emersi (es. "emit + re-import → update-in-place").
- [ ] Commit nello STESSO commit del codice che li richiede (WF-6) o commit
  finale di chiusura.

---

## Verifiche finali (prima di "fatto")

- [ ] `make typecheck` 0 errori; `make lint`; `make build`.
- [ ] `npx vitest run` verde (inclusi i nuovi test).
- [ ] Controllori spec v2 (1-10) verdi, in particolare:
  - emit + re-import stesso XML → 1 payment;
  - cassa fiscale e `project_financials` invariati post-emit;
  - ri-apertura bozza → `collectableAmount<=0`;
  - km 1 sola volta.
- [ ] Smoke locale: emit da un progetto reale → 1 financial_document + 1 payment
  `in_attesa` + service/expense marcati; XML scaricato; re-run idempotente.

## Stop point / Review gate

1. Review piano (multi-superficie + RAG) PRIMA di implementare.
2. Esecuzione subagent-driven, LOCALE prima.
3. Review implementazione (multi-superficie + RAG).
4. PROD gated (OK utente): migration (`db push`/`db query -f`) + deploy
   `npx supabase functions deploy invoice_emit --project-ref qvdmzhyzpyaveniirsmo`
   + smoke prod. Niente prod senza verde locale + OK esplicito.
