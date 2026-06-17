# Annulla Emissione (invoice_void) — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development o executing-plans.
> Deriva dalla spec v2 autoritativa:
> `docs/superpowers/specs/2026-06-17-annulla-emissione-design.md`.

**Goal:** azione reversibile "Annulla emissione" su una fattura emessa dall'app:
cancella documento + incasso atteso + ripulisce `invoice_ref` sui lavori, in una
transazione sicura. Mai cancella un incasso `ricevuto`; mai tocca Aruba/SDI.

**Architecture:** EF transazionale `invoice_void` (FOR UPDATE + fail-closed
DELETE + guard) invocata da provider `voidEmittedInvoice`, bottone destructive su
`FinancialDocumentShow`. Decisione condivisa pura `canVoidEmittedInvoice`.

**Regole:** MONEY/FISCAL TDD (RED prima), BE-2 (config.toml), BE-1/BE-8 (deploy
manuale ref `qvdmzhyzpyaveniirsmo`), DB-8, WF-17 (browser desktop+mobile),
read-only resource preservato.

---

## REVISIONE v3 (post review IMPLEMENTAZIONE) — AUTORITATIVA

Vince su v2 e sul corpo. La review impl ha imposto 2 fix (dettaglio nella spec
v3). Effetti sul piano:

- **Schema (cambia "niente migration nuova"):** migration
  `20260617120000_invoice_billing_link.sql` aggiunge `financial_document_id`
  (FK nullable `ON DELETE SET NULL`, indicizzata) a `services` + `expenses`.
  Additiva, replayable, **no backfill** (prod ha 0 fatture app-emesse). Deploy
  prod include `npx supabase db push`.
- **Un-mark per FK, non per string:** `invoice_emit` setta la FK sulle righe che
  marca; `invoice_void` smarca per `financial_document_id = documentId` (azzera
  `invoice_ref` + FK). Rimosso il twin-guard (P-V2/V2): non piu' necessario, e
  sparisce il falso-409 `issue_date`. `_shared/db.ts` + `types.ts` allineati.
- **Controllore committato (chiude il FLAG-A):**
  `tests/e2e/invoice-void.smoke.spec.ts` (EF reali via HTTP + assert REST), 4
  casi verdi: happy+FK-link, refuse-collected 409, idempotent, FK-scoped
  over-clear+DB-8. Sostituisce/realizza i controllori #2/#3/#4/#6 del piano come
  test committato e ripetibile (`npm run test:e2e -- tests/e2e/invoice-void.smoke.spec.ts`).
- **Drift ambiente risolto:** `realtime-js` era driftato a 2.108.2 (richiede
  `@supabase/phoenix` assente) bloccando vite/e2e; `npm ci` ha ripristinato
  l'albero lockato (2.90.1). Lockfile = verita'.

---

## REVISIONE v2 (post review piano multi-superficie + RAG) — AUTORITATIVA

Dove confligge col corpo sotto, vince questa. 4 review FLAG concordi; chiudo 4
important + 7 minor. (RAG snapshot stale pre-emit/void: claim riverificati su
sorgente.)

- **P1 — Guard allocations via SQL raw (NON Kysely tipato).**
  `financial_document_project_allocations`/`financial_document_cash_allocations`
  NON sono nell'interface `Database` (`_shared/db.ts:150-161`): un
  `selectFrom('...allocations')` tipato romperebbe `deno check`. Il COUNT guard
  (Task 2 step 5) usa `CompiledQuery.raw`/`sql\`\`` come l'emit
  (`invoice_emit/index.ts:39-43`). Riga 84 del piano ("i tipi gia' coprono") e'
  errata SOLO per le allocations; financial_documents/payments/services/expenses
  sono coperti.
- **P2 — Controllore TOCTOU #6 = test SQL deterministico, non unit puro.** Il
  pool EF e' single-connection (`db.ts:256 Pool(...,1)`): la race intra-tx non e'
  riproducibile; la race reale e' tra 2 sessioni, serializzata dal `FOR UPDATE`
  (l'UPDATE→ricevuto di `invoice_import_confirm:386-390` si blocca). Riformulare
  #6: inserire un 2° payment `ricevuto` linkato PRIMA del DELETE e verificare
  `deleted.length !== payments.length` → throw → rollback (oppure test a 2
  sessioni DB con FOR UPDATE che blocca). VIETATO un unit test su funzione pura
  per il TOCTOU (DETERMINISTIC + MONEY/FISCAL TDD).
- **P3 — Estrarre `runVoidInvoice` (come `runEmitInvoice`), test OBBLIGATORIO.**
  Niente orchestrazione inlined nel componente (Task 4): estrarre in
  `useEmitInvoice.ts` (o nuovo `useVoidInvoice.ts`) `runVoidInvoice(deps, record,
  { confirm })` puro-async con deps iniettabili + hook `useVoidInvoice`, e unit
  test sui 4 rami (cancelled / voided / already_voided / error). Nel componente
  solo wiring. Specchia `useEmitInvoice.ts:64-114`.
- **P4 — `useRefresh()` + invalidazione cache + sweep esteso.**
  `voidEmittedInvoice` e' metodo provider custom (non mutation ra-core) → NON
  invalida le cache: senza `useRefresh()` i lavori restano "Fatturato" in cache
  (proprio il sintomo da eliminare). Chiamare `useRefresh()` PRIMA del redirect
  (pattern `QuickPaymentDialog.tsx:86,199`, `InvoiceDraftDialog.tsx:96,160`).
  Sweep (Task 5) esteso: badge fatturato `services` (lista/show/mobile),
  `expenses`, `payments`/collection badge, `SupplierFinancialSection` (benigno
  per outbound). Browser-check WF-17: dopo void, Registro Lavori → "Da fatturare"
  e incasso atteso assente da Pagamenti SENZA reload manuale.

### Minor (chiudere)

- `canVoidEmittedInvoice` firma POSITIONAL `(doc, linkedPayments)` (la spec usa
  object-style: vince il piano); `FinancialDocumentSummary` e' structural-
  compatible con `VoidableDoc`.
- RED test `stato_inatteso`: status sintetico fuori-CHECK (es. `parziale`) →
  `{ok:false, reason:'stato_inatteso'}` (DB-1, branch non morto in test).
- Controllore km (DB-8): emit→void su service `km>0` → `service.invoice_ref`
  NULL, expense `source_service_id` INTATTA, nessuna doppia riga.
- Gate UI durante loading: hoistare anche `isPending` → bottone disabled/skeleton
  (no flicker da gate su `[]`).
- Controllore ambiguita' #4: assert che i lavori della 2ª fattura omonima restino
  INTATTI (no storno parziale).
- `already_voided`: scelta fail-safe deliberata (gia' annullata vs id
  inesistente) per single-user; log EF opzionale.
- Path corretto `src/components/atomic-crm/dashboard/fiscalModel.ts`.

---

## Task 1 — Pure `canVoidEmittedInvoice` (+ test)

**Files:** create `supabase/functions/_shared/invoiceVoid.ts` (+ `.test.ts`).

- [ ] RED test: rami
  - outbound + customer_invoice + payments tutti `in_attesa` → `{ok:true}`
  - idem con un `scaduto` → `{ok:true}` (cassa-neutro)
  - almeno un payment `ricevuto` → `{ok:false, reason:"incassata"}`
  - 0 payment (storica) → `{ok:false, reason:"non_app_emessa"}`
  - `inbound` o `*_credit_note` → `{ok:false, reason:"non_supportata"}`
- [ ] Impl:
```ts
export type VoidablePayment = { id: string; status: string };
export type VoidableDoc = { direction: string; document_type: string };
export type CanVoidResult = { ok: true } | { ok: false; reason: string };
const COLLECTED = new Set(["ricevuto"]);
const VOIDABLE_PENDING = new Set(["in_attesa", "scaduto"]);
export const canVoidEmittedInvoice = (
  doc: VoidableDoc,
  linkedPayments: readonly VoidablePayment[],
): CanVoidResult => {
  if (doc.direction !== "outbound" || doc.document_type !== "customer_invoice")
    return { ok: false, reason: "non_supportata" };
  if (linkedPayments.length === 0)
    return { ok: false, reason: "non_app_emessa" };
  if (linkedPayments.some((p) => COLLECTED.has(p.status)))
    return { ok: false, reason: "incassata" };
  if (linkedPayments.some((p) => !VOIDABLE_PENDING.has(p.status)))
    return { ok: false, reason: "stato_inatteso" };
  return { ok: true };
};
export const voidReasonMessage = (reason: string): string => ({
  incassata: "Fattura gia' incassata: scollega prima l'incasso, poi annulla.",
  non_app_emessa: "Questa fattura non e' stata emessa dall'app: non annullabile da qui.",
  non_supportata: "Solo le fatture cliente emesse dall'app sono annullabili.",
  stato_inatteso: "Stato incasso non gestito: intervenire manualmente.",
}[reason] ?? "Annullamento non consentito.");
```

## Task 2 — EF `invoice_void` (+ config.toml)

**Files:** create `supabase/functions/invoice_void/index.ts`; modify `supabase/config.toml`.

- [ ] `[functions.invoice_void] verify_jwt = false` (BE-2).
- [ ] Handler (pattern `invoice_import_confirm`: OptionsMiddleware → AuthMiddleware
  → UserMiddleware con guard `if (!user) 401`; body `{ documentId }`). In una
  transazione (`SET LOCAL ROLE authenticated` + jwt claim):
  1. `SELECT id, client_id, direction, document_type, document_number, issue_date
     FROM financial_documents WHERE id = ? FOR UPDATE`. Se 0 righe →
     `{status:"already_voided"}` 200 (idempotenza).
  2. `SELECT id, status FROM payments WHERE financial_document_id = id FOR UPDATE`.
  3. `canVoidEmittedInvoice(doc, payments)`; se `!ok` → `InvoiceVoidError(409, voidReasonMessage(reason))`.
  4. **Ambiguita'**: `SELECT count(*) FROM financial_documents WHERE client_id =
     doc.client_id AND direction='outbound' AND document_number = doc.document_number`;
     se `>1` → 409 "Numero fattura ambiguo: piu' fatture con lo stesso numero, annullare manualmente."
  5. **Allocations guard**: `count(*)` su `financial_document_project_allocations`
     e `financial_document_cash_allocations` WHERE `document_id = id`; se `>0` →
     409 "La fattura ha allocazioni collegate: non annullabile da qui."
  6. `UPDATE services SET invoice_ref = NULL WHERE invoice_ref = doc.document_number AND client_id = doc.client_id RETURNING id` → servicesUnmarked.
  7. `UPDATE expenses SET invoice_ref = NULL WHERE invoice_ref = doc.document_number AND client_id = doc.client_id AND source_service_id IS NULL RETURNING id` → expensesUnmarked.
  8. `DELETE FROM payments WHERE financial_document_id = id AND status IN ('in_attesa','scaduto') RETURNING id` → deleted. Se `deleted.length !== payments.length` → throw (TOCTOU: qualcuno ha incassato) → rollback.
  9. `DELETE FROM financial_documents WHERE id = id`.
  10. return `{status:"voided", servicesUnmarked, expensesUnmarked, paymentsDeleted: deleted.length}`.
- [ ] Controllore manuale: `deno check supabase/functions/invoice_void/index.ts` (i tipi `_shared/db.ts` gia' coprono financial_documents/payments/services/expenses).

## Task 3 — Provider `voidEmittedInvoice`

**Files:** modify `providers/supabase/dataProviderInvoiceEmit.ts` (+ test); wire in `dataProvider.ts` (gia' spread `invoiceEmitMethods`).

- [ ] RED test (mock invokeEdgeFunction): `voidEmittedInvoice(documentId)` posta
  a `invoice_void` `{documentId}` e ritorna `data.data`; errore → throw leggibile.
- [ ] Impl: metodo nel builder esistente (ritorna `{status, ...}`).

## Task 4 — UI: bottone "Annulla emissione" su FinancialDocumentShow

**Files:** modify `invoices/FinancialDocumentShow.tsx` (+ test gating se fattibile).

- [ ] Sollevare il fetch payment dal `CollectionBadge` al
  `FinancialDocumentShowContent` (un solo `useGetList("payments",
  {filter:{"financial_document_id@eq": record.id}})`); passarlo al badge.
- [ ] `const voidGate = canVoidEmittedInvoice(record, payments ?? [])`.
- [ ] Riga/sezione dedicata nel Card (NON nell'header occupato dal Totale):
  bottone full-width `variant="destructive"` "Annulla emissione", visibile solo
  se `voidGate.ok`. onClick → `window.confirm("Annulli la fattura <numero>? I
  lavori torneranno Da fatturare e l'incasso atteso sara' rimosso. L'XML
  eventualmente gia' caricato su Aruba NON viene toccato.")` → provider
  `voidEmittedInvoice(record.id)` → notify success → `redirect("list",
  "financial_documents_summary")` + refresh. catch → notify error (mostra il 409).
- [ ] Mobile (WF-17): il bottone full-width e' raggiungibile sopra `mb-28`;
  verifica esplicita desktop + mobile.
- [ ] read-only invariato: nessun edit/create aggiunto (azione di dominio).

## Task 5 — Continuity + registry

**Files:** `docs/architecture.md`, `docs/development-continuity-map.md`,
`src/lib/semantics/crmCapabilityRegistry.ts` (nuova capability `void_invoice` o
estensione), + handoff/backlog se si tocca semantics.

- [ ] Documentare l'azione, l'invariante (no void se ricevuto, no Aruba), i
  guard (ambiguita', allocations, TOCTOU).

## Verifiche finali

- [ ] `make typecheck`, vitest (pure + provider), `deno check _shared` + invoice_void.
- [ ] E2E smoke / browser PROD-like locale: emit → void → 0 doc/0 payment, lavori
  "Da fatturare"; void rifiutato se ricevuto; doppio-void → already_voided.
- [ ] **Browser desktop + mobile** (WF-17) sul render reale del bottone + flusso.

## Stop point / gate

1. Review piano (multi-superficie + RAG).
2. Impl locale TDD → review impl (multi-superficie + RAG).
3. Browser desktop + mobile.
4. PROD gated (OK utente): deploy `invoice_void` (`--project-ref
   qvdmzhyzpyaveniirsmo`), smoke prod emit→void. Niente migration.
