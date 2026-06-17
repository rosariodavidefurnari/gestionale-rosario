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
read-only resource preservato. Niente schema nuovo (nessuna migration).

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
