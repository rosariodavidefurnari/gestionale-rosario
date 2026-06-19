# Spec — Colonna "Da saldare" nella lista clienti (#19)

Stato: review spec COMPLETATA (frontend/mobile = PASS; data/TDD/export = FLAG →
risolte in D1/D2/D3/D5/R3/AC/Controllore). In attesa **gate utente** prima di
piano/codice.
Data: 2026-06-19
Review: 2 revisori (frontend+mobile-parity, data-flow+provider+TDD/export),
entrambi con RAG :8001 + verifica sorgente. Correzioni HIGH applicate:
(1) `client_commercial_position` è `FROM clients LEFT JOIN ...` → ogni cliente
ha SEMPRE una riga, no-attività → `balance_due=0`; "—" = zero, non Map-miss;
(2) export NON usa `@in` (sintassi non verificata): riusa il fetch full-view
(perPage 1000, come la lista), nessuna stringa IN costruita a mano;
(3) Map key `String(client.id)` su entrambi i lati;
(4) controllore export-field-survival + valore euro reale esatto;
(5) colonna ultima, sempre visibile desktop, `text-right tabular-nums`.
Origine: `docs/superpowers/2026-06-15-gestionale-assessment.md` finding #19
("Lista clienti senza 'chi mi deve soldi?' → apri ogni cliente per i residui").
Tipo: frontend display, riusa una vista esistente. Nessun DB/schema/migration/EF.

## Problema

Nella lista clienti (`ClientList`/`ClientListContent`) non si vede quanto ogni
cliente deve ancora. Per sapere il residuo bisogna aprire ogni `ClientShow`
(dove `ClientFinancialSummary` mostra "Da saldare"/"Credito cliente"). Sorella
diretta di QW2 (card "Da incassare" aggregata): qui serve il dettaglio
PER-CLIENTE, scannabile a colpo d'occhio nella lista.

## Fonti di verità (verificate sul sorgente, snapshot working `654e8f61`)

- Residuo canonico cassa-aware: vista `client_commercial_position`, campo
  `balance_due` (lavoro+spese consegnati − incassato `ricevuto`). Tipo in
  `types.ts:533-542` (`ClientCommercialPosition`: `client_id, client_name,
  total_fees, total_expenses, total_owed, total_paid, balance_due,
  projects_count`).
- Provider PK della vista = `["client_id"]` (`dataProvider.ts:65`) → il record
  `id` della vista è il `client_id` → join per `client.id` corretto.
- Pattern di display già esistente (da riusare): `ClientFinancialSummary.tsx`
  (in `ClientShow`) legge la vista con `useGetOne` per `record.id` e mostra:
  `balance_due < 0 ? "Credito cliente" (blu) : "Da saldare" (rosso)`,
  valore `eur(Math.abs(balance_due))`.
- Struttura vista (verificata `20260401094930_single_source_financials.sql:164-181`):
  `SELECT ... FROM clients c LEFT JOIN fee_agg/expense_agg/payment_agg/...` →
  OGNI cliente ha SEMPRE esattamente una riga; cliente senza attività →
  `balance_due = ROUND(COALESCE(0,0)+0-0,2) = 0`. Quindi il caso "—" è
  `balance_due === 0`, NON una Map-miss (la Map-miss è solo difensiva, possibile
  solo se i clienti superano il cap `perPage:1000`).
- Lista: `ClientListContent.tsx` rende tabella desktop (`useColumnVisibility`,
  `useResizableColumns`, `CLIENT_COLUMNS`) e `ClientMobileCard` su mobile. Dati
  da `useListContext<Client>()` (risorsa `clients`, NON contiene `balance_due`).
  `ClientRow` (`:142-214`) e `ClientMobileCard` (`:217-240`) sono componenti
  separati nello stesso file: ENTRAMBI vanno aggiornati (UI-7); la Map dei saldi
  va passata come prop a entrambi (`ClientRow` oggi riceve solo `cv`+`createPath`,
  `ClientMobileCard` solo `client`+`link`).
- Colonne: `CLIENT_COLUMNS` in `misc/columnDefinitions.ts:63-69`
  (`{key,label,exportKey?}`); `exportKey` opzionale.
- Export CSV: `ClientList.tsx:26-58`, `Exporter<Client>` hand-built →
  `filterExportRow(row, visibleKeys, columns)`. NON itera automaticamente le
  colonne: i campi sono espliciti. Quindi aggiungere una colonna NON rompe
  l'export, ma per includere il valore va esteso l'exporter (fetch della vista).
- Visibilità colonne: `useColumnVisibility.ts` persiste in tabella `settings`
  (NON localStorage). `visibleKeys = savedColumns ?? allKeys`. Conseguenza:
  una colonna NUOVA è visibile di default SOLO per utenti senza preferenza
  salvata; per chi ha già salvato una preferenza resta nascosta finché non la
  attiva. Il salvataggio memorizza il set VISIBILE (non l'insieme noto), quindi
  NON è possibile distinguere "colonna nuova" da "colonna nascosta apposta" →
  niente union-merge automatico (sarebbe re-show di colonne nascoste volontariamente).
- Helper clamp già esistenti (QW2): `src/lib/analytics/outstandingReceivables.ts`
  (`sumOutstandingReceivables` = Σ max(0,balance_due), `countOpenReceivables`).
  Per il display PER-CLIENTE si usa la semantica di `ClientFinancialSummary`
  (mostra anche il credito, segno-aware), non il clamp aggregato.
- RAG DeepWiki (:8001, `gemini-2.5-pro`): ha confermato le superfici (export,
  column visibility, resizable, mobile, sort/filter); ha sbagliato lo storage
  (ha detto localStorage, è `settings` DB) → claim falsificato sul sorgente.

## Obiettivi

1. Mostrare il residuo per-cliente ("Da saldare"/"Credito cliente") nella lista
   clienti, desktop E mobile, scannabile a colpo d'occhio.
2. Riusare `client_commercial_position.balance_due` (fonte canonica, SYSTEM-FIRST,
   nessun ricalcolo).
3. Coerenza export CSV (la colonna visibile compare anche nell'export).
4. Un controllore eseguibile che fissa il formato/label e la presenza in lista.

## Decisioni

- **D1 — Colonna dedicata, non badge inline.** impeccable register=product:
  "predictable grids, familiar patterns are features, density". Una colonna
  numerica dedicata, allineata a destra, è il pattern scannabile standard (stile
  tabelle Linear/Stripe) e batte un badge inline sotto il nome (che intasa la
  cella identità ed è più difficile da confrontare). Dettagli (post review):
  - colonna ULTIMA (dopo "Fonte"), header `cv("balance_due", "text-right")`,
    cella `cv("balance_due", "text-right tabular-nums")` — header E cella DEVONO
    portare la stessa key `cv()` o `tableLayout:fixed` disallinea;
  - SEMPRE visibile su desktop (NESSUN tier `hidden md:`/`lg:`): è il valore
    primario della feature, non un dato secondario;
  - `useResizableColumns` inizializza la larghezza della nuova colonna dal render
    (`offsetWidth`) → nessuna width hardcoded necessaria.
  - Mobile: riga valore in `ClientMobileCard` (responsive strutturale).
- **D2 — Helper puro + semantica `ClientFinancialSummary`.** Estrarre
  `formatClientBalanceCell(balance_due) → {label, colorClass, formattedValue}`:
  `> 0` → "Da saldare" (rosso); `< 0` → "Credito cliente" (blu);
  `=== 0` → label "—" muted. `formattedValue = eur(Math.abs(balance_due))`.
  Lista + mobile consumano tutti e tre (incluso il ramo zero → "—").
  **Divergenza voluta (F3):** `ClientFinancialSummary` mostra SEMPRE un valore
  (`eur(0)` per zero, dentro `MetricCard` con icona) e NON usa il ramo "—". Il
  refactor di `ClientFinancialSummary` per consumare l'helper è IN-SCOPE ma
  cosmetico (mantiene `MetricCard`/icona, NON introduce "—"); il suo test
  esistente `ClientFinancialSummary.test.tsx` è la regression guard e deve
  restare verde. L'invariante "stesso valore di ClientShow" vale sul NUMERO; il
  rendering dello zero diverge per design.
- **D3 — Fetch della vista una volta in `ClientListContent`** via
  `useGetList("client_commercial_position", {pagination:{page:1,perPage:1000},
  sort:{field:"client_name",order:"ASC"}})` — STESSI params/queryKey del fetch
  che fa già `useDashboardData` (QW2) così React Query condivide la cache (un
  solo round-trip; DIP/no-second-fetch). Map per `String(client_id)`; lookup per
  `String(client.id)` (i `Client.id` sono `Identifier`, i `client_id` vista sono
  `string`: forzare `String()` su entrambi i lati). Ogni cliente ha una riga
  (LEFT JOIN) → "—" = `balance_due===0`; Map-miss solo difensiva (>1000 cap).
- **D4 — Colonna in `CLIENT_COLUMNS`** (`{key:"balance_due", label:"Da saldare",
  exportKey:"da_saldare"}`) per integrare visibility + resizable + export.
- **D5 — Export esteso, RIUSANDO il fetch full-view (NO `@in`).** L'exporter
  (`Exporter<Client>`, async) fa `dataProvider.getList("client_commercial_position",
  {pagination:{page:1,perPage:1000}, sort, filter:{}})` (stesso pattern di D3,
  niente stringa `client_id@in` costruita a mano → niente limiti URL né
  escaping), costruisce la Map per `String(client_id)`, aggiunge
  `da_saldare: balance_due` al row. `filterExportRow` tiene la chiave solo se
  `exportKey` è tra le colonne VISIBILI → il campo sopravvive quando la colonna
  è visibile, è assente quando nascosta (vedi Controllore). NB formati diversi:
  CSV `2984,5` (downloadCSVItalian) vs UI `€ 2.984,50` — non confonderli.
- **D6 — Caveat visibilità documentato, NON redesign.** La colonna è visibile di
  default per chi non ha preferenze salvate; chi ha una preferenza salvata la
  attiva una volta da `ColumnVisibilityButton`. NON si tocca il data-model delle
  preferenze (single-user, costo/rischio sproporzionato).

## Non-obiettivi

- NON ordinare/filtrare la lista clienti per `balance_due` (campo di vista
  esterna; la risorsa `clients` non lo supporta senza provider custom — RAG +
  sorgente confermano `SortButton fields=["name","created_at"]`). Eventuale
  futuro.
- NON cambiare la semantica di `balance_due` né la vista.
- NON ridisegnare il modello delle preferenze colonne (D6).
- NON toccare DB/migration/EF/provider (oltre alla lettura della vista già
  registrata).

## Invarianti

- Il valore in lista = lo stesso `balance_due` mostrato in `ClientShow`
  (`ClientFinancialSummary`) per lo stesso cliente (nessuna seconda verità).
- Parità desktop/mobile (UI-7): il residuo compare su entrambe le superfici.
- Nessun ricalcolo di soldi lato lista (solo display del valore di vista).

## Rischi

- **R1 — Fetch extra vista** (`perPage 1000`) sul render lista. Single-user,
  accettabile (la dashboard fa lo stesso). Osservare in browser.
- **R2 — Colonna nascosta per utente con preferenza salvata** (D6). Documentato;
  mitigazione = toggle una volta.
- **R3 — Cliente senza attività** → la vista (LEFT JOIN) restituisce comunque la
  riga con `balance_due=0` → "—". La Map-miss è solo difensiva (clienti oltre il
  cap `perPage:1000`): fallback a "—", nessun crash.
- **R4 — Allineamento riga lista ↔ vista** per id: PK vista = `client_id`
  (verificato). Map key e lookup SEMPRE via `String(...)` (Identifier vs string).
- **R5 — Colonna nascosta per l'utente reale (F4).** Rosario ha probabilmente una
  preferenza colonne `clients` salvata → la colonna spedirà NASCOSTA per lui
  (vedi D6). Mitigazione obbligatoria post-deploy: AC8.

## Criteri di accettazione

- AC1: desktop, lista clienti → colonna "Da saldare" con il residuo per-cliente
  (rosso se deve, blu "Credito cliente" se negativo, "—" se 0), allineata a
  destra, ridimensionabile, toggle-abile.
- AC2: mobile, `ClientMobileCard` → stesso valore/label del desktop (UI-7).
- AC3: il valore per un cliente = quello mostrato in `ClientShow` (stessa vista).
- AC4: export CSV con colonna "Da saldare" visibile → include `da_saldare`.
- AC5: cliente senza attività → `balance_due=0` → "—", nessun crash (la riga
  vista esiste sempre; non è una Map-miss).
- AC6: `make typecheck/lint/build` verdi; unit del helper puro + e2e lista verdi;
  `continuity:check` verde (docs nello stesso commit).
- AC7: 0 errori console desktop+mobile (WF-17).
- AC8 (post-deploy, ops): verificare la preferenza colonne `clients` salvata; se
  la colonna "Da saldare" è nascosta, attivarla una volta da
  `ColumnVisibilityButton` (altrimenti AC1 fallisce silenziosamente per
  l'unico utente — R5/F4).

## Controllore (executable guardrail)

- **Primario (puro, falsificabile):** unit test su `formatClientBalanceCell`
  (es. `clientBalanceCell.test.ts`): positivo → label "Da saldare", classe rossa,
  `Math.abs` formattato; negativo → "Credito cliente", classe blu;
  zero → label "—" muted. Falsificabile: cambiare segno/label/colore rompe il test.
- **Export field-survival (falsificabile):** unit/integration su
  `filterExportRow` + row builder: colonna VISIBILE → `da_saldare` presente nel
  row esportato; colonna NASCOSTA → assente. Lock del trap "colonna visibile ma
  assente dal CSV".
- **Integrazione e2e:** estendere la lista clienti con `resetAndSeedTestData()`:
  la fixture produce un cliente con `balance_due` deterministico (la e2e QW2
  `dashboard-annual.smoke.spec.ts` asserisce `2985` / "1 cliente con saldo
  aperto"). Assert che la lista mostri il valore UI formattato esatto
  (`€ 2.984,50`, NON il `2984,5` del CSV) con label "Da saldare". Mobile-viewport
  opzionale per AC2. (Se la colonna è nascosta per pref salvata nel runtime di
  test, il test deve forzare/azzerare la pref o asserire dopo toggle.)
- Niente MONEY/FISCAL TDD nuovo: è display read-only di un valore di vista già
  canonico (nessun nuovo calcolo); il controllore fissa formato + presenza, non
  ricalcola soldi.

## Piano (placeholder)

Da creare con `writing-plans` dopo review spec + go utente. File attesi:
helper puro + test, `ClientListContent.tsx` (fetch vista + colonna + mobile
card), `misc/columnDefinitions.ts` (CLIENT_COLUMNS), `ClientList.tsx` (exporter),
e2e, docs. Gate: nessun codice finché l'utente non dà il via.
