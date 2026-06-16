# Fatture View (BR1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development o superpowers:executing-plans. Step con checkbox `- [ ]`.

**Goal:** aggiungere una pagina "Fatture" read-only (lista + dettaglio + riepilogo direction-aware) sulla vista `financial_documents_summary`, con filtri e parità mobile, e rendere i documenti fiscali visibili al contesto AI.

**Architecture:** nuova resource ra-core read-only `financial_documents_summary` (PK già nel provider), registrata in `moduleRegistry`, componenti in `src/components/atomic-crm/invoices/`, riepilogo calcolato sul set filtrato completo via `useGetList`, AI via `dataProviderAi` + `buildUnifiedCrmReadContext`.

**Tech Stack:** React 19 + TS, ra-core/shadcn-admin, ra-data-postgrest, Supabase view, Vitest, Playwright.

Spec: `docs/superpowers/specs/2026-06-16-fatture-view-design.md` (v2.1).

Riferimenti pattern (mirror): `payments/PaymentList.tsx`, `payments/PaymentListContent.tsx`, `payments/PaymentListFilter.tsx`, `moduleRegistry.ts` (blocco `payments`), `filters/DateRangeFilter.tsx`, `admin/count.tsx`.

Vincoli forti (dalla spec): READ-ONLY (no create/edit/delete, no checkbox bulk); NIENTE `settled_amount`/`open_amount`/`settlement_status` in UI; totale = LORDO `total_amount` con label esplicita + imponibile affiancato; note credito sottratte per `document_type` (verificato `FPA 2/25 = +200`); no mix valute; riepilogo sul set filtrato COMPLETO.

---

## File Structure

Nuovi (`src/components/atomic-crm/invoices/`):
- `financialDocumentHelpers.ts` — funzioni pure: label/badge tipo+direzione, `isCreditNote`, `signedTotal`, `formatEur`, `summarizeFinancialDocuments`.
- `financialDocumentHelpers.test.ts` — unit test puri.
- `FinancialDocumentSummaryHeader.tsx` — riepilogo direction-aware (fetch set filtrato).
- `FinancialDocumentListContent.tsx` — tabella desktop (resizable) + mobile card. READ-ONLY.
- `FinancialDocumentListFilter.tsx` — filtri desktop + `FinancialDocumentMobileFilter`.
- `FinancialDocumentList.tsx` — `List` wrapper + `MobilePageTitle` + header + filtro + content.
- `FinancialDocumentShow.tsx` — dettaglio read-only a sezioni.
- `index.tsx` — `{ list, show, recordRepresentation }`.

Modificati:
- `src/components/atomic-crm/misc/columnDefinitions.ts` — aggiungere `INVOICE_COLUMNS`.
- `src/components/atomic-crm/root/moduleRegistry.ts` — import + nuovo modulo.
- `src/components/atomic-crm/providers/supabase/dataProviderAi.ts` — fetch documenti.
- `src/lib/ai/unifiedCrmReadContext.ts` — param + map + return `financialDocuments`.
- `docs/architecture.md`, `docs/development-continuity-map.md` — continuity gate.
- E2E: `tests/e2e/invoices.smoke.spec.ts` (nuovo).

Nessuna migration, nessun cambio a `types.ts` (`FinancialDocumentSummary` già completo).

---

## Task 1: Helper puri + test (TDD)

**Files:**
- Create: `src/components/atomic-crm/invoices/financialDocumentHelpers.ts`
- Test: `src/components/atomic-crm/invoices/financialDocumentHelpers.test.ts`

- [ ] **Step 1: Scrivere i test (falliscono)**

```ts
import { describe, it, expect } from "vitest";
import {
  isCreditNote,
  signedTotal,
  summarizeFinancialDocuments,
  documentTypeLabel,
  directionLabel,
} from "./financialDocumentHelpers";
import type { FinancialDocumentSummary } from "../types";

const doc = (o: Partial<FinancialDocumentSummary>): FinancialDocumentSummary =>
  ({
    id: o.id ?? Math.random().toString(),
    direction: o.direction ?? "outbound",
    document_type: o.document_type ?? "customer_invoice",
    document_number: o.document_number ?? "X",
    issue_date: o.issue_date ?? "2025-01-01",
    total_amount: o.total_amount ?? 0,
    taxable_amount: o.taxable_amount ?? null,
    settled_amount: 0,
    open_amount: 0,
    settlement_status: "open",
    project_allocations_count: 0,
    currency_code: o.currency_code ?? "EUR",
    created_at: "",
    updated_at: "",
    ...o,
  }) as FinancialDocumentSummary;

describe("financialDocumentHelpers", () => {
  it("isCreditNote riconosce le note di credito", () => {
    expect(isCreditNote(doc({ document_type: "customer_credit_note" }))).toBe(true);
    expect(isCreditNote(doc({ document_type: "supplier_credit_note" }))).toBe(true);
    expect(isCreditNote(doc({ document_type: "customer_invoice" }))).toBe(false);
  });

  it("signedTotal: fattura positiva, nota credito negativa (segno dal tipo, non dal valore)", () => {
    expect(signedTotal(doc({ document_type: "customer_invoice", total_amount: 100 }))).toBe(100);
    // nota credito reale memorizzata POSITIVA -> deve diventare negativa
    expect(signedTotal(doc({ document_type: "customer_credit_note", total_amount: 200 }))).toBe(-200);
    // difensivo: anche se fosse memorizzata negativa, resta negativa (no doppia inversione)
    expect(signedTotal(doc({ document_type: "customer_credit_note", total_amount: -200 }))).toBe(-200);
  });

  it("summarize: emesse al netto delle note credito + imponibile + conteggio", () => {
    const docs = [
      doc({ direction: "outbound", document_type: "customer_invoice", total_amount: 1000, taxable_amount: 1000 }),
      doc({ direction: "outbound", document_type: "customer_invoice", total_amount: 200, taxable_amount: 200 }),
      doc({ direction: "outbound", document_type: "customer_credit_note", total_amount: 200, taxable_amount: 200 }),
    ];
    const s = summarizeFinancialDocuments(docs);
    expect(s.outbound.netTotal).toBe(1000); // 1000 + 200 - 200
    expect(s.outbound.taxable).toBe(1000); // 1000 + 200 - 200 (note credito sottratte anche su imponibile)
    expect(s.outbound.count).toBe(3);
    expect(s.inbound.count).toBe(0);
  });

  it("summarize: documenti ricevuti separati, mai sommati al fatturato", () => {
    const docs = [
      doc({ direction: "outbound", document_type: "customer_invoice", total_amount: 500 }),
      doc({ direction: "inbound", document_type: "supplier_invoice", total_amount: 300 }),
    ];
    const s = summarizeFinancialDocuments(docs);
    expect(s.outbound.netTotal).toBe(500);
    expect(s.inbound.netTotal).toBe(300);
  });

  it("summarize: valute diverse non vengono sommate (raggruppate)", () => {
    const docs = [
      doc({ direction: "outbound", total_amount: 100, currency_code: "EUR" }),
      doc({ direction: "outbound", total_amount: 50, currency_code: "USD" }),
    ];
    const s = summarizeFinancialDocuments(docs);
    expect(s.multiCurrency).toBe(true);
    expect(s.outbound.byCurrency.EUR.netTotal).toBe(100);
    expect(s.outbound.byCurrency.USD.netTotal).toBe(50);
  });

  it("label tipo/direzione", () => {
    expect(documentTypeLabel("customer_invoice")).toBe("Fattura");
    expect(documentTypeLabel("customer_credit_note")).toBe("Nota di credito");
    expect(directionLabel("outbound")).toBe("Emessa");
    expect(directionLabel("inbound")).toBe("Ricevuta");
  });
});
```

- [ ] **Step 2: Run -> FAIL**

Run: `npx vitest run src/components/atomic-crm/invoices/financialDocumentHelpers.test.ts`
Expected: FAIL ("Failed to resolve import ./financialDocumentHelpers").

- [ ] **Step 3: Implementare gli helper**

```ts
import type { FinancialDocumentSummary } from "../types";

type DocType = FinancialDocumentSummary["document_type"];
type Direction = FinancialDocumentSummary["direction"];

export const isCreditNote = (d: Pick<FinancialDocumentSummary, "document_type">): boolean =>
  d.document_type === "customer_credit_note" || d.document_type === "supplier_credit_note";

/** Segno determinato dal document_type, mai dal valore numerico (no doppia inversione). */
export const signedTotal = (d: Pick<FinancialDocumentSummary, "document_type" | "total_amount">): number => {
  const abs = Math.abs(d.total_amount ?? 0);
  return isCreditNote(d) ? -abs : abs;
};

const signedTaxable = (d: FinancialDocumentSummary): number => {
  const abs = Math.abs(d.taxable_amount ?? 0);
  return isCreditNote(d) ? -abs : abs;
};

export const documentTypeLabel = (t: DocType): string =>
  t === "customer_invoice" || t === "supplier_invoice" ? "Fattura" : "Nota di credito";

export const directionLabel = (dir: Direction): string =>
  dir === "outbound" ? "Emessa" : "Ricevuta";

export const formatEur = (n: number, currency = "EUR"): string =>
  `${currency === "EUR" ? "EUR" : currency} ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type CurrencyTotals = { netTotal: number; taxable: number; count: number };
export type DirectionSummary = CurrencyTotals & { byCurrency: Record<string, CurrencyTotals> };
export type FinancialDocumentsSummary = {
  outbound: DirectionSummary;
  inbound: DirectionSummary;
  multiCurrency: boolean;
};

const emptyDir = (): DirectionSummary => ({ netTotal: 0, taxable: 0, count: 0, byCurrency: {} });

export const summarizeFinancialDocuments = (
  docs: FinancialDocumentSummary[],
): FinancialDocumentsSummary => {
  const out = emptyDir();
  const inb = emptyDir();
  const currencies = new Set<string>();
  for (const d of docs) {
    const bucket = d.direction === "outbound" ? out : inb;
    const cur = d.currency_code || "EUR";
    currencies.add(cur);
    const st = signedTotal(d);
    const sx = signedTaxable(d);
    bucket.netTotal += st;
    bucket.taxable += sx;
    bucket.count += 1;
    const c = (bucket.byCurrency[cur] ??= { netTotal: 0, taxable: 0, count: 0 });
    c.netTotal += st;
    c.taxable += sx;
    c.count += 1;
  }
  // arrotonda al centesimo per evitare drift float
  const round = (s: CurrencyTotals) => {
    s.netTotal = Math.round(s.netTotal * 100) / 100;
    s.taxable = Math.round(s.taxable * 100) / 100;
  };
  round(out); round(inb);
  Object.values(out.byCurrency).forEach(round);
  Object.values(inb.byCurrency).forEach(round);
  return { outbound: out, inbound: inb, multiCurrency: currencies.size > 1 };
};
```

- [ ] **Step 4: Run -> PASS**

Run: `npx vitest run src/components/atomic-crm/invoices/financialDocumentHelpers.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/atomic-crm/invoices/financialDocumentHelpers.ts src/components/atomic-crm/invoices/financialDocumentHelpers.test.ts
git commit -m "feat(invoices): pure helpers for financial document labels + direction-aware summary"
```

---

## Task 2: Column definitions

**Files:**
- Modify: `src/components/atomic-crm/misc/columnDefinitions.ts`

- [ ] **Step 1: Leggere il file** per replicare la shape di `PAYMENT_COLUMNS` (array di `{ key, label, default?... }`).

Run: `sed -n '1,40p' src/components/atomic-crm/misc/columnDefinitions.ts`

- [ ] **Step 2: Aggiungere `INVOICE_COLUMNS`** seguendo ESATTAMENTE la shape esistente. Chiavi: `number, date, counterpart, type, direction, taxable, stamp, total`. Esportare.

- [ ] **Step 3: typecheck**

Run: `npx tsc --noEmit` -> 0 errori.

- [ ] **Step 4: Commit**

```bash
git add src/components/atomic-crm/misc/columnDefinitions.ts
git commit -m "feat(invoices): add INVOICE_COLUMNS definition"
```

---

## Task 3: Lista (contenuto desktop + mobile card), read-only

**Files:**
- Create: `src/components/atomic-crm/invoices/FinancialDocumentListContent.tsx`

Mirror `payments/PaymentListContent.tsx` con queste DIFFERENZE:
- resource = `financial_documents_summary`; tipo riga = `FinancialDocumentSummary`.
- READ-ONLY: NIENTE `ListBulkSelection` (no `ListSelectAllCheckbox`/`ListRowCheckbox`/`MobileSelectableCard`/`ListBulkToolbar`), nessuna colonna checkbox.
- `useResizableColumns("financial_documents_summary")` + `useColumnVisibility("financial_documents_summary", INVOICE_COLUMNS)`.
- Colonne: Numero (`document_number`, link a show) · Data (`issue_date`, `formatBusinessDate`) · Controparte (`client_name ?? supplier_name ?? "Non associata"`) · Tipo (badge `documentTypeLabel`) · Direzione (badge `directionLabel`, colore: outbound verde / inbound ambra) · Imponibile (`taxable_amount`, right) · Bollo (`stamp_amount`, right) · Totale (`total_amount`, right, bold).
- Importi con `formatEur`. NESSUNA colonna settled/open/status.
- Mobile card: Numero + Tipo/Direzione badge, Data, Controparte (`text-base font-bold`), Totale.

- [ ] **Step 1: Scrivere il componente** (mirror PaymentListContent, read-only, colonne sopra; usare `useGetOne` NON necessario — la vista ha già `client_name`/`supplier_name`).
- [ ] **Step 2: typecheck** `npx tsc --noEmit` -> 0.
- [ ] **Step 3: Commit** `git commit -am "feat(invoices): read-only list content (desktop table + mobile card)"`

---

## Task 4: Filtri

**Files:**
- Create: `src/components/atomic-crm/invoices/FinancialDocumentListFilter.tsx`

Mirror `payments/PaymentListFilter.tsx`. Filtri (sintassi ra-data-postgrest `field@op`):
- Direzione: `FilterBadge` Emesse/Ricevute -> `direction@eq` = `outbound`/`inbound`.
- Tipo: `FilterBadge` Fattura/Nota credito -> `document_type@in` o due badge `document_type@eq`.
- Anno: `DateRangeFilter fromKey="issue_date@gte" toKey="issue_date@lte"` (riuso componente).
- Controparte: `FilterPopover`/Command su `clients` (`client_id@eq`) quando direzione=Emesse o Tutte; su `suppliers` (`supplier_id@eq`) quando direzione=Ricevute. Fallback OR non usato (vedi spec): si filtra per id, non per nome.
- Ricerca numero: input -> `document_number@ilike` = `%valore%`.
- `FinancialDocumentMobileFilter` come in PaymentListFilter (Sheet).

- [ ] **Step 1: Scrivere il componente** (mirror, sostituendo le chiavi filtro).
- [ ] **Step 2: typecheck** -> 0.
- [ ] **Step 3: Commit** `git commit -am "feat(invoices): list filters (direction, type, year range, counterpart, number)"`

---

## Task 5: Riepilogo direction-aware (set filtrato completo) + test

**Files:**
- Create: `src/components/atomic-crm/invoices/FinancialDocumentSummaryHeader.tsx`

- [ ] **Step 1: Implementare** il componente:
  - legge `filterValues` da `useListContext`;
  - `useGetList("financial_documents_summary", { pagination: { page: 1, perPage: 1000 }, sort: { field: "issue_date", order: "DESC" }, filter: filterValues })` (set filtrato completo, ~28 righe);
  - `const s = summarizeFinancialDocuments(data ?? [])`;
  - rendering direction-aware in base a `filterValues["direction@eq"]`:
    - `outbound` -> box "Totale fatture emesse" (`s.outbound.netTotal`) + "Imponibile" (`s.outbound.taxable`) + "Documenti" (`s.outbound.count`);
    - `inbound` -> box "Totale documenti ricevuti" (`s.inbound.netTotal`) + count;
    - assente (Tutte) -> due box separati: "Emesse (netto)" e "Ricevuti";
  - se `s.multiCurrency` -> mostrare i totali per valuta (da `byCurrency`), niente somma unica;
  - stile card semplice (riusa `Card`/`Separator` da `@/components/ui`), label chiare. NESSUNO stato pagamento.

- [ ] **Step 2: Test** (estendere `financialDocumentHelpers.test.ts` è già fatto per la logica; il componente è glue). Smoke del rendering coperto in Task 9 (E2E).
- [ ] **Step 3: typecheck/lint** -> 0.
- [ ] **Step 4: Commit** `git commit -am "feat(invoices): direction-aware summary header on full filtered set"`

---

## Task 6: List wrapper + dettaglio + index

**Files:**
- Create: `FinancialDocumentList.tsx`, `FinancialDocumentShow.tsx`, `index.tsx`

- [ ] **Step 1: `FinancialDocumentList.tsx`** — mirror `PaymentList.tsx` MA:
  - `title={false}`, `sort={{ field: "issue_date", order: "DESC" }}`, `perPage={25}`.
  - actions: SOLO `SortButton fields={["issue_date","total_amount","document_number"]}` + `ColumnVisibilityButton` + `ExportButton` + (mobile) `FinancialDocumentMobileFilter`. NIENTE `CreateButton`.
  - layout: `MobilePageTitle title="Fatture"` + sottotitolo/descrizione opzionale ("Fatture emesse, ricevute e note di credito importate") + `<FinancialDocumentSummaryHeader />` + filtro + `<FinancialDocumentListContent />`.
  - empty state senza CreateButton (read-only): testo "Nessun documento".
  - exporter CSV opzionale (riusa pattern, campi: numero, data, controparte, tipo, direzione, imponibile, bollo, totale).

- [ ] **Step 2: `FinancialDocumentShow.tsx`** — `ShowBase`/`useShowContext`, read-only, NIENTE `EditButton`/`DeleteButton`. Sezioni:
  - Intestazione: `document_number`, badge tipo + direzione, `issue_date`, Totale.
  - Controparte: `client_name`/`supplier_name` (+ link a `clients`/`suppliers` show se id presente), altrimenti "Non associata".
  - Importi: Imponibile / Bollo / (IVA `tax_amount` se valorizzata) / Totale.
  - Dati fiscali: `xml_document_code`, `related_document_number` (se nota credito), `source_path`, `notes`, `currency_code`.
  - Progetti: `project_names` se presente.
  - NON mostrare `settled_amount`/`open_amount`/`settlement_status`.

- [ ] **Step 3: `index.tsx`**

```tsx
import type { FinancialDocumentSummary } from "../types";
import { FinancialDocumentList } from "./FinancialDocumentList";
import { FinancialDocumentShow } from "./FinancialDocumentShow";

export default {
  list: FinancialDocumentList,
  show: FinancialDocumentShow,
  recordRepresentation: (r: FinancialDocumentSummary) => r.document_number,
};
```

- [ ] **Step 4: typecheck/lint** -> 0.
- [ ] **Step 5: Commit** `git commit -am "feat(invoices): list wrapper, read-only show, index"`

---

## Task 7: Registrare la resource nel moduleRegistry

**Files:**
- Modify: `src/components/atomic-crm/root/moduleRegistry.ts`

- [ ] **Step 1: Import** in cima: `import invoices from "../invoices";` e icona `FileText` da lucide (se non già importata).

- [ ] **Step 2: Aggiungere il modulo** all'array `crmModules` (dopo `payments`, prima/dopo `expenses`):

```ts
{
  resource: "financial_documents_summary",
  label: "Fatture",
  icon: FileText,
  iconColor: "text-sky-500",
  path: "/financial_documents_summary",
  components: toResourceComponents(invoices),
  nav: {
    desktop: { header: true, headerOrder: 65 },
    mobile: {
      bottomBar: false,
      bottomBarOrder: 0,
      altroMenu: true,
      altroMenuOrder: 55,
      createMenu: false,
    },
  },
  ai: {
    label: "Fatture",
    description:
      "Documenti fiscali emessi e ricevuti (fatture e note di credito) importati nel gestionale; sola consultazione, dato di fatturato/emissione non di cassa.",
    routePatterns: [
      "/#/financial_documents_summary",
      "/#/financial_documents_summary/:id",
      "/#/financial_documents_summary/:id/show",
    ],
    supportedViews: ["list", "show"],
  },
},
```

Nota: `toResourceComponents` deve accettare `{ list, show, recordRepresentation }` senza create/edit (verificare l'helper; se richiede tutte le chiavi, passare `undefined` per create/edit).

- [ ] **Step 2b: VERIFICA read-only end-to-end**: confermare che senza `create`/`edit` nei components non compaiano pulsanti Crea/Modifica e che la route `create`/`edit` non esista. Verificare anche che `toResourceComponents` non inietti azioni di default.

- [ ] **Step 3: typecheck/lint** -> 0.
- [ ] **Step 4: Commit** `git commit -am "feat(invoices): register Fatture resource + nav + AI capability"`

---

## Task 8: AI-aware (snapshot + capability già da registry)

**Files:**
- Modify: `src/components/atomic-crm/providers/supabase/dataProviderAi.ts`
- Modify: `src/lib/ai/unifiedCrmReadContext.ts`

- [ ] **Step 1: Leggere** `getUnifiedCrmReadContextFromResources` in `dataProviderAi.ts` e la firma di `buildUnifiedCrmReadContext` in `unifiedCrmReadContext.ts`.

Run: `grep -n "getList\|buildUnifiedCrmReadContext\|LARGE_PAGE" src/components/atomic-crm/providers/supabase/dataProviderAi.ts`

- [ ] **Step 2: dataProviderAi.ts** — aggiungere nel `Promise.all` (mirror del blocco `suppliers`):

```ts
deps.baseDataProvider.getList<FinancialDocumentSummary>("financial_documents_summary", {
  pagination: LARGE_PAGE,
  sort: { field: "issue_date", order: "DESC" },
  filter: {},
}),
```

destrutturare il risultato (`financialDocumentsResponse`) e passarlo a `buildUnifiedCrmReadContext({ ..., financialDocuments: financialDocumentsResponse.data })`. Import del tipo `FinancialDocumentSummary`.

- [ ] **Step 3: unifiedCrmReadContext.ts** — aggiungere il parametro `financialDocuments?: FinancialDocumentSummary[] = []` alla firma; mappare ai SOLI campi ammessi (id, document_number, document_type, direction, issue_date, total_amount, taxable_amount, stamp_amount, client_name, supplier_name, currency_code, related_document_number, project_names) ESCLUDENDO settled/open/settlement; aggiungere `financialDocuments` al return. Aggiungere il tipo nel `UnifiedCrmReadContext` se presente un type dedicato.

- [ ] **Step 4 (opzionale, consigliato): aggregati per anno** — nel builder calcolare `financialsByYear` (anno -> { fatturatoNetto, count }) usando `summarizeFinancialDocuments` filtrando outbound, per risposte rapide dell'AI. Se aumenta troppo la complessità, rimandare a follow-up (annotare).

- [ ] **Step 5: typecheck/lint** -> 0.
- [ ] **Step 6: Commit** `git commit -am "feat(ai): expose financial documents (fatture) in unified AI read context"`

---

## Task 9: E2E smoke (locale)

**Files:**
- Create: `tests/e2e/invoices.smoke.spec.ts`

Pre-req: dati di test deterministici. Il `test-data-controller` NON crea financial_documents -> estenderlo con 2-3 documenti (1 fattura 2025, 1 fattura 2024, 1 nota di credito 2025) OPPURE il test inserisce i propri documenti via `psql` nel `beforeEach` e li pulisce. Decisione nel piano: estendere `test-data-controller` con un blocco `financial_documents` minimale (preferito, riusabile).

- [ ] **Step 1: Estendere `tests/e2e/support/test-data-controller.ts`** con INSERT di 3 `financial_documents` (outbound: 2 customer_invoice anni diversi + 1 customer_credit_note), legati al `clientId` di test.
- [ ] **Step 2: Scrivere lo smoke**:
  - login, vai a "Fatture" (menu) -> URL `/financial_documents_summary`;
  - la lista mostra i 3 documenti; il riepilogo mostra "Totale fatture emesse" = (somma fatture − nota credito);
  - applica filtro anno 2025 -> lista e riepilogo si aggiornano;
  - apri un dettaglio -> read-only, NESSUN bottone "Modifica"/"Elimina", nessuno "stato pagamento".
- [ ] **Step 3: Eseguire** `npx playwright test tests/e2e/invoices.smoke.spec.ts` -> verde.
- [ ] **Step 4: Commit** `git commit -am "test(invoices): e2e smoke for Fatture view + fixtures"`

---

## Task 10: Verifiche finali + docs (stesso commit del codice già fatto)

- [ ] **Step 1:** `make typecheck` -> 0.
- [ ] **Step 2:** `make lint` -> 0 (eslint+prettier). `npx prettier --write` sui nuovi file se serve.
- [ ] **Step 3:** `make build` -> ok.
- [ ] **Step 4:** `npx vitest run src/components/atomic-crm/invoices/` -> verde.
- [ ] **Step 5: Docs (continuity gate)** — aggiornare `docs/architecture.md` (nuova superficie Fatture + AI) e `docs/development-continuity-map.md` (entry + Last updated). Includere nel commit del codice (NON commit separato).
- [ ] **Step 6:** `npm run continuity:check` -> passa.
- [ ] **Step 7: smoke UI manuale** (glance/playwright screenshot) della pagina Fatture in locale.

---

## Stop Point / Vincoli (ricordati durante l'esecuzione)

- READ-ONLY assoluto: se compaiono pulsanti Crea/Modifica/Elimina o checkbox bulk -> STOP e rimuovi.
- MAI mostrare `settled_amount`/`open_amount`/`settlement_status`.
- Totale = lordo `total_amount`, label esplicita; note credito sottratte per `document_type`.
- Riepilogo sul set filtrato completo, non sulla pagina.
- Esecuzione LOCALE prima; prod (merge in main -> Vercel) solo dopo review implementazione + OK utente. La resource legge una VISTA esistente: nessuna migration, nessun deploy DB.

## Review richieste

1. Review piano: MULTI-SUPERFICIE + RAG (provider/resource, AI context, UX/mobile, fiscale/totali, test).
2. Review implementazione: MULTI-SUPERFICIE + RAG.
3. Review finale: typecheck/lint/build/test/smoke.
