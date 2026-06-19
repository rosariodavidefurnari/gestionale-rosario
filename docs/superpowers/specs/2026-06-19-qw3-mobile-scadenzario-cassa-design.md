# Spec — QW3: scadenzario + previsione cassa anche su mobile

Stato: review spec COMPLETATA (frontend/mobile = PASS; TDD/dati = FLAG → FLAG
risolte in D5/R1/Controllore). In attesa **gate utente** prima del piano/codice.
Data: 2026-06-19
Review: 2 revisori (frontend+mobile-parity, TDD+data-flow), entrambi con RAG
DeepWiki :8001 + verifica sorgente. Blocker risolti: (1) controllore E2E ora usa
`resetAndSeedTestData()` non il pattern PROD DEMO/finally; (2) seed cassa
corretto (futuro ≤30g vs scaduto); (3) component test primario falsificabile;
(4) viewport prima del login + assert mobile shell; (5) R1 estesa alla riga
scaduto con doppio bottone.
Origine: `docs/superpowers/2026-06-15-gestionale-assessment.md` finding #11 + #12
Tipo: parità mobile/desktop dashboard (regola UI-7), nessun cambio dato/schema.

## Problema

Sul desktop la dashboard annuale (`DashboardAnnual.tsx`) mostra, per l'anno
corrente, due card operative:

- **Previsione cassa 30gg** — `DashboardCashFlowCard` (titolo "Prossimi N
  giorni"), entrate vs uscite + risultato netto.
- **Scadenzario operativo** — `DashboardDeadlineTracker` (titolo "Cosa devi
  fare"): scaduti, prossimi 7g, attività da fare, con azioni "segna incassato"
  / "completa".

La dashboard mobile (`MobileDashboard.tsx` → `MobileAnnualDashboard`) **NON
renderizza nessuna delle due**. L'utente che apre il gestionale da telefono
(uso quotidiano reale) non vede né gli scaduti né la liquidità a 30 giorni.

I dati sono **già calcolati e già disponibili** lato mobile: `MobileAnnualDashboard`
chiama già `useDashboardData(selectedYear)`, il cui `data` contiene
`cashFlowForecast` e `alerts` (verificato su sorgente). Manca solo il wiring.

## Fonti di verità (verificate sul sorgente reale, snapshot working `81f02cdc`)

- Desktop rende le due card solo per l'anno corrente:
  - `DashboardAnnual.tsx:128-130` → `isCurrentYear && data.cashFlowForecast` → `DashboardCashFlowCard forecast=...`
  - `DashboardAnnual.tsx:132` → `isCurrentYear && DashboardDeadlineTracker alerts=data.alerts`
- Mobile NON le rende: `MobileDashboard.tsx:148-247` (nessun riferimento alle
  due card).
- Dati già presenti lato mobile:
  - `MobileDashboard.tsx:103` → `useDashboardData(selectedYear)` ritorna `data`.
  - `dashboardModelTypes.ts:21-22` → `alerts: DashboardAlerts`,
    `cashFlowForecast: CashFlowForecast | null`.
  - `dashboardModel.ts:603` → `cashFlowForecast` valorizzato **solo** se anno
    corrente, altrimenti `null` (quindi il null-guard equivale al gate
    `isCurrentYear` del desktop per la cassa).
  - `MobileDashboard.tsx:105` → `isCurrentYear` già disponibile.
- Contratti dei componenti (riuso verbatim, già mobile-first):
  - `DashboardCashFlowCard.tsx` → prop unica `forecast: CashFlowForecast`,
    layout già responsive (`sm:` su base mobile).
  - `DashboardDeadlineTracker.tsx` → prop unica `alerts: DashboardAlerts`;
    self-contained (fa da sé `useGetList` su clients/payments/client_tasks e le
    mutation mark-paid / task-done). Nessun prop finanziario da inoltrare.
- Controllori esistenti (desktop-only, viewport default):
  - `tests/e2e/dashboard-annual.smoke.spec.ts` (cash flow + alerts visibili)
  - `tests/e2e/deadline-tracker.smoke.spec.ts` ("Cosa devi fare" + sezioni)
  - Nessun test gira a viewport mobile per queste card → parità oggi NON coperta.
- RAG DeepWiki (`localhost:8001`, `gemini-2.5-pro`, snapshot `39b3e463`):
  ha confermato i due consumer desktop e i due file di test; ha erroneamente
  affermato che `MobileDashboard` già le renderizza → claim **falsificato sul
  sorgente** (mobile non le rende). Conferma: RAG è supporto, vince il sorgente.

## Obiettivi

1. Su mobile, anno corrente: rendere visibili **previsione cassa 30gg** e
   **scadenzario "Cosa devi fare"**, con gli stessi dati/azioni del desktop.
2. Parità finanziaria desktop/mobile (UI-7): nessuna divergenza di numeri.
3. Un controllore eseguibile che blocca la regressione di parità su viewport
   mobile.

## Non-obiettivi

- NON modificare il modello dati, le viste DB, i provider, le Edge Functions,
  lo schema o le migration. È un fix di view mobile (smallest correct layer).
- NON cambiare i calcoli di `cashFlowForecast` / `alerts` né la logica fiscale.
- NON aggiungere un nuovo prop `compact` ai due componenti in via preventiva:
  si valuta SOLO se la verifica browser (WF-17) mostra clutter reale
  (anti-bloat). Default: riuso verbatim.
- NON toccare le card già presenti su mobile (KPI, fiscal warnings,
  MobileFiscalKpis, AI summary).
- NON portare su mobile altre card desktop non in scope (revenue trend,
  category, pipeline, top clients, ateco, business health) — fuori QW3.

## Decisioni

- **D1 — Riuso verbatim.** Si rendono `DashboardCashFlowCard` e
  `DashboardDeadlineTracker` esistenti, senza nuovi prop. Entrambi già
  mobile-first. Eventuale ritocco responsive deciso solo dopo prova browser.
- **D2 — Gating identico al desktop.**
  - Cassa: `isCurrentYear && data.cashFlowForecast` (il `null` per anni passati
    rende il guard ridondante ma esplicito = robusto).
  - Scadenzario: `isCurrentYear` (mirror `DashboardAnnual.tsx:132`).
- **D3 — Posizionamento.** Stesso ordine del desktop: dopo `DashboardKpiCards`
  e prima del blocco fiscale → prima la cassa, poi lo scadenzario.
- **D4 — Smallest correct layer.** Solo `MobileDashboard.tsx` cambia (più i
  controllori e i docs). Nessun nuovo file componente.
- **D5 — Controllore (rivisto dopo review).** Due livelli:
  - **Primario (falsificabile, date-independent): component test RTL** di
    `MobileAnnualDashboard` con `useDashboardData` stubbato. Anno corrente
    (`isCurrentYear:true`, `cashFlowForecast:{...}`, `alerts:{...}`) → entrambe
    le card presenti; anno passato (`isCurrentYear:false`,
    `cashFlowForecast:null`) → nessuna delle due. Copre D2 (gating) e il wiring
    senza dipendere dalla data di oggi. Precedente: controllori a QueryClient
    (WF-18, `voidInvoiceSurfaces.test.ts`).
  - **Integrazione (parità reale mobile): smoke E2E a viewport mobile.**
    Estendere `tests/e2e/deadline-tracker.smoke.spec.ts` (o nuovo
    `mobile-dashboard-parity.smoke.spec.ts`) usando l'**harness esistente**
    `resetAndSeedTestData()` in `beforeEach` (NON il pattern DEMO-marker /
    `finally` / 0-leftover, che è per gli smoke PROD dove non si può
    truncare — vedi nota WF-19 sotto). `page.setViewportSize({width:390})`
    **prima** di `loginAsLocalAdmin` (il read di `useIsMobile` è deferito in
    `useEffect`: viewport dopo il mount → resta Desktop). Assert: mobile shell
    montata (bottom-nav, pattern `navigation.smoke.spec.ts`) + entrambe le card
    visibili con `toBeVisible({timeout:15000})` (lo scadenzario rende `null`
    finché le sue 3 query sono pending → serve auto-wait).
  - **WF-19 / nota corpus test:** il pattern "dati demo + cleanup sistematico"
    è soddisfatto qui dal reset-reseed deterministico dell'harness locale (la
    `beforeEach` successiva è il cleanup). Il marker `DEMO-%` + `finally` +
    verifica 0-leftover resta riservato agli smoke che girano su PROD (fuori
    scope QW3, view-only/locale).
  - Verifica browser manuale desktop+mobile, 0 errori console (WF-17).

## Invarianti

- I numeri di cassa e scadenzario su mobile = identici al desktop a parità di
  anno e dati (UI-7).
- Le mutation dello scadenzario (mark incassato / task done) funzionano da
  mobile esattamente come da desktop.
- Anno passato selezionato su mobile → nessuna delle due card visibile (come
  desktop).
- Nessun dato finanziario errato o assente su mobile (rischio critico UI-7).

## Rischi

- **R1 — Layout su schermi stretti (2 punti, non solo il summary).**
  - `DashboardDeadlineTrackerSummary.tsx:44` usa `grid-cols-[1fr_auto_1fr_auto_1fr]`
    (3 valori + 2 separatori).
  - **Punto più a rischio: riga "Scaduti"** in
    `DashboardDeadlineTrackerActionList.tsx:269-296` → titolo `min-w-0 flex-1
    truncate` + DUE bottoni affiancati (`SendPaymentReminderDialog` +
    "Incassato"). A 390px è stretta (degrada a truncation, non overflow, perché
    tutto è `shrink-0`/`truncate`).
  Mitigazione: la verifica browser mobile (WF-17) deve includere uno screenshot
  di una **riga scaduto** specifica; ritocco responsive minimo solo se rotto.
- **R2 — Fetch extra su mobile.** `DashboardDeadlineTracker` esegue 3
  `useGetList` (clients/payments/client_tasks, `perPage 1000`). Identico al
  desktop; per single-user accettabile. Da osservare nel browser (no errori,
  no blocco render).
- **R3 — Render condizionato.** `DashboardDeadlineTracker` ritorna `null`
  finché le sue query sono pending → possibile lieve layout shift su mobile.
  Accettabile, da osservare.

## Criteri di accettazione

- AC1: mobile + anno corrente → "Prossimi N giorni" e "Cosa devi fare" visibili,
  posizionate tra KPI e blocco fiscale.
- AC2: mobile + anno passato → nessuna delle due card visibile.
- AC3: da mobile, "segna incassato" e "completa attività" funzionano (mutation +
  toast), come desktop.
- AC4: 0 errori console su entrambe le viewport (desktop + mobile) WF-17.
- AC5: `make typecheck`, `make lint`, `make build` verdi; E2E mobile smoke verde;
  cleanup demo → 0 leftover (query marker).
- AC6: `npm run continuity:check` verde (docs aggiornati nello stesso commit:
  `development-continuity-map.md`; memory/learning se emerge pattern).

## Controllore (executable guardrail)

**Controllore primario — component test (falsificabile, date-independent):**

- File: `MobileDashboard.parity.test.tsx` (o accanto al componente). Render di
  `MobileAnnualDashboard` con `useDashboardData` stubbato:
  - caso anno corrente: `{isCurrentYear:true, cashFlowForecast:{horizonDays:30,
    inflows:[{...}], inflowsTotal>0, ...}, alerts:{...}}` → assert **entrambe**
    le card presenti ("Prossimi 30 giorni" + "Cosa devi fare") e che la cassa
    mostri l'importo `inflowsTotal` (non solo il titolo).
  - caso anno passato: `{isCurrentYear:false, cashFlowForecast:null, alerts}` →
    assert **nessuna** delle due card presente (copre AC2 senza dipendere da
    oggi).
- Falsificabilità: togliere il wiring di una card → la sua asserzione fallisce;
  togliere il gate `isCurrentYear` → il caso anno-passato fallisce.

**Controllore di integrazione — smoke E2E mobile-viewport (parità reale):**

- File: estendere `tests/e2e/deadline-tracker.smoke.spec.ts` o nuovo
  `tests/e2e/mobile-dashboard-parity.smoke.spec.ts`. Harness esistente:
  `resetAndSeedTestData()` in `beforeEach` (NESSUN marker DEMO / `finally` /
  0-leftover — quello è per smoke PROD; vedi D5).
- `page.setViewportSize({ width: 390, height: 844 })` **prima** di
  `loginAsLocalAdmin`; assert mobile shell (bottom-nav) montata; poi
  `toBeVisible({timeout:15000})` su "Prossimi N giorni" e "Cosa devi fare".
- Dati cassa non vuoti: la cassa conta solo `payments in_attesa` con
  `payment_date` in `[oggi, oggi+30]` (`dashboardModel.ts:801-805`); un payment
  SCADUTO alimenta lo scadenzario, NON la cassa. Se la fixture di
  `resetAndSeedTestData()` non produce un `in_attesa` futuro entro 30g, la
  correttezza-dato della cassa è coperta dal component test sopra e l'E2E si
  limita alla visibilità del titolo + mobile shell (no assert su importo
  date-fragile). (Verificare in fase di piano cosa semina la fixture; se serve,
  aggiungere lì un payment relativo `todayISODate()+7g` via helper
  `dateTimezone`, WF-8.)
- Falsificabilità: rimuovere il wiring di una card → l'assert mobile fallisce.

## Design contract (impeccable · adapt, register = product)

Audit di adattamento desktop→390px delle due card sul sorgente reale. Esito:
**la strategia "porta verbatim, non costruire una vista mobile degradata" è
corretta** — legge `adapt`: *NEVER hide core functionality on mobile*. Le due
card devono essere pienamente funzionali su telefono (è il senso di QW3), non
una versione ridotta. Note concrete, tutte da verificare in browser (WF-17),
con ritocco mobile minimo SOLO se la verifica mostra un problema reale
(anti-bloat; nessun prop/variante che funzioni solo su un consumer — LSP):

1. **Touch target riga "Scaduti"** — `DashboardDeadlineTrackerActionList.tsx:284`
   usa `Button size="sm"` = `h-8` (32px, `button.tsx:26`), sotto il minimo
   `adapt` di 44px. Coesiste con il trigger `SendPaymentReminderDialog`
   (`secondaryAction`). È il pattern di densità usato in tutta l'app su mobile:
   NON divergere preventivamente. Azione: in WF-17, provare il TAP reale su
   "Incassato" e sul reminder su 390px; ingrandire l'area tap solo se ci sono
   mis-tap reali.
2. **Truncation del nome cliente** — `ActionRow` (`:271-278`) ha titolo
   `text-sm truncate` in `min-w-0 flex-1` con 2 bottoni `shrink-0` a destra: a
   390px la colonna testo si stringe molto. `adapt` accetta la truncation
   perché la riga è un Link al dettaglio, ma il nome cliente deve restare
   riconoscibile. Azione: screenshot WF-17 di una riga scaduto con nome lungo;
   verificare che non si riduca a pochi caratteri.
3. **Niente hover-only** — titolo = `Link` (tap-safe), azioni = `onClick`
   (tap-safe). Nessuna affordance solo-hover. `adapt`-clean, nessuna modifica.
4. **Summary scadenzario "Approccio Bambino"-corretto** —
   `DashboardDeadlineTrackerSummary.tsx` usa `text-2xl` per i contatori +
   colori semantici (rosso/ambra/blu), importi secondari piccoli. Rispetta già
   il pattern KPI del progetto. 3 colonne su ~358px interni = ~110px l'una:
   leggibile. Nessuna modifica preventiva.
5. **Cash flow card** già mobile-first (`text-lg` base, `sm:text-xl`; layout
   `grid-cols-[1fr_auto_1fr]` entrate|sep|uscite + barra risultato). Rispetta il
   pattern `DashboardCashFlowCard` canonico. Nessuna modifica.

Conclusione impeccable: QW3 è un **port di parità**, non un redesign. Zero nuovi
componenti, zero `compact` preventivo. Le uniche eventuali modifiche sono
ritocchi responsive mirati dettati dalla prova browser, non dal sospetto.

## Piano (placeholder)

Da creare con `writing-plans` dopo review spec + go utente. File coinvolti
attesi: `src/components/atomic-crm/dashboard/MobileDashboard.tsx` (+ import),
controllore E2E, `docs/development-continuity-map.md`. Gate: **nessun codice
finché l'utente non dà il via** (regola di processo attiva).
