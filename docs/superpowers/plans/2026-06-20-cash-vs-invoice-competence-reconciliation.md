# Piano — Layer di confronto Cassa vs Competenza data-fattura

Stato: draft (in attesa review piano)
Data: 2026-06-20
Spec di riferimento:
`docs/superpowers/specs/2026-06-20-cash-vs-invoice-competence-reconciliation-design.md`
(inclusa §12 — vincoli BINDING dalla review multi-superficie).

Gate: **STOP prima del codice** — l'implementazione NON parte finché l'utente non
dà il via esplicito (gate spec→codice = decisione utente).

---

## 1. Relazione con la spec

Implementa una superficie read-only che confronta la base CASSA (legge, immutata) con
la base COMPETENZA data-fattura (riassegnando ogni payment `ricevuto` per `issue_date`
del documento collegato via FK BR2). Zero modifiche alla base fiscale legale. Tutti i
vincoli §12 della spec sono operazionalizzati qui (T-1..T-7, F-fisc/db/fe).

## 2. File coinvolti

**Nuovi (codice)**
- `src/components/atomic-crm/dashboard/cashVsCompetenceReconciliation.ts` — helper puro.
- `src/components/atomic-crm/dashboard/cashVsCompetenceReconciliation.test.ts` — unit +
  property + symbol-guard.
- `src/components/atomic-crm/dashboard/DashboardCashVsCompetenceCard.tsx` — card
  condivisa (prop `compact`), unica per desktop+mobile.
- `scripts/prod-smoke-cash-vs-competence.ts` — smoke prod read-only.

**Modificati (codice)**
- `src/components/atomic-crm/dashboard/fiscalModel.ts` — SOLO `export` ai 2 helper
  esistenti (`getSignedPaymentAmount` :123, `isPaymentExcludedByTaxabilityDefaults`
  :142). Nessuno spostamento/rinomina (F-db-1).
- `src/components/atomic-crm/dashboard/useDashboardData.ts` — `useGetList(
  "financial_documents_summary")` (outbound), mappa id→issue_date, calcolo
  riconciliazione esposto in `data.fiscal` (o `data.cashVsCompetence`).
- `src/components/atomic-crm/dashboard/DashboardAnnual.tsx` — render card nel blocco
  `data.fiscal`, dopo `DashboardFiscalKpis`.
- `src/components/atomic-crm/dashboard/MobileDashboard.tsx` — render STESSA card con
  `compact`, dentro il blocco `data.fiscal` (MobileAnnualDashboard).
- `src/components/atomic-crm/dashboard/MobileDashboard.parity.test.tsx` — caso parità.
- `package.json` — script `smoke:cash-vs-competence`.

**Docs (stesso commit)**
- `docs/historical-analytics-handoff.md` — nuovo step + descrizione layer.
- `docs/development-continuity-map.md` — sweep/integrazione.
- `.claude/rules/learning.md` + `memory/*` — solo se emerge pattern nuovo.

**NON toccati**: `_shared/fiscalDeadlineCalculation.ts` (Deno, base legale duplicata),
nessuna migration, nessuna EF, nessuna view nuova, Settings, AI registry (follow-up BR3).

## 3. Contratto dell'helper (firma + invarianti)

```typescript
buildCashVsCompetenceReconciliation({
  payments, projects, financialDocsById, fiscalConfig, taxYears?
}): {
  byYear: Array<{
    year: number;
    cashTaxable: number;        // grezzo non arrotondato
    competenceTaxable: number;  // grezzo non arrotondato
    linkedCount: number; totalCount: number;  // copertura per anno
    coverageRatio: number;      // linkedCount/totalCount
  }>;
  bridge: Array<{               // ponte cross-year (oggi 2 righe)
    paymentId; amount; documentNumber; cashYear; competenceYear;
  }>;
}
```

- Riuso ESATTO (import da `fiscalModel.ts`): replicare la sequenza REALE di
  `buildFiscalYearEstimate` (`fiscalModel.ts:232-244`) = `const amount =
  getSignedPaymentAmount(payment); if (isPaymentExcludedByTaxabilityDefaults({...}))
  continue;` (signing PRIMA, esclusione DOPO). Firma reale dell'esclusione (object):
  `{ payment, projectById: Map<string,Project>, taxDefaults }` — costruire
  `projectById = new Map(projects.map(p => [String(p.id), p]))` (come `:206-208`) e
  passare `taxDefaults = fiscalConfig.taxabilityDefaults` (come `:220`). T-2 garantisce
  che siano gli STESSI simboli importati (no ricodifica inline), non l'ordine.
- Bucket cassa = `getBusinessYear(payment.payment_date)`; bucket competenza =
  `getBusinessYear(issueById.get(payment.financial_document_id) ?? payment.payment_date)`.
- `bridge` = payment con doc collegato e `cashYear !== competenceYear`.
- Output grezzo non arrotondato; arrotondamento SOLO nella card al display (T-5).

## 4. Ciclo TDD (RED → GREEN → REFACTOR)

### Step 1 — RED: test helper (prima del codice)
`cashVsCompetenceReconciliation.test.ts`, fixture inline (no fixture condivise di
dominio). Tutti falsificabili:
- **T-1** fixture con le 2 cross-year + ≥1 same-year: asserire `competence[2023]`
  include i 4.500 e `cash[2023]` no; con bucket=payment_date `competence[2024]===
  cash[2024]` → mutazione = test rosso.
- **T-3** property-test conservazione: N dataset random → `Σ cash === Σ competence`
  su GREZZI (T-5), tolleranza 0.
- **T-2** symbol-guard: importa `getSignedPaymentAmount` da `fiscalModel.ts`, verifica
  stesso segno su `rimborso` e `rimborso_spese`; il signing NON è ri-scritto inline.
- **T-6** 5 rami: rimborso-cross-year, esclusione tassabilità (escluso da entrambe),
  unlinked→fallback cassa, doc multi-payment (1:N, ogni payment 1 volta), YTD.
- Bridge: esattamente le righe cross-year della fixture.
→ Eseguire `make test` sul file: RED (helper assente).

### Step 2 — GREEN: implementare helper + `export` dei 2 simboli
- Aggiungere `export` (solo) a `getSignedPaymentAmount` e
  `isPaymentExcludedByTaxabilityDefaults` in `fiscalModel.ts`.
- Implementare l'helper minimale. → test GREEN.
- **Non-regressione (T-4)**: `fiscalModel.test.ts` + `fiscalParity.test.ts` verdi
  dopo l'export (provano base legale intatta).

### Step 3 — Card condivisa + wiring (F-fe-1/3/4/5/6)
- `DashboardCashVsCompetenceCard.tsx` (prop `compact`): 2 colonne "Cassa (tu, per
  legge)" | "Data fattura (commercialista)", barra risultato Approccio-Bambino,
  copertura come **progress bar** per anno (non badge), YTD label inline, dettaglio
  ponte in collapsible `useState(!compact)`. Titolo user-oriented + microcopy
  anti-equivoco (F-fisc-5).
- `useDashboardData.ts`: `useGetList("financial_documents_summary", {filter:{
  "direction@eq":"outbound"}})`, mappa id→issue_date, chiama l'helper, espone il
  risultato. Gating identico a `data.fiscal`.
- Render in `DashboardAnnual.tsx` (dopo KPI fiscali) e `MobileDashboard.tsx`
  (`compact`, stesso blocco `data.fiscal`). UN solo componente, no markup duplicato.

### Step 4 — Controllori UI + smoke
- **Parità**: caso in `MobileDashboard.parity.test.tsx` (numeri identici desktop/mobile,
  falsificabile: rimuovi card → rosso). Component test che asserisce l'etichetta
  "per legge" sulla colonna cassa (F-fisc-5).
- **T-7 smoke prod OBBLIGATORIO** read-only `scripts/prod-smoke-cash-vs-competence.ts`
  + `smoke:cash-vs-competence`: assert competenza 2023=10.773,26 / 2024=9.240,18 /
  cassa 2024=13.740,18 / conservazione Σ=52.657,02 / **ponte = esattamente 2 righe**
  (FPR 10/23, FPR 9/25). 0 scritture (WF-19 N/A).

### Step 5 — REFACTOR (solo dopo verde) + docs nello stesso commit.

## 5. Verifiche (gate finale, deterministiche)

- `make typecheck` · `make lint` · `make build` → 0 errori.
- `make test` → tutti verdi, inclusi: helper (T-1/2/3/6), parità mobile, **e i
  non-regressione** `fiscalModel.test.ts` + `fiscalParity.test.ts` (T-4).
- `npm run smoke:ef-reminder-parity` → **9.005,91** invariato (base legale intatta).
- `npm run smoke:cash-vs-competence` → oracoli §8 + ponte=2 su prod reale.
- `npm run continuity:check` → verde (docs nello stesso commit).
- **Browser WF-17** desktop + mobile: card visibile nel blocco fiscale, copertura
  leggibile (progress bar), wording anti-equivoco presente, ponte espandibile su
  mobile, 0 errori console. Screenshot entrambe le viewport.

## 6. Review richieste

1. **Review piano** (questo doc) — multi-superficie + RAG, prima di implementare.
2. **Review implementazione** — multi-superficie (DB/Edge N/A, fiscale, frontend/mobile,
   TDD/controllori) + RAG + verifica sorgente, mutation-tested (rimuovi un controllore
   → rosso).
3. **Verifica finale** — gate §5 + browser WF-17.

## 7. Stop point / rischi

- **STOP prima del codice**: gate utente (non superare senza via esplicito).
- Non aggiungere migration/EF/view: se durante l'impl emerge che serve un layer DB,
  FERMARSI e tornare in spec (non salire di layer di nascosto).
- Non spacciare la competenza per "numero di Fabio" dove copertura <100% (DB-11/DOM-4).
- Non toccare la base legale: se un test di non-regressione (T-4) diventa rosso,
  STOP — è un bug introdotto, non un test da adattare (WF-5).
- Wording: la card NON deve indurre a dichiarare per competenza (F-fisc-5).

## 8. Documentazione e continuità

- Aggiornare `historical-analytics-handoff.md` + `development-continuity-map.md` +
  `CANTIERE.md` (prossima azione) nello STESSO commit del codice (COMMIT GATE).
- Learning candidato (se confermato in impl): "confronto cassa vs competenza
  data-fattura — riusare gli helper di tassabilità, mai ricodificare il signing
  (seconda verità); copertura linkage ≠ verità (DB-11/DOM-4)".

## 9. Follow-up esplicitamente fuori scope (v2/BR3)

- Entry manuale del ricavo dichiarato da Fabio → colonna Δ reale (serve schema).
- Esposizione del confronto all'AI snapshot/registry (BR3 headless).
- DB view `analytics_cash_vs_invoice_revenue` se nasce consumo AI/headless.

---

## 10. Esiti review piano (2026-06-20) — correzioni BINDING prima del codice

2 revisori (TDD/sequencing, frontend/integrazione), RAG :8001 + sorgente. Verdetti:
**TDD FLAG**, **Frontend PASS+FLAG**. Nessun BLOCK. Correzioni da applicare:

- **C1 (alta, F1 frontend) — esporre FUORI da `data.fiscal`**: la riconciliazione NON
  va dentro `data.fiscal` (è il `FiscalModel` da `buildDashboardModel` → toccarlo viola
  §3/T-4). Esporla come campo separato del return di `useDashboardData`
  (`{ data, outstandingReceivables, ..., cashVsCompetence }`, `useDashboardData.ts:219-233`),
  calcolata in una `useMemo` dedicata FUORI da `buildDashboardModel`. Le card leggono
  `cashVsCompetence` e restano gated su `data.fiscal != null`.
- **C2 (alta, [1]TDD/F2) — sequenza signing→esclusione**: già corretto in §3 (signing
  PRIMA, esclusione DOPO, come `fiscalModel.ts:232-244`). T-2 garantisce "stessi simboli
  importati", non l'ordine.
- **C3 (media, F3) — firma reale dell'helper**: già corretto in §3 (`projectById: Map`,
  `taxDefaults = fiscalConfig.taxabilityDefaults`).
- **C4 (alta, [2]TDD) — T-3 senza fast-check**: `fast-check` NON è dipendenza. Usare un
  generatore deterministico INLINE seeded (mulberry32) iterato N volte; nessuna nuova
  dep. Il dataset random DEVE includere anche payment esclusi (`nonTaxableCategories`)
  per provare l'esclusione simmetrica (Σ resta su soli taxable).
- **C5 (media, [5]TDD/T-5) — grezzi**: `byYear` espone `cashTaxable`/`competenceTaxable`
  NON arrotondati; nessun passaggio per `roundFiscalOutput` nell'helper; arrotondamento
  SOLO nella card. Test: assert che i decimali grezzi siano conservati (mutazione
  "arrotonda nell'helper" → T-3 rosso).
- **C6 (media, [4]TDD) — card multi-anno**: `byYear`/`bridge` calcolati su TUTTI gli anni
  del dataset (non gated su `isCurrentYear`); la card mostra la tabella completa anche
  per anni passati, renderizzata quando `data.fiscal != null`. Controllore: card presente
  anche per un anno passato.
- **C7 (media, [3]TDD/F5 frontend) — insert points reali**: desktop
  `DashboardAnnual.tsx` dentro il ternario `data.fiscal ?` (158-253), DOPO
  `DashboardFiscalKpis` (chiude ~211), prima della griglia ateco (~213). Mobile
  `MobileDashboard.tsx` dentro `{data.fiscal && (...)}` (195-234), dopo `MobileFiscalKpis`
  (229-232). NON esiste `MobileAnnualDashboard`; non infilare la card in `MobileFiscalKpis`.
- **C8 (bassa, [6]TDD/F4 frontend) — smoke + filtro**: `prod-smoke-cash-vs-competence.ts`
  replica `prod-smoke-ef-reminder-parity.ts` (`.env.production`, `process.exit(0/1)`, 0
  scritture, gate MANUALE non CI). Filtro view: `{"direction@eq":"outbound"}` (uniformare §2).
- **C9 (TDD) — T-2 mutation forte**: asserire valore IDENTICO (non solo stesso segno) tra
  helper e `getSignedPaymentAmount` importato su payload `rimborso` → una copia inline che
  divergesse di centesimi rompe il test.

Sweep confermato dai revisori: i soli consumer di `useDashboardData` sono
`DashboardAnnual.tsx`, `MobileDashboard.tsx`, `MobileDashboard.parity.test.tsx`.
`DashboardHistorical*` NON consuma dati fiscali → la card va SOLO nell'annuale.
Tutti i fatti tecnici (FK, view registrata, export additivo, `Progress` già importato in
`MobileDashboard.tsx:20,398`, pattern compact `DashboardAnnualAiSummaryCard.tsx:127`)
verificati su sorgente reale. Export-only su `fiscalModel.ts` = non-breaking (helper oggi
non esportati).
