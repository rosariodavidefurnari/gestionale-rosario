# Card "Da incassare" (QW2) — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development o executing-plans.
> Deriva dalla spec v2 autoritativa:
> `docs/superpowers/specs/2026-06-17-da-incassare-card-design.md`.

**Goal:** la card "Da incassare" mostra il residuo REALE cumulativo (Σ
`client_commercial_position.balance_due` positivi = **6.697,48** su prod), non i
375 dei soli payment-row attesi. Card pulita: un numero + "N clienti con saldo
aperto", senza barra. AI annuale coerente. Frontend-only.

**Architecture:** funzione pura `sumOutstandingReceivables` su
`client_commercial_position` (vista canonica cassa-aware gia' esistente), fetch in
`useDashboardData` (separato dal year-model), nuovo prop a `DashboardKpiCards`
propagato da desktop + mobile, metric coerente in `buildAnnualOperationsContext`.

**Regole:** MONEY/FISCAL TDD (RED prima), SYSTEM-FIRST (riusa `balance_due`, no
seconda verita'), UI-7 (parita' desktop/mobile), DOM-4 (stato semantico esplicito,
no `array.length`), Mandatory Surface Sweep dashboard+AI. Niente migration, niente
deploy EF (vista esiste, contesto AI e' client-side).

---

## Precondizioni da verificare (Task 0)

- [ ] **Step 0.1**: confermare che il tipo `ClientCommercialPosition` esiste in
  `src/components/atomic-crm/types.ts` e che la resource `client_commercial_position`
  ha la PK registrata nel provider (`dataProvider.ts`). Comando:
  `grep -n "client_commercial_position\|ClientCommercialPosition" src/components/atomic-crm/types.ts src/components/atomic-crm/providers/supabase/dataProvider.ts`
  Atteso: tipo con `balance_due`, `client_id`, `client_name`; PK presente. Se il
  tipo NON ha `balance_due`, aggiungerlo (additivo) prima di proseguire.

## Task 1 — Funzione pura `outstandingReceivables` (RED→GREEN)

**Files:**
- Create: `src/lib/analytics/outstandingReceivables.ts`
- Test: `src/lib/analytics/outstandingReceivables.test.ts`

- [ ] **Step 1.1 — test che fallisce**

```ts
import { describe, it, expect } from "vitest";
import {
  sumOutstandingReceivables,
  countOpenReceivables,
} from "./outstandingReceivables";

const row = (balance_due: number | string | null) =>
  ({ balance_due }) as { balance_due: number | string | null };

describe("outstandingReceivables", () => {
  it("somma solo i balance_due positivi (clamp per-cliente)", () => {
    expect(
      sumOutstandingReceivables([row(6037.48), row(375), row(285)]),
    ).toBeCloseTo(6697.48, 2);
  });
  it("un cliente sovra-incassato (negativo) NON riduce il totale", () => {
    expect(sumOutstandingReceivables([row(1000), row(-500)])).toBe(1000);
  });
  it("null/stringhe → toNumber, 0 e vuoto sono neutri", () => {
    expect(sumOutstandingReceivables([row(null), row("0"), row("120.5")])).toBeCloseTo(120.5, 2);
    expect(sumOutstandingReceivables([])).toBe(0);
  });
  it("conta i clienti con saldo aperto (>0)", () => {
    expect(countOpenReceivables([row(6037.48), row(375), row(-10), row(0)])).toBe(2);
  });
});
```

- [ ] **Step 1.2 — run, deve fallire**: `npx vitest run src/lib/analytics/outstandingReceivables.test.ts` → FAIL (modulo assente).

- [ ] **Step 1.3 — implementazione minima**

```ts
// Pure aggregation of the canonical cassa-aware residue (client_commercial_position
// .balance_due). Clamp per-client so an over-collected client can't mask another's
// open balance. SYSTEM-FIRST: reuse balance_due, never recompute the residue.
type ResidueRow = { balance_due: number | string | null | undefined };

const toNumber = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

export const sumOutstandingReceivables = (rows: ResidueRow[]): number =>
  rows.reduce((sum, r) => sum + Math.max(0, toNumber(r.balance_due)), 0);

export const countOpenReceivables = (rows: ResidueRow[]): number =>
  rows.filter((r) => toNumber(r.balance_due) > 0).length;
```

- [ ] **Step 1.4 — run, deve passare**. Poi `git add` + commit.

## Task 2 — Fetch + aggregazione in `useDashboardData` (altitudine corretta)

**Files:**
- Modify: `src/components/atomic-crm/dashboard/useDashboardData.ts`

- [ ] **Step 2.1**: leggere `useDashboardData.ts:20-98` per capire il pattern
  `useGetList` esistente (le 6 tabelle raw) e la shape di ritorno.
- [ ] **Step 2.2**: aggiungere un `useGetList<ClientCommercialPosition>(
  "client_commercial_position", { pagination: { page: 1, perPage: 1000 }, sort: ...})`
  (year-INDEPENDENT: NON passare il filtro anno). Calcolare
  `outstandingReceivablesTotal = sumOutstandingReceivables(rows)` e
  `outstandingReceivablesCount = countOpenReceivables(rows)`.
- [ ] **Step 2.3**: esporre `outstandingReceivables: { total, count }` nel return
  del hook, COME CAMPO SEPARATO da `model` (che resta year-scoped). NON dentro
  `buildDashboardModel`.
- [ ] **Step 2.4**: `npx tsc --noEmit` verde.

## Task 3 — Card "Da incassare" pulita (rimuovere barra, nuovo prop)

**Files:**
- Modify: `src/components/atomic-crm/dashboard/DashboardKpiCards.tsx:64-94`

- [ ] **Step 3.1**: aggiungere prop `outstandingReceivables: { total: number; count: number }`.
- [ ] **Step 3.2**: nella card "Da incassare": headline `formatCurrency(outstandingReceivables.total)`;
  sottotitolo `"{count} clienti con saldo aperto"` (gestire singolare/plurale e
  `count === 0` → "Tutto incassato"). RIMUOVERE `received/total/pct` + la barra +
  la riga "X incassati su Y (%)" (righe 64-67, 85-94). Lasciare `pendingPaymentsTotal/
  Count` nel model intatti (li usano cashflow forecast + AI).
- [ ] **Step 3.3**: `npx tsc --noEmit` verde.

## Task 4 — Parita' desktop + mobile (UI-7)

**Files:**
- Modify: `src/components/atomic-crm/dashboard/DashboardAnnual.tsx`
- Modify: `src/components/atomic-crm/dashboard/MobileDashboard.tsx`

- [ ] **Step 4.1**: `grep -rn "DashboardKpiCards" src/ --include=*.tsx` → trovare
  TUTTI i call-site.
- [ ] **Step 4.2**: passare `outstandingReceivables={...}` da `DashboardAnnual` E
  `MobileDashboard` (entrambi consumano `useDashboardData`). Verificare che nessun
  altro consumer resti senza il prop (dato finanziario errato su mobile = critico).
- [ ] **Step 4.3**: `npx tsc --noEmit` verde.

## Task 5 — Coerenza AI: `buildAnnualOperationsContext` (no seconda verita')

**Files:**
- Modify: `src/lib/analytics/buildAnnualOperationsContext.ts:252-269`
- Modify: `src/lib/analytics/buildAnnualOperationsContext.test.ts`
- Modify: il/i chiamante/i del builder (passano il nuovo input)

- [ ] **Step 5.1 — test che fallisce**: aggiungere un caso che, dato un input con
  `outstandingReceivablesTotal`, il contesto AI espone un metric
  `outstanding_receivables_total` (basis cumulativo) col valore atteso; e che il
  metric esistente `pending_payments_total` resta ma con label disambiguato
  ("pagamenti attesi inseriti — anno").
- [ ] **Step 5.2 — run, deve fallire**.
- [ ] **Step 5.3 — impl**: estendere la firma del builder con
  `outstandingReceivablesTotal?: number` (destructuring COMPLETO — WF-3); aggiungere
  il metric cumulativo; rilabellare il pending. NON rimuovere `pending_payments_*`.
- [ ] **Step 5.4 — run verde**. Aggiornare i chiamanti per passare il valore (lo
  stesso `outstandingReceivables.total` del hook → fonte unica = no divergenza
  card/AI).
- [ ] **Step 5.5**: `npx tsc --noEmit` verde.

## Task 6 — E2E `dashboard-annual.smoke.spec.ts` (RED→GREEN dichiarato)

**Files:**
- Modify: `tests/e2e/dashboard-annual.smoke.spec.ts:35-37`

- [ ] **Step 6.1**: calcolare il valore client-level ESATTO del fixture
  `resetAndSeedTestData` interrogando la vista locale dopo il seed:
  `psql ... -c "select round(sum(greatest(0, balance_due)),2) from client_commercial_position;"`
  (NON assumere 2500 ne' il project-level 3953,50 di `calculations.smoke.spec.ts:57`).
- [ ] **Step 6.2**: aggiornare l'assert dopo "Da incassare" col valore calcolato
  (e il commento con la derivazione). Annotare che `calculations.smoke.spec.ts:57`
  resta invariato.
- [ ] **Step 6.3**: run la spec → verde.

## Task 7 — Verifica finale + browser WF-17

- [ ] **Step 7.1**: `npx vitest run` (tutta la suite) + `npx tsc --noEmit` +
  `npm run lint` + `npm run prettier` → tutti verdi.
- [ ] **Step 7.2 — grounding manuale (gate, non test)**: con dati prod attuali,
  la card mostra **6.697,48** (3 clienti), NON 375. Verificare via browser/REST.
- [ ] **Step 7.3 — WF-17 browser desktop + mobile**: aprire la dashboard,
  verificare card "Da incassare" = 6.697,48 + "3 clienti con saldo aperto", niente
  barra, leggibile su entrambe le viewport, 0 errori console. Stesso valore
  desktop/mobile. (Spec e2e UI o glance/playwright locale.)

## Task 8 — Docs + commit unico

**Files:**
- Modify: `docs/historical-analytics-handoff.md`, `docs/historical-analytics-backlog.md`,
  `docs/architecture.md`, `docs/development-continuity-map.md` (ai-analytics-domain
  + product-doc-sync continuity rules).
- Modify: `docs/CANTIERE.md`

- [ ] **Step 8.1**: documentare la card "Da incassare" cumulativa (fonte
  `client_commercial_position.balance_due`, lavoro-based, cumulativo) + che
  `pendingPaymentsTotal/Count` restano per cashflow/AI.
- [ ] **Step 8.2**: commit UNICO (codice + test + docs) — continuity-check verde.
- [ ] **Step 8.3**: push + CI check autonomo (`gh -R rosariodavidefurnari/...`),
  prettier bloccante verde. Vercel auto-deploy. Smoke prod browser opzionale.

## Controllori (riepilogo, MONEY)

1. `outstandingReceivables.test.ts` — pura, fixture fissi (Task 1).
2. `buildAnnualOperationsContext.test.ts` — metric cumulativo + pending relabeled (Task 5).
3. `dashboard-annual.smoke.spec.ts` — valore client-level del fixture (Task 6).
4. Browser WF-17 desktop+mobile + grounding 6.697,48 (Task 7).

## Self-review (writing-plans)

- Copertura spec v2: B1 (barra→Task3 rimossa), B2 (AI→Task5), B3 (E2E→Task6),
  I4 (altitudine→Task2), I5 (pura+grounding→Task1+7), MINOR (sottotitolo Task3,
  km/invarianti documentati Task8). ✓
- No placeholder: ogni step ha file + comando + codice. ✓
- Tipi coerenti: `outstandingReceivables: {total,count}` usato identico in hook/card/
  consumer; `ClientCommercialPosition` con `balance_due` (Task 0 verifica). ✓
