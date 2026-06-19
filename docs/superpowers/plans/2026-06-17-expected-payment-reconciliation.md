# Riconciliazione incasso atteso (FIX-3+4) — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development o executing-plans.
> Deriva dalla spec v2 autoritativa:
> `docs/superpowers/specs/2026-06-17-expected-payment-reconciliation-design.md`.

**Goal:** l'incasso ATTESO creato dall'emissione fattura viene riconciliato:
l'Incasso rapido SALDA l'atteso collegato (no doppione), e l'emit ASSORBE un
atteso manuale pre-esistente (no doppio atteso). Niente piu' doppio conteggio in
`pendingPaymentsTotal` ("Da incassare").

**Architecture:** due decider PURI (`decideQuickPaymentTarget`,
`decideEmitExpectedPayment`) sul pattern di `decideEmittedPaymentReconciliation`;
QuickPaymentDialog (frontend) e invoice_emit (EF) li consumano. Match per
`financial_document_id` (SYSTEM-FIRST, no terza verita').

**Regole:** MONEY/FISCAL TDD (RED prima), DOM-1/WF-8 (payment_date cassa), SYSTEM
-FIRST, UI-7 (QuickPaymentDialog single consumer → parita' automatica), BE-1/BE-8
(deploy EF), DB driver Kysely-Deno senza savepoint (no UNIQUE violation → guard).

---

## REVISIONE v2 (post review piano multi-superficie + RAG) — AUTORITATIVA

Vince sul corpo. Review BLOCK (3 revisori, RAG + sorgente + DB live). Correzioni
obbligatorie prima dell'impl (tutte verificate su file:line):

- **B1 — `decideQuickPaymentTarget` DEVE gattare `payment_type` (corruzione
  monetaria).** Senza, un `rimborso_spese` da 250 salderebbe l'atteso saldo 1000 a
  250 (fattura+cassa sbagliate). Aggiungere il gate: settle SOLO se
  `draft.payment_type ∈ {saldo,acconto,parziale}` (mai `rimborso`/`rimborso_spese`)
  → altrimenti `create`. Riusare la STESSA Set `ABSORBABLE_TYPES` di FIX-4
  (SYSTEM-FIRST, no asimmetria DB-6). Aggiungere `payment_type` al param `draft` e
  un test RED: `rimborso_spese` + atteso saldo collegato → `action:"create"`.
- **B2 — FIX-4 client-level NON deve assorbire cross-project.** Per
  `source.kind==='client'` lo scope progetto e' assente → assorbirebbe un atteso di
  un progetto diverso (seed: client `a2a2079b` ha 4 in_attesa saldo su progetti
  diversi). **Decisione: FIX-4 v1 SOLO `source.kind==='project'`**; per
  `source.kind==='client'` → sempre `create` (dichiarato out-of-scope v1). Il
  decider ritorna `create` se `source.kind!=='project'`; SELECT FOR UPDATE filtra
  `project_id = source.id`. Test: client-level → mai absorb.
- **B3 — VP5 (foundation-basis) e' STALE: rimuovere.** La view LIVE
  `project_financials` e' ridefinita da `20260401094930` (DROP+CREATE):
  `total_paid = SUM WHERE status='ricevuto'`, NESSUN ramo foundation/allocation. La
  biforcazione non esiste piu' a runtime → il settle muove `balanceDue` del dialog
  su TUTTI i progetti. **Eliminare Task 5.3** (testa comportamento inesistente);
  aggiornare la spec v2 (sezione VP5) come "non piu' applicabile dal 20260401".
- **B4 — Task 2.1 test absorb e' placeholder VUOTO (viola MONEY/FISCAL TDD).**
  Sostituire con test vitest REALE in APPEND a `_shared/invoiceEmit.test.ts`
  (esiste, runner vitest — NON `Deno.test`), rami falsificabili: absorb (1 match
  saldo stesso amount±cent/progetto), create (0 / amount fuori cent / tipo rimborso
  / gia' linkato / source client), ambiguous (>1 su stesso progetto).
- **I1 — `payment_date` fallback corretto (cassa).** Sul settle NON usare
  `existing.payment_date` (= due-date futura → cassa anno sbagliato): usare
  `paymentDate || todayISODate()` (`dateTimezone`), MAI null su `ricevuto`. Test che
  blocca `Date.now()` e verifica l'anno cassa (WF-9).
- **I2 — Contratto `EmitInvoiceResult` (dataProviderInvoiceEmit.ts:18-26).** Sul
  ramo absorb (no insert) ritornare `paymentId: d.paymentId` (= riga assorbita);
  valutare `expectedPaymentAbsorbed?: boolean` opzionale. Aggiungere
  `dataProviderInvoiceEmit.ts` (+test) alla sweep.
- **I3 — Controllore FIX-3 NON tautologico.** Task 5.1 (PATCH manuale) NON prova il
  wiring → la prova RED di FIX-3 e': Task 1 (unit decider) + **component test RTL**
  su QuickPaymentDialog (mock `useGetList`/`useUpdate`/`useCreate`, assert chiama
  `update` non `create` quando esiste l'atteso collegato — pattern
  `UnifiedAiLauncher.test.tsx`) + Task 5.4 browser desktop+mobile **OBBLIGATORIO**.
  Mantenere 5.2 (absorb su EF reale).
- **I4 — Filtro candidati: chiave PostgREST corretta.** `{ "financial_document_id@not.is": null }`
  (chiave `field@operator`, valore JS separato — pattern `taskFilters.ts:26`), NON
  `"financial_document_id@not.is null"`. Smoke che la query candidati ritorni >=1
  su fattura appena emessa (altrimenti settle non scatta mai = regressione silente).
- **I5 — Non-obiettivi: flussi gemelli orfani.** Dichiarare out-of-scope esplicito:
  `/payments/create` (`PaymentInputs.tsx:235` default in_attesa),
  `client_create_payment`, `quote_create_payment` — incassare una fattura emessa da
  questi lascia l'atteso orfano (stesso doppio conteggio, follow-up dichiarato).
- **I6 — Cache mobile (WF-18).** Documentare che `refresh()` (= `invalidateQueries()`
  senza key) copre le superfici mobile (staleTime 2min); il settle/absorb usa il
  `refresh()` esistente del dialog. Nessuna rimozione di refresh senza controllore.
- **MINOR**: M1 absorb UPDATE con `.returning()` + count-guard fail-closed
  (simmetrico al void); M5 Task 5.2 richiede restart edge runtime (BE-3/BE-5) prima
  dell'e2e absorb; M4 mismatch importo manuale oltre ±cent → resta doppione (limite
  noto, documentare).

Gli snippet di codice nei Task 1/2 sotto vanno letti CON queste correzioni
(payment_type gate in Task1, source==='project' in Task2, test reali).

---

## Task 0 — Precondizioni (verifica, no codice)

- [ ] `grep -n "financial_document_id" src/components/atomic-crm/types.ts` →
  `Payment.financial_document_id` esiste (gia' confermato). Idem
  `_shared/db.ts` (`PaymentsTable.financial_document_id?`).
- [ ] Leggere `_shared/invoiceImportConfirm.ts` `decideEmittedPaymentReconciliation`
  + `invoiceImportConfirm.test.ts:128-175` come pattern dei decider.

## Task 1 — Decider puro `decideQuickPaymentTarget` (FIX-3, RED→GREEN)

**Files:** Create `src/components/atomic-crm/projects/quickPaymentReconciliation.ts`
+ test `quickPaymentReconciliation.test.ts`.

- [ ] **Step 1.1 — test che fallisce**

```ts
import { describe, it, expect } from "vitest";
import { decideQuickPaymentTarget } from "./quickPaymentReconciliation";

const exp = (id: string, over: Partial<{ status: string; financial_document_id: string | null }> = {}) =>
  ({ id, amount: 1000, status: "in_attesa", financial_document_id: "doc-1", ...over });

describe("decideQuickPaymentTarget", () => {
  it("settle the single emit-linked expected payment when recording a collection", () => {
    expect(decideQuickPaymentTarget([exp("p1")], { status: "ricevuto" })).toEqual({
      action: "settle", paymentId: "p1",
    });
  });
  it("create when there is no emit-linked expected payment", () => {
    expect(decideQuickPaymentTarget([], { status: "ricevuto" })).toEqual({ action: "create" });
    expect(decideQuickPaymentTarget([exp("p1", { financial_document_id: null })], { status: "ricevuto" }))
      .toEqual({ action: "create" });
  });
  it("ambiguous (ask which) when >1 emit-linked expected payment", () => {
    const d = decideQuickPaymentTarget([exp("p1"), exp("p2")], { status: "ricevuto" });
    expect(d.action).toBe("ambiguous");
  });
  it("create when not recording a collection (status != ricevuto)", () => {
    expect(decideQuickPaymentTarget([exp("p1")], { status: "in_attesa" })).toEqual({ action: "create" });
  });
});
```

- [ ] **Step 1.2** run → FAIL. **Step 1.3 — impl**

```ts
import type { Identifier } from "ra-core";

export type ExpectedPaymentCandidate = {
  id: Identifier;
  amount: number;
  status: string;
  financial_document_id: string | null;
};
export type QuickPaymentDecision =
  | { action: "settle"; paymentId: Identifier }
  | { action: "create" }
  | { action: "ambiguous"; candidates: ExpectedPaymentCandidate[] };

/** Settle the emit-linked expected payment (in_attesa + financial_document_id)
 * instead of creating a duplicate. >1 → ambiguous (the UI asks which invoice).
 * Only when recording a real collection (ricevuto). */
export const decideQuickPaymentTarget = (
  candidates: ExpectedPaymentCandidate[],
  draft: { status: string },
): QuickPaymentDecision => {
  if (draft.status !== "ricevuto") return { action: "create" };
  const linked = candidates.filter(
    (c) => c.status === "in_attesa" && c.financial_document_id != null,
  );
  if (linked.length === 0) return { action: "create" };
  if (linked.length === 1) return { action: "settle", paymentId: linked[0].id };
  return { action: "ambiguous", candidates: linked };
};
```

- [ ] **Step 1.4** run → PASS. Commit.

## Task 2 — Decider puro `decideEmitExpectedPayment` (FIX-4, RED→GREEN)

**Files:** Modify `supabase/functions/_shared/invoiceEmit.ts` (no Deno imports — gia'
unit-testabile) + test `supabase/functions/_shared/invoiceEmit.test.ts`.

- [ ] **Step 2.1 — test che fallisce** (assoluto: absorb solo con amount±cent +
  tipo assorbibile + scope progetto; client-level >1 → ambiguous; rimborso mai)

```ts
import { decideEmitExpectedPayment } from "./invoiceEmit.ts";
const c = (id: string, o: Partial<{amount:number;payment_type:string;project_id:string|null;financial_document_id:string|null}> = {}) =>
  ({ id, amount: 1000, payment_type: "saldo", project_id: "prj-1", financial_document_id: null, ...o });

// absorb: stesso amount, tipo assorbibile, stesso progetto
Deno.test("absorb single matching manual pending", () => {
  // (usare il framework test del repo per le EF; asserire action:"absorb", paymentId)
});
// create: nessun candidato / amount diverso / tipo rimborso
// ambiguous: >1 match (client-level) → action:"ambiguous"
```

  (Nota: gli altri test `_shared` girano sotto vitest — vedi `invoiceVoid.test.ts`;
  usare lo stesso runner, non `Deno.test`.)

- [ ] **Step 2.2** run → FAIL. **Step 2.3 — impl** (in `invoiceEmit.ts`)

```ts
export type EmitPendingCandidate = {
  id: string;
  amount: number;
  payment_type: string | null;
  project_id: string | null;
  financial_document_id: string | null;
};
export type EmitExpectedDecision =
  | { action: "absorb"; paymentId: string }
  | { action: "create" }
  | { action: "ambiguous" };

const ABSORBABLE_TYPES = new Set(["saldo", "acconto", "parziale"]);
const CENT = 0.005;

/** Absorb a pre-existing MANUAL in_attesa (financial_document_id NULL) instead of
 * creating a second expected payment. Disciplined like the import decider: same
 * amount (±cent) + absorbable type (never rimborso) + project scope. Client-level
 * with >1 → ambiguous (do not absorb the wrong one → caller creates). */
export const decideEmitExpectedPayment = (
  candidates: EmitPendingCandidate[],
  req: { netCollectable: number; source: { kind: "project" | "client"; id: string } },
): EmitExpectedDecision => {
  const matches = candidates.filter(
    (c) =>
      c.financial_document_id == null &&
      ABSORBABLE_TYPES.has(c.payment_type ?? "") &&
      Math.abs(c.amount - req.netCollectable) <= CENT &&
      (req.source.kind !== "project" || c.project_id === req.source.id),
  );
  if (matches.length === 0) return { action: "create" };
  if (matches.length === 1) return { action: "absorb", paymentId: matches[0].id };
  return { action: "ambiguous" };
};
```

- [ ] **Step 2.4** run → PASS. Commit.

## Task 3 — QuickPaymentDialog wiring (FIX-3) + payment_date cassa (VP2)

**Files:** Modify `src/components/atomic-crm/projects/QuickPaymentDialog.tsx`.

- [ ] **Step 3.1** Aggiungere un `useGetList<Payment>("payments")` per i candidati:
  filter `project_id@eq record.id`, `status@eq in_attesa`, `financial_document_id@not.is null`
  (pattern filtri ra-data-postgrest), perPage 100, `enabled: open`.
- [ ] **Step 3.2** In `handleSubmit`, prima del create:
  `const decision = decideQuickPaymentTarget(candidates, { status })`.
  - `settle` → `update("payments", { id: decision.paymentId, data: { status: "ricevuto",
    amount, payment_date: paymentDate || existing.payment_date || todayISODate(),
    method: method || null, notes: notes || null } })`. **payment_date MAI null su
    ricevuto** (VP2, `todayISODate()` da `dateTimezone`).
  - `create` → ramo attuale (invariato).
  - `ambiguous` → mostrare un picker (lista `fattura/importo` dei candidati) e
    far scegliere; alla scelta → `settle` su quel paymentId. (Minimo: un secondo
    step nel dialog con radio/lista.)
- [ ] **Step 3.3** `refresh()` resta. `npx tsc --noEmit` verde.
- [ ] **Step 3.4** (opz.) micro-hint "Salda incasso atteso fattura N" quando
  `settle` su match singolo.

## Task 4 — invoice_emit EF absorb (FIX-4)

**Files:** Modify `supabase/functions/invoice_emit/index.ts`.

- [ ] **Step 4.1** Dentro la tx, PRIMA di `buildExpectedPaymentInsert`/insert payment:
  SELECT candidati `payments` `status='in_attesa'` + `financial_document_id IS NULL`
  + `client_id = request.clientId` (+ `project_id` se source project) `FOR UPDATE`.
- [ ] **Step 4.2** `const d = decideEmitExpectedPayment(candidates, { netCollectable, source })`:
  - `absorb` → `UPDATE payments SET financial_document_id = insertedDocument.id,
    invoice_ref = documentNumber WHERE id = d.paymentId AND financial_document_id IS NULL`
    (idempotente; niente nuovo insert). Restituire `expectedPaymentAbsorbed: true`.
  - `create` | `ambiguous` → insert come oggi (`buildExpectedPaymentInsert`).
- [ ] **Step 4.3** `deno check --node-modules-dir=auto invoice_emit/index.ts` verde.

## Task 5 — Controllori e2e (estendere harness esistente)

**Files:** Modify `tests/e2e/invoice-void.smoke.spec.ts` (ha gia' `api.emit()` +
query/PATCH payments). Aggiungere un blocco `describe("expected payment reconciliation")`:

- [ ] **5.1** emit → settle via REST PATCH/EF? No: simulare il path QuickPayment via
  REST = `update` dell'in_attesa a ricevuto **non** testa il decider UI. Quindi:
  unit decider (Task 1/2) coprono la logica; e2e money copre l'INVARIANTE DB:
  - emit (1 service) → 1 payment in_attesa con `financial_document_id`.
  - settle quella riga (PATCH status=ricevuto, payment_date) → query
    `payments?project_id=eq.X&status=eq.in_attesa&financial_document_id=not.is.null`
    = 0; `payments status=ricevuto` = 1 (NON 2). `pendingPaymentsTotal`-equivalente
    (somma non-ricevuto del progetto) scende a 0.
- [ ] **5.2** emit con un in_attesa manuale pre-esistente (stesso amount/tipo/progetto,
  FK NULL) → dopo emit: **1 solo** in_attesa con `financial_document_id` (assorbito),
  NON 2. (Richiede invoice_emit deployato in locale → `supabase stop&&start` o restart
  edge runtime.)
- [ ] **5.3** caso foundation-basis (progetto con allocations): documentare/asserire
  la biforcazione (VP5).
- [ ] **5.4** WF-17 browser desktop+mobile: Incasso rapido su progetto con fattura
  emessa → 1 pagamento, niente doppione, picker su match multiplo.

## Task 6 — Verifica finale

- [ ] `npx vitest run` + `npx tsc --noEmit` + `npm run lint` + `npm run prettier`
  + `deno check` EF + e2e → tutti verdi.

## Task 7 — Docs + commit unico

- [ ] development-continuity-map + handoff/backlog (ai-analytics non toccato; ma
  payments/dashboard → product-doc-sync) + CANTIERE + learning (trigger
  riconciliazione incasso atteso).
- [ ] Commit UNICO (codice + test + docs). continuity-check verde.

## Task 8 — PROD gated (OK utente)

- [ ] `npx supabase functions deploy invoice_emit --project-ref qvdmzhyzpyaveniirsmo`
  (FIX-4 tocca l'EF; FIX-3 e' frontend → Vercel al merge).
- [ ] Smoke prod: emit → incasso → 1 pagamento ricevuto, 0 atteso orfano.
- [ ] Merge `main` + CI check (`gh -R rosariodavidefurnari/...`).

## Self-review (writing-plans)

- Copertura spec v2: FIX-3 (Task1+3), FIX-4 (Task2+4), VP1 metrica (Task5 assert
  pendingPaymentsTotal), VP2 payment_date (Task3.2), VP3 ambiguous (Task1+3.2),
  VP4 absorb key (Task2), VP5 basis (Task5.3). ✓
- Tipi coerenti: `decideQuickPaymentTarget`/`decideEmitExpectedPayment` shape usata
  identica in test/dialog/EF. ✓
- No placeholder: decider con codice completo; wiring con file+filtri+azioni. ✓
