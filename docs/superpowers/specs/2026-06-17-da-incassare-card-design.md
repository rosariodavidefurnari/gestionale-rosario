# Card "Da incassare" — correttezza (QW2) — Design Spec

Data: 2026-06-17
Stato: v2 (semantica utente confermata + review spec multi-superficie integrata)
Origine: assessment `docs/superpowers/2026-06-15-gestionale-assessment.md` QW2 —
la card "Da incassare" sottostima (mostra 375, il reale e' **6.697,48**).

## REVISIONE v2 (post review spec multi-superficie + RAG) — AUTORITATIVA

Vince sul corpo dove confligge. La review (3 revisori DB/fiscale + frontend/mobile
+ TDD, RAG + sorgente) ha emesso **BLOCK**: la scelta della fonte
(`client_commercial_position.balance_due`, cumulativo, clamp per-cliente) e'
giusta, ma la card cambia semantica su 3 superfici non dichiarate. Integrazioni
(tutte verificate su file:line reale):

- **B1 — Progress bar (DashboardKpiCards.tsx:64-92).** La card NON e' solo un
  numero: ha una barra `received=cashReceivedNet(anno)` / `total=received+pending`
  + "X incassati su Y (%)". Se `pending` diventa cumulativo (~6.7k) ma `received`
  resta cassa dell'anno → barra incoerente. **Decisione: RIMUOVERE la barra da
  questa card.** La card mostra UN numero grande = residuo cumulativo + sottotitolo
  "N clienti con saldo aperto" (Approccio Bambino: un concetto = un numero). Il
  tasso di incasso annuale, se servira', sara' una card separata (fuori scope).
- **B2 — Seconda verita' AI (`src/lib/analytics/buildAnnualOperationsContext.ts:252-269`,
  FRONTEND → nessun deploy EF).** Emette `pending_payments_total` (=375). Se la
  card mostra 6.7k l'AI annuale divergerebbe (viola DOM-4 + Boundary AI).
  **Decisione**: calcolare `outstandingReceivablesTotal` (cumulativo) UNA volta in
  `useDashboardData` e passarlo SIA alla card SIA a `buildAnnualOperationsContext`
  come NUOVO metric ("Da incassare (totale)", basis cumulativo). `pendingPaymentsTotal/
  Count` NON si toccano (servono a cashflow forecast `dashboardModel.ts:604` + AI),
  ma il loro label AI va disambiguato ("pagamenti attesi inseriti — anno"). Controllore:
  card == metric AI (stessa fonte).
- **B3 — E2E `tests/e2e/dashboard-annual.smoke.spec.ts:35-37`** asserisce `2500`
  ("2000 in_attesa + 500 scaduto"). Cambiando fonte → RED garantito. **Decisione**:
  RED→GREEN dichiarato — aggiornare l'assert al valore client-level ESATTO calcolato
  dal fixture deterministico `resetAndSeedTestData` (NON il project-level 3953,50 di
  `calculations.smoke.spec.ts:57`, che resta invariato).
- **I4 — Altitudine wiring.** Il residuo cumulativo NON va in `buildDashboardModel`
  (year-scoped, memoizzato su `year`, `useDashboardData.ts:89-98`). **Decisione**:
  `useGetList("client_commercial_position")` in `useDashboardData` (PK gia' in
  `dataProvider.ts`, tipo in `types.ts`), aggregare nel hook, passare come NUOVO
  prop a `DashboardKpiCards` (sibling di `kpis`), propagare da `DashboardAnnual.tsx`
  E `MobileDashboard.tsx` (UI-7).
- **I5 — Funzione pura + grounding deterministico.** **Decisione**: funzione pura
  isolata `sumOutstandingReceivables(rows)=Σ max(0,toNum(balance_due))` +
  `countOpenReceivables(rows)` in modulo testabile (mirror di
  `mapClientCommercialPositions`), unit con fixture TS fissi (positivi/negativi/
  zero/null→0/vuoto). Il check "PROD = 6.697,48" e' gate manuale di accettazione,
  NON test committato (DETERMINISTIC WORK RULE).
- **MINOR**: sottotitolo "N clienti con saldo aperto" (=3, non "progetti");
  km contato 1 sola volta nella vista (`canonicalized_expenses`, DB-8 non
  applicabile — fee_* non includono km); card resta lavoro-based, NON riconciliare
  con `financial_documents_summary` (residuo invoice-based = nozione distinta);
  `pendingPaymentsTotal/Count` restano nel model.

Scope confermato: **frontend-only** (vista `client_commercial_position` gia'
esistente; `buildAnnualOperationsContext` e' client-side) → nessuna migration,
nessun deploy EF; Vercel auto-deploy al merge.

## Problema (verificato sul reale)

La card "Da incassare" (`DashboardKpiCards.tsx`) mostra `pendingPaymentsTotal`,
calcolato in `dashboardModel.ts:299-306` come somma dei `payments` dell'ANNO
selezionato con `status != 'ricevuto'` e `payment_type != 'rimborso'`.

Grounding su PROD (deterministico, MCP):

- I `payments` non-`ricevuto` non-rimborso sono **1 sola riga**: uno `scaduto`
  da **375,00** (Comune Aidone). Quindi la card mostra `375`.
- Il residuo REALE per cliente (lavoro consegnato − incassato in cassa) e':
  Gustare ~5.366,77 + Comune Aidone 375 + Laurus 285 ≈ **~6.027** (assessment:
  6.412; la differenza dipende da spese/km e arrotondamenti del modello canonico,
  che la query manuale non replica — vedi sotto).

Causa radice: la card deriva "da incassare" dalle SOLE righe `payments`
"previste". Ma l'utente registra il lavoro (`services`) e poi incassa; quasi mai
crea una riga payment "attesa" per ogni lavoro. Quindi il lavoro consegnato-non-
incassato e' INVISIBILE alla card. Inoltre il filtro per ANNO nasconde i crediti
vecchi (assessment #23: uno scaduto di 2,5 anni invisibile).

## Fonte di verita' canonica (gia' esistente — SYSTEM-FIRST)

La migration `20260401094930_single_source_financials.sql` crea DUE viste con
`balance_due` cassa-aware:

- `project_financials` (per progetto, riga 15): `balance_due = total_fees +
  total_expenses − total_paid`, con `total_paid` filtrato `status='ricevuto'`
  (riga 60). MA aggrega solo `WHERE project_id IS NOT NULL` → ESCLUDE il lavoro
  senza progetto (su prod: 1 servizio Laurus da 285 EUR andrebbe perso).
- `client_commercial_position` (per cliente, riga 94): UNISCE esplicitamente i
  rami `project_id IS NOT NULL` E `project_id IS NULL` per services, expenses e
  payments (righe 99-145), con `total_paid` filtrato `status='ricevuto'`
  (righe 40,45) e `balance_due` finale. Cattura TUTTO il residuo, anche
  no-project.

**Fonte scelta: `client_commercial_position.balance_due`** — e' l'unica che non
perde il residuo no-project. E' gia' la definizione canonica di "quanto mi devono
ancora" (lavoro + spese consegnati − cassa realmente entrata) ed e' gia' consumata
da `src/lib/ai/unifiedCrmFinancialSummaries.ts` (precedente da rispecchiare). Il
dashboard model invece NO: `buildDashboardKpis` riceve
`payments/services/projects/quotes`, non queste viste.

## Obiettivo

La card "Da incassare" deve mostrare il residuo REALE: **somma dei `balance_due`
positivi per cliente, cumulativa su tutti gli anni**, leggendo la fonte
canonica `client_commercial_position` (no seconda verita').

## Non-obiettivi

- NON ricalcolare il residuo nel dashboard model con una formula propria
  (seconda verita'): riusare `balance_due`.
- NON toccare la logica di cassa fiscale (forfettario: solo `ricevuto` conta —
  gia' garantito da `balance_due`).
- NON creare/scrivere payment "attesi" automaticamente.
- NON ridisegnare le altre card KPI.

## Decisione di design

1. **Sorgente**: nuovo input al dashboard model con i `balance_due` per cliente
   dalla vista `client_commercial_position` (fetch lato provider/dashboard, mirror
   del pattern gia' usato da `unifiedCrmFinancialSummaries.ts`). Usare la vista
   client-level (non `project_financials`) perche' include anche il residuo
   no-project.
2. **Formula card**: `daIncassare = Σ max(0, balance_due_cliente)` su TUTTI i
   clienti (cumulativo, non filtrato per anno). Il clamp per-cliente a ≥0 evita
   che un cliente sovra-incassato mascheri un credito altrove.
3. **Cumulativo, non per anno**: "da incassare" e' denaro dovuto ORA,
   indipendente dall'anno selezionato → mostra il residuo totale corrente (cosi'
   emerge anche lo scaduto vecchio, assessment #23). L'etichetta/sottotitolo deve
   chiarire che e' il totale corrente, non l'anno.
4. **Sottotitolo**: oggi e' "N pagamenti in attesa" (conteggio payment-row).
   Diventa "N progetti con saldo aperto" (o equivalente) coerente con la nuova
   fonte. Da rifinire nel piano.
5. **Parita' mobile (UI-7)**: `DashboardKpiCards` e' condivisa
   `DashboardAnnual` (desktop) + `MobileDashboard`. Il nuovo dato finanziario va
   passato da ENTRAMBI i consumer, altrimenti mobile mostra un valore errato
   (rischio critico).

## Invarianti / rischi

| Sev | Rischio | Mitigazione |
|---|---|---|
| 🔴 | Seconda verita' (residuo ricalcolato) diverge da `client_commercial_position` | riusare `balance_due`, non ricalcolare |
| 🔴 | Mobile mostra valore diverso dal desktop | passare il prop da `DashboardAnnual` E `MobileDashboard`; controllore parita' |
| 🟠 | Cassa errata (contare `in_attesa` come incassato) | `balance_due.total_paid` filtra gia' `ricevuto` |
| 🟠 | Cliente sovra-incassato che riduce il totale | clamp per-cliente `max(0, balance_due)` |
| 🟢 | Lavoro/spese senza `project_id` esclusi (risolto) | `client_commercial_position` UNISCE i rami project/no-project → 285 Laurus incluso |
| 🟡 | Confusione anno vs cumulativo nell'etichetta | copy esplicito "totale corrente" |

## Controllori (MONEY — TDD, RED prima)

1. Unit puro sull'aggregazione: dato un set di `balance_due` per cliente
   (positivi e negativi), `daIncassare = Σ max(0, balance_due)`; un cliente
   negativo NON riduce il totale.
2. Parita': il prop "da incassare" passato a `DashboardKpiCards` arriva sia da
   `DashboardAnnual` sia da `MobileDashboard` (test/grep di tutti i consumer).
3. Smoke/grounding: sullo stato prod attuale, Σ `balance_due>0` ≈ 6k, NON 375.
4. Browser WF-17 desktop + mobile: la card mostra il residuo reale, leggibile su
   entrambe le viewport, 0 errori console.

## Criteri di accettazione

- La card "Da incassare" mostra Σ `balance_due` positivi (cumulativo), ~6k sui
  dati reali, non 375.
- Stesso valore su desktop e mobile.
- Nessun ricalcolo parallelo del residuo: la fonte e' `client_commercial_position`.
- typecheck/lint/test verdi; browser desktop+mobile verificati.

## Semantica di business — CONFERMATA dall'utente (2026-06-17)

1. **Include compensi + rimborsi spese/km** = `balance_due` intero
   (`total_fees + total_expenses − total_paid_ricevuto`). CONFERMATO.
2. **Cumulativo** (tutti gli anni), non solo l'anno selezionato. CONFERMATO
   (i crediti vecchi devono comparire — assessment #23).
3. No-project incluso usando `client_commercial_position` (cattura il residuo
   no-project, es. 285 Laurus). RISOLTO via fonte canonica.

## Review gate

1. Review utente di questa spec (semantica di business: domande aperte).
2. Review spec multi-superficie + RAG (DB/viste, dominio fiscale, frontend/mobile,
   provider, TDD).
3. Piano + review piano.
4. Impl TDD → review impl.
5. Browser desktop + mobile (WF-17).
6. (Nessun deploy backend: la vista `project_financials` esiste gia'; e' un fix
   frontend + data wiring. Vercel auto-deploy al merge.)

## Stop point

- Niente seconda verita' del residuo: se non posso riusare `balance_due`, fermarsi
  e rivedere la spec.
- Niente "fatto" senza parita' desktop/mobile verificata e browser su entrambe.
