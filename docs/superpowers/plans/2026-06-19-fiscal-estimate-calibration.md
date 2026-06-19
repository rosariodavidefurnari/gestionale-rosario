# Piano — Formula fiscale reale (forfettario) validata su dichiarazioni AdE

Stato: draft (in attesa review piano)
Data: 2026-06-19
Spec: `docs/superpowers/specs/2026-06-19-fiscal-estimate-calibration-design.md`
(autorita': **sezione 14** — le sezioni 1-13 sono superate)

Relazione con la spec: implementa §14 (formula reale + 3 numeri INPS distinti +
aliquota per-anno + data-fattura come miglioria post-BR2). NON implementa la
"calibrazione su aliquota effettiva" (superata). NON tocca `total_inps`
(rettifica §14.3: era un fix distruttivo).

## Obiettivo

Il builder fiscale riproduce il commercialista **al centesimo** sugli oracoli
reali, e la dashboard mostra numeri veri:
- 2023: imposta **429** + INPS competenza **2.249**
- 2024: imposta **233** + INPS competenza **1.879**

## Invarianti (dalla spec, non negoziabili)

- INV-1 cassa per i ricavi resta il default repo; l'attribuzione data-fattura va
  isolata SOLO nello stimatore predittivo (non riscrivere la base cassa altrove).
- Parita' client/EF: `fiscalParity.test.ts` verde dopo ogni fase.
- NESSUN UPDATE su `fiscal_declarations.total_inps` (3.667 e' corretto/riconciliato).
- 3 numeri INPS distinti: competenza (output stima) · versato-cassa (deduce imposta)
  · total_inps DB (non si tocca).
- Assert money su NUMERI, mai stringhe `toLocaleString` (WF-20).
- Business date via `dateTimezone` (WF-8/9/10).

## Data-flow (verificato su sorgente + RAG)

- `DashboardAnnual.tsx` fetcha payments/quotes/services/projects/clients/expenses/
  `getFiscalConfig()` → `buildDashboardModel` → `buildFiscalModel` →
  `buildFiscalYearEstimate`.
- `useFiscalReality` fetcha `getFiscalObligations(Y)` + `getEnrichedPaymentLinesForYear(Y)`.
- Righe F24 enriched portano `obligation_id` → `component` (inps_*/imposta_*) +
  `submission_date` + `amount`. Da qui si deriva `contributi_versati_cassa(Y)`.
- `fiscalConfig` (da `getFiscalConfig()`) porta `aliquotaINPS` (oggi scalare).

## Fasi (ognuna RED → GREEN → REFACTOR, money TDD)

### Fase 0 — Firma pura del builder + oracoli RED (fondamenta TDD)
- File: `fiscalModel.ts`, `fiscalModelTypes.ts`, nuovo `fiscalFormula.ts` (helper puro)
  + `_shared/fiscalDeadlineCalculation.ts`.
- Definire input ESPLICITI inline (review TDD F1): la stima accetta
  `{ redditoLordo, aliquotaGs, contributiVersatiCassa, aliquotaSost }` (o
  `componentiPositivi + coefficiente` → redditoLordo). Niente fetch dentro il puro.
- RED: `fiscalFormula.test.ts` con i 2 oracoli, **4 assert numerici per anno**
  (imposta + INPS, ±0,01). Fixture inline (no seed dominio).
- Stop: confermare RED su ENTRAMBI gli anni e componenti prima di Fase 1.

### Fase 1 — Formula reale (client + EF, parity) → GREEN
- `inps_competenza = redditoLordo × aliquotaGs(anno)`.
- `imposta = max(0, redditoLordo − contributiVersatiCassa) × aliquotaSost(anno)`.
- Applicare identico in client (`fiscalModel.ts`) e EF (`fiscalDeadlineCalculation.ts`).
- Estendere `fiscalParity.test.ts` ai nuovi rami. GREEN sugli oracoli.

### Fase 2 — `aliquotaINPS` storicizzata per-anno (CFG-1 / DB-1 sweep)
- File: `types.ts`, `defaultConfiguration.ts`, `ConfigurationContext.tsx`,
  `settings/FiscalSettingsSection.tsx`, copia EF, `fiscalParity.test.ts`, i 4 test
  che fissano 26,07.
- Modello: mappa anno→aliquota `{2023:26.23, 2024:26.07, 2025:26.07, 2026:26.07}`
  con default esplicito anno corrente (review fiscale F3: non inventare; allineare
  a circolare INPS dell'anno). Resolver `getAliquotaGs(config, year)` sul pattern
  di `getAliquotaSostitutiva`. Nessun minimale (GS).
- Additivo: vive in `settings`, nessuna migration.

### Fase 3 — `contributi_versati_cassa(Y)` dai F24 (CORRETTO post review piano)
- Helper puro `sumInpsContributionsPaidInYear(enrichedLines, year)`:
  - **allowlist esplicita** delle component contributive INPS:
    `["inps_saldo","inps_acconto_1","inps_acconto_2"]` (review fiscale F1).
    ESCLUDERE `interessi_inps` (DB-7: interessi NON deducibili, non sono contributi).
  - filtrare per **`submission_date` nell'anno `Y`** (cassa reale = quando il
    denaro esce), NON per `payment_year` dell'obbligazione (review fiscale F2:
    una rata `payment_year=2024` con `submission_date=2025` NON va contata nel 2024).
  - test: riga `interessi_inps` esclusa; riga `submission_date=2025` esclusa dal 2024.
- **Oracolo F24→2.538** (review fiscale): fixture F24 reale 2024 (saldo INPS 2023
  pagato 2024 + acconti INPS 2024) somma esattamente a **2.538**. Senza, il giunto
  derivazione↔formula non e' bloccato.
- Wiring SINGOLA FONTE (review DB FLAG-1): NON aggiungere fetch a `DashboardAnnual`
  (creerebbe doppio fetch: `useFiscalReality` gia' fetcha obblighi+F24). Derivare
  `contributiVersatiCassa(Y)` da `useFiscalReality` (che ha gia' `enrichedPaymentLines`)
  e iniettarlo nei `fiscalKpis` via uno step di arricchimento, oppure unificare in
  un hook solo. Il puro non fetcha (SRP). Anni senza F24 reali → 0 (come 2023 LM035=0).

### Fase 4 — ricavi: cassa v1 + flag data-fattura (post-BR2)
- v1: la base ricavi resta `payments` per `payment_date` (cassa) — invariata.
- Helper puro `attributeRevenueYear(payment, linkedDoc)`: se `financial_document_id`
  presente usa `issue_date` (anno), altrimenti `payment_date`. Test 2 rami
  (Gustare FPR 10/23: con doc → 2023; orfano → 2024, no-guess).
- Controllore deterministico che CONTA/segnala le fatture cross-year non linkate
  (review DB F2). Documentare: in prod oggi 0 link → effetto zero finche' BR2 non
  collega; nessun numero 2025 cambia per questo in v1.

### Fase 5 — Superfici UI (sweep + mobile parity UI-7)
- `DashboardFiscalKpis`: anno CHIUSO (dichiarazione reale presente) → mostra i reali
  (competenza 1.879 / imposta 233, totale 2.112), NON 3.900 e NON il teorico; anno
  CORRENTE → stima formula; label `definitivo`/`stima`. Fonte reali: `getFiscalDeclaration(year)`
  (gia' esistente, gia' fetchato in `DashboardAnnual` per `selectedYear-1` → estendere
  a `selectedYear`).
- `DashboardNetAvailabilityCard` (consumer `taxReserve = stimaInps + stimaImposta`):
  deve derivare dai `fiscalKpis` come SINGLE SOURCE (review frontend FLAG-3); se i
  KPI diventano reali per anno chiuso, taxReserve segue automaticamente, NON un
  secondo path.
- Mobile (review frontend FLAG-2): `MobileFiscalKpis` (inline in `MobileDashboard.tsx`)
  oggi mostra SOLO accantonamento + prossima scadenza, NON le card INPS/imposta ne'
  il concetto reale/stima. DECISIONE: aggiungere su mobile la riga "Tasse anno"
  (INPS+imposta, label stima/definitivo) allineata al desktop — i dati arrivano dallo
  STESSO `fiscalKpis` (nessuna seconda build). Se il redesign mobile e' troppo
  ampio per v1, documentare ESPLICITAMENTE il gap nel Cantiere (no silenzio, UI-7).
- Component test desktop≡mobile sui KPI fiscali (stessa fonte `fiscalKpis`). WF-9
  cross-timezone sulle date scadenza.

### Fase 6 — EF `fiscal_deadline_check` (D7/DOM-5)
- Aggiungere fetch `fiscal_declarations` + righe F24; usare la STESSA formula
  (parity) per i reminder. Single-user (service-role). RLS intatte (additivo).
- Deploy manuale EF (BE-1) dopo merge.

### Fase 7 — Verifica finale
- `make typecheck`, `make lint`, `make build`, `npm run continuity:check`,
  `deno check` EF, suite unit + parity verde, smoke e2e.
- Browser WF-17 desktop + mobile: card mostra 2.112 sul 2024, stima sull'anno
  corrente, 0 errori console.

## Controllori (committati)

- `fiscalFormula.test.ts`: oracoli 2023/2024 (4 assert/anno: imposta + INPS).
- `sumInpsContributionsPaidInYear.test.ts`: oracolo F24 reale 2024 → **2.538**;
  `interessi_inps` ESCLUSO; riga `submission_date=2025` esclusa dal 2024.
- **Oracolo del giunto (review fiscale)**: test end-to-end puro che, dato il set F24
  reale 2024, deriva 2.538 e lo inietta nell'oracolo imposta → 233 (lega derivazione
  ↔ formula, non testarli isolati).
- `fiscalParity.test.ts` esteso: scenario concreto che passa `contributiVersatiCassa`
  + `aliquotaGs` per-anno e asserisce client ≡ EF sui nuovi rami.
- `attributeRevenueYear.test.ts`: 2 rami (linked→issue_date, orfano→payment_date),
  flag cross-year simmetrico su entrambi i confini d'anno, no-guess.
- component test KPI desktop≡mobile (stessa fonte `fiscalKpis`); e2e smoke (dati demo
  + cleanup `finally`, WF-19); WF-20 (assert su numeri/regex grouping-agnostica).

## Stop point

- Se un oracolo non torna al centesimo → fermarsi, non "aggiustare" il test (WF-5).
- Nessun UPDATE su `total_inps`/dati reali del commercialista.
- Non rompere l'invariante cassa fuori dallo stimatore.
- Se `getFiscalConfig` non puo' storicizzare l'aliquota senza Settings → aggiornare
  Settings (CFG-1), non hardcodare.

## Review richieste

- Review PIANO (questo file): multi-superficie + RAG, prima di Fase 0.
- Review IMPLEMENTAZIONE: multi-superficie + RAG, mutation-tested, prima del merge.
- Browser WF-17 desktop+mobile prima di dichiarare fatto.

## Documentazione da aggiornare (stesso commit del codice)

- `docs/architecture.md` (formula fiscale reale, 3 numeri INPS, aliquota per-anno).
- `docs/development-continuity-map.md` (sweep superfici fiscali).
- `.claude/rules/learning.md` (trigger: 3 numeri INPS distinti; data-fattura vs cassa;
  no-UPDATE total_inps).
- `docs/CANTIERE.md` (prossima azione).
