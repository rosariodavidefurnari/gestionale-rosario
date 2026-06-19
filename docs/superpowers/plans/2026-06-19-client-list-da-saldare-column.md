# Piano — Colonna "Da saldare" nella lista clienti (#19)

Stato: draft (in attesa review piano + **gate utente prima del codice**)
Data: 2026-06-19
Spec: `docs/superpowers/specs/2026-06-19-client-list-da-saldare-column-design.md`
Tipo: frontend display, riusa vista `client_commercial_position`. Nessun
DB/schema/migration/EF/provider nuovo.

## Relazione con la spec

Esegue gli obiettivi: colonna "Da saldare" per-cliente nella lista clienti
(desktop colonna + mobile card), riuso `balance_due` canonico, export coerente,
con controllore puro + e2e. Rispetta D1-D6 e le correzioni della review
(view LEFT-JOIN, no `@in`, `String()` map key, helper puro, divergenza CFS).

## File coinvolti

- `src/components/atomic-crm/clients/clientBalanceCell.ts` — NUOVO helper puro
  `formatClientBalanceCell(balance_due) → {label,colorClass,formattedValue}`.
- `src/components/atomic-crm/clients/clientBalanceCell.test.ts` — NUOVO unit
  (controllore primario falsificabile).
- `src/components/atomic-crm/misc/columnDefinitions.ts` — aggiungere a
  `CLIENT_COLUMNS` `{key:"balance_due", label:"Da saldare", exportKey:"da_saldare"}`.
- `src/components/atomic-crm/clients/ClientListContent.tsx` — fetch vista (Map),
  colonna desktop (header+cella, ultima, `text-right tabular-nums`), passare la
  Map come prop a `ClientRow` e `ClientMobileCard`, riga valore mobile.
- `src/components/atomic-crm/clients/ClientList.tsx` — exporter: fetch full-view
  + Map + `da_saldare` nel row.
- `src/components/atomic-crm/clients/ClientFinancialSummary.tsx` — refactor
  cosmetico per consumare l'helper (mantiene `MetricCard`/icona, NON introduce
  "—"); `ClientFinancialSummary.test.tsx` resta verde (regression guard).
- e2e lista clienti (estendere esistente o nuovo
  `tests/e2e/client-list-balance.smoke.spec.ts`).
- `docs/development-continuity-map.md` (+ `architecture.md` per il gate
  continuity sui clienti) nello STESSO commit.

## Ciclo TDD (controllore primario — display, non money recompute)

- **RED**: `clientBalanceCell.test.ts` PRIMA dell'helper: positivo → "Da saldare"
  rosso + `eur(Math.abs)`; negativo → "Credito cliente" blu; zero → "—" muted.
  Eseguire → fallisce (helper assente).
- **GREEN**: implementare `formatClientBalanceCell` → test verde.
- **REFACTOR**: far consumare l'helper a `ClientFinancialSummary` mantenendo il
  suo test verde.

## Step

1. (controllore) `clientBalanceCell.ts` + `.test.ts` → RED, poi GREEN.
2. (columns) aggiungere la colonna a `CLIENT_COLUMNS` (key+label+exportKey).
3. (lista desktop) in `ClientListContent`:
   - `useGetList("client_commercial_position", {pagination:{page:1,perPage:1000},
     sort:{field:"client_name",order:"ASC"}})` (stessi params di `useDashboardData`
     per condividere la cache RQ); Map `String(client_id) → balance_due`;
   - header `ResizableHead colKey="balance_due"` ultimo, `cv("balance_due","text-right")`;
   - passare la Map a `ClientRow`; cella `cv("balance_due","text-right tabular-nums")`
     che rende `formatClientBalanceCell(map.get(String(client.id)) ?? null)`
     (miss/null → "—").
4. (mobile) passare la Map a `ClientMobileCard`; riga valore con lo stesso helper.
5. (export) in `ClientList.tsx`: rendere l'exporter async, fetch full-view via
   `dataProvider` (no `@in`), Map, `da_saldare: balance_due` nel row.
6. (refactor) `ClientFinancialSummary` consuma l'helper; test esistente verde.
7. (controllore export) unit/integration: colonna visibile → `da_saldare` nel
   row; nascosta → assente (lock `filterExportRow`).
8. (e2e) `resetAndSeedTestData()`; assert lista mostra `€ 2.984,50` + "Da saldare"
   per il cliente seed (valore UI, non CSV). Mobile-viewport opzionale (AC2).
9. (verifica repo) `make typecheck/lint/build`, `make test`, e2e mirato → verdi.
10. (browser WF-17) lista clienti desktop+mobile reale: colonna visibile
    (se nascosta da pref, toggle una volta — AC8), valore corretto, "—" su
    cliente a zero, 0 errori console. Screenshot entrambe le viewport.
11. (docs) `development-continuity-map.md` + `architecture.md` nello STESSO
    commit (continuity gate per "clienti"). `continuity:check` verde.
12. (review impl) multi-superficie + RAG PRIMA del merge.
13. (ship) commit unico → push `origin` → CI `gh -R rosariodavidefurnari/...`
    (WF-16/WF-7) → Vercel auto-deploy (frontend-only, nessuna EF/migration).
14. (post-deploy AC8) verificare/attivare la colonna se nascosta per pref salvata.

## Verifiche / criteri di uscita

- AC1-AC8 della spec.
- helper RED→GREEN dimostrato; export-survival falsificabile (nascondi colonna →
  campo assente); e2e valore reale esatto.
- typecheck/lint/build/unit verdi; `continuity:check` verde; CI verde sul fork.

## Stop point

- NIENTE codice finché l'utente non dà il via (gate attivo).
- Se per mostrare il valore servisse ordinare/filtrare per `balance_due`
  (provider custom) → STOP: è oltre lo scope v1 (non-obiettivo).
- Se emergesse necessità di toccare provider/EF/migration/vista → STOP (la
  diagnosi "display read-only" sarebbe errata).
- Se il refactor di `ClientFinancialSummary` rompe il suo test → NON adattare il
  test per farlo passare: capire la divergenza (D2) e preservare il contratto.

## Review richieste

- Review piano (questa) prima del gate.
- Review implementazione multi-superficie + RAG dopo il GREEN, prima del merge.

## Documentazione

- `development-continuity-map.md`: nota lista clienti "Da saldare" (riuso
  balance_due, sweep export+mobile+visibility).
- `architecture.md`: changelog entry (gate continuity "clienti").
- CANTIERE aggiornato a fine ciclo.
