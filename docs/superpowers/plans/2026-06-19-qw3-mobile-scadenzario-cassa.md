# Piano — QW3: scadenzario + previsione cassa su mobile

Stato: draft (in attesa review piano + **gate utente prima del codice**)
Data: 2026-06-19
Spec: `docs/superpowers/specs/2026-06-19-qw3-mobile-scadenzario-cassa-design.md`
Tipo: parità mobile/desktop (UI-7), view-only, nessuna migration/EF/provider.

## Relazione con la spec

Esegue gli obiettivi della spec: rendere `DashboardCashFlowCard` (previsione
cassa 30gg) e `DashboardDeadlineTracker` (scadenzario "Cosa devi fare") su
`MobileAnnualDashboard`, gating identico al desktop, con controllore primario
component-test + smoke E2E mobile-viewport. Rispetta il design contract
impeccable (port di parità, no redesign, no `compact` preventivo).

## File coinvolti

- `src/components/atomic-crm/dashboard/MobileDashboard.tsx` — UNICA modifica di
  prodotto: 2 import + render delle 2 card in `MobileAnnualDashboard`.
- `src/components/atomic-crm/dashboard/MobileDashboard.parity.test.tsx` — NUOVO
  controllore primario (component test, gating current/past year).
- `tests/e2e/deadline-tracker.smoke.spec.ts` (estendere) OPPURE
  `tests/e2e/mobile-dashboard-parity.smoke.spec.ts` (NUOVO) — smoke E2E
  mobile-viewport.
- `docs/development-continuity-map.md` — nota di parità mobile (stesso commit).
- `.claude/rules/learning.md` / `memory/*.md` — solo se emerge pattern nuovo
  (atteso: nessuno, è applicazione diretta di UI-7).

## Ciclo TDD (controllore primario, NON money/fiscal — view-only)

- **RED**: scrivere `MobileDashboard.parity.test.tsx` PRIMA del wiring.
  - stub `useDashboardData` → `{isCurrentYear:true, cashFlowForecast:{horizonDays:30,
    inflows:[{label,amount,date,type:"payment"}], inflowsTotal:>0, outflows:[],
    outflowsTotal:0, netFlow:>0}, alerts:{...minime...}, kpis, meta, fiscal:null,
    selectedYear:<anno corrente>}`.
  - mockare le dipendenze interne dello scadenzario (è self-fetch: `useGetList`
    clients/payments/client_tasks) per renderlo deterministico — oppure asserire
    solo la presenza del titolo "Cosa devi fare" (che compare solo se montato) e
    delegare la copertura azioni allo smoke E2E.
  - assert: "Prossimi 30 giorni" presente + importo `inflowsTotal` mostrato;
    "Cosa devi fare" presente. → FALLISCE (card non ancora wired).
  - caso `isCurrentYear:false, cashFlowForecast:null` → assert NESSUNA delle due
    presente. (Falsifica il gate.)
- **GREEN**: aggiungere a `MobileAnnualDashboard` (dopo `DashboardKpiCards`,
  prima del blocco `data.fiscal &&`):
  ```tsx
  {isCurrentYear && data.cashFlowForecast && (
    <DashboardCashFlowCard forecast={data.cashFlowForecast} />
  )}
  {isCurrentYear && <DashboardDeadlineTracker alerts={data.alerts} />}
  ```
  + import dei due componenti. → component test passa.
- **REFACTOR**: nessuno previsto (riuso verbatim). Eventuali ritocchi responsive
  solo post-browser WF-17.

## Step

1. (controllore) Scrivere `MobileDashboard.parity.test.tsx`, eseguirlo → RED.
   Verificare che il messaggio di fallimento sia "card non trovata", non un
   errore di setup.
2. (impl) Aggiungere import + render condizionato in `MobileAnnualDashboard`
   (smallest correct layer: solo questo file di prodotto). → component test GREEN.
3. (controllore integrazione) Smoke E2E mobile-viewport:
   - `resetAndSeedTestData()` in `beforeEach` (harness esistente, NO DEMO/finally).
   - `page.setViewportSize({ width: 390, height: 844 })` PRIMA di
     `loginAsLocalAdmin`.
   - assert mobile shell (bottom-nav, pattern `navigation.smoke.spec.ts`).
   - `toBeVisible({timeout:15000})` su "Prossimi N giorni" e "Cosa devi fare".
   - (se la fixture semina un `in_attesa` futuro ≤30g, asserire anche un importo
     cassa; altrimenti solo visibilità + mobile shell — la correttezza-dato è
     coperta dal component test).
4. (verifica repo) `make typecheck`, `make lint`, `make build`, `make test`
   (unit), e2e mirato → tutti verdi.
5. (browser WF-17) Aprire la dashboard mobile reale (glance/playwright) a 390px
   E desktop:
   - entrambe le card visibili, anno corrente; nessuna, anno passato;
   - TAP reale su "Incassato" e sul reminder nella riga scaduto (design contract
     punto 1);
   - screenshot riga scaduto con nome lungo (punto 2);
   - 0 errori console su entrambe le viewport.
   - eventuale ritocco responsive mirato SOLO se rotto, poi rinverdire i test.
6. (docs) Aggiornare `docs/development-continuity-map.md` (parità mobile QW3)
   nello STESSO commit del codice (WF-6/COMMIT GATE). `continuity:check` verde.
7. (ship) commit unico (codice+test+docs) → push `origin`
   (`rosariodavidefurnari/gestionale-rosario`) → CI check con
   `gh -R rosariodavidefurnari/gestionale-rosario` (WF-16/WF-7). Vercel
   auto-deploy (solo frontend, nessuna EF/migration → nessun deploy Supabase).

## Verifiche / criteri di uscita

- AC1-AC6 della spec soddisfatti.
- component test RED→GREEN dimostrato; falsificabilità provata (togliere una
  card → test rosso; togliere `isCurrentYear` → caso anno-passato rosso).
- smoke E2E mobile verde; 0 errori console su 2 viewport (WF-17).
- typecheck/lint/build/unit verdi; `continuity:check` verde; CI verde sul fork.

## Stop point

- NIENTE codice finché l'utente non dà il via (gate attivo).
- Se il browser WF-17 mostra un layout rotto a 390px che richiede più di un
  ritocco mirato (es. riprogettare una riga), FERMARSI: è scope creep oltre la
  parità → tornare a spec.
- Nessuna modifica a provider/EF/migration/schema: se emergesse la necessità,
  STOP (significherebbe che la diagnosi "view-only" era errata).

## Review richieste

- Review piano (questa) prima del gate: ordine step, falsificabilità
  controllore, smallest-correct-layer, COMMIT GATE.
- Review implementazione (multi-superficie + RAG) DOPO il GREEN e PRIMA del
  merge, come da regole di processo attive.

## Documentazione

- `docs/development-continuity-map.md`: una riga nella sezione dashboard/mobile
  parity (QW3 chiuso, card cassa+scadenzario ora su mobile).
- CANTIERE aggiornato a fine ciclo.
