# Progress — Gestionale Rosario Furnari

## Current Phase

🟢 Dashboard storico AI-ready implementato, verificato sul remoto e nel browser, con test UI base aggiunti, linguaggio tradotto per non esperti e nuovo flusso single-turn `fai una domanda` verificato da remoto. Prossimo passo: solo click-test browser opzionale del nuovo Q&A o future estensioni richieste dal prodotto.

## Last Session

### Sessione 29 (2026-02-28, historical Q&A single-turn)

- Completed:
  - **Domande libere sullo storico aggiunte**:
    - nuovo metodo `dataProvider.askHistoricalAnalyticsQuestion()`
    - nuovo tipo `HistoricalAnalyticsAnswer`
    - nuove domande suggerite whitelisted per il tab `Storico`
  - **Edge Function separata per non rompere la baseline stabile**:
    - creata `historical_analytics_answer`
    - prompt vincolato a italiano semplice
    - risposta strutturata in `Risposta breve`, `Perché lo dico`,
      `Cosa controllare adesso`
    - limite domanda `300` caratteri
  - **Card AI estesa senza trasformarla in chat generale**:
    - textarea `Fai una domanda su questi numeri`
    - chip con domande suggerite
    - guardrail esplicito: solo dati storici visibili
    - stesso componente mantiene anche `Spiegami lo storico`
  - **Copertura test aggiornata**:
    - aggiunto `DashboardHistoricalAiSummaryCard.test.tsx`
    - verificati sia il flusso summary sia il flusso domanda suggerita
  - **Deploy remoto chiuso**:
    - `historical_analytics_answer` deployata su
      `qvdmzhyzpyaveniirsmo`
    - smoke autenticato end-to-end OK con utente temporaneo

- Validation:
  - `npm run typecheck` OK
  - `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts` OK
  - authenticated remote smoke di `historical_analytics_answer` OK
    - status `200`
    - model `gpt-5.2`
    - output con `## Risposta breve`
    - niente raw `YTD` / `YoY`

- Decisions:
  - La modalità giusta per questo prodotto non è una chat libera su tutto il
    CRM, ma un Q&A vincolato ai dati storici già validati
  - Il nuovo Q&A resta single-turn e separato dal summary per proteggere la
    baseline già stabile
  - Il linguaggio semplice resta requisito di prodotto anche nelle risposte a
    domanda libera

- Notes:
  - Il primo smoke remoto ha fallito con `Requested function was not found`
    perché la nuova Edge Function non era ancora deployata sul progetto
  - Dopo `npx supabase functions deploy historical_analytics_answer --project-ref qvdmzhyzpyaveniirsmo`
    il re-test è passato subito
  - In questa sessione non è stato eseguito il click-test browser del nuovo
    campo domanda libera
  - La baseline stabile già pushata resta `237ccbc` finché l'utente non chiede
    un nuovo commit/push

- Next action:
  - opzionale: click-test browser del nuovo Q&A nel tab `Storico`
  - opzionale: piccolo polish di copy/layout della risposta AI
  - altrimenti nessun blocco tecnico aperto sul perimetro storico v1

### Sessione 28 (2026-02-28, plain-language UX layer)

- Completed:
  - **Traduzione del linguaggio UI**: rimosso il gergo più ostico dalla
    superficie del dashboard storico
    - `YTD` -> `finora` / `anno in corso fino a oggi`
    - `YoY` -> `crescita rispetto all'anno prima`
    - `competenza` -> spiegazione come `valore del lavoro`, non come termine
      contabile
  - **Dashboard più leggibile per il titolare**:
    - KPI rinominati in linguaggio operativo
    - card `Come leggere lo storico` riscritta come `Tradotto in semplice`
    - card contesto riscritta senza lessico da analista
  - **Prompt AI riscritto**:
    - vietato il gergo non spiegato
    - nuove sezioni `In breve`, `Cose importanti`, `Attenzione`,
      `Cosa controllare adesso`
  - **Deploy remoto aggiornato**:
    - redeploy di `historical_analytics_summary`
    - smoke remoto OK con risposta in italiano semplice

- Validation:
  - `npm run typecheck` OK
  - `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts` OK
  - remote prompt smoke OK con output che inizia da `## In breve`

- Decisions:
  - La correttezza semantica da sola non basta: il prodotto deve tradurre i
    numeri in lingua imprenditoriale
  - Da questo punto in poi il linguaggio semplice va considerato parte del
    contratto UX, non un abbellimento facoltativo

- Next action:
  - nessun blocco tecnico aperto sul v1 storico
  - se vuoi consolidare, commit/push di questa chiusura finale
  - in futuro solo refine opzionale o nuove capability prodotto

### Sessione 27 (2026-02-28, UI test closure)

- Completed:
  - **Infrastruttura test UI aggiunta**:
    - `jsdom`
    - `@testing-library/react`
    - `src/setupTests.js` esteso con cleanup automatico e `ResizeObserver`
      fallback
  - **UI tests storici aggiunti**:
    - `DashboardHistorical.ui.test.tsx`
    - `DashboardHistoricalWidgets.test.tsx`
  - **Copertura chiusa sui casi minimi critici**:
    - empty state parent
    - error state parent + retry
    - warning contestuale YoY
    - error state widget
    - empty state widget
    - YoY `N/D`
  - **Polish card AI**: migliorata la leggibilità del markdown con bullets e
    spacing visibile
  - **Docs di continuità riallineati**: handoff/backlog/spec/progress
    aggiornati allo stato quasi finale

- Decisions:
  - Per questo v1 il lavoro implementativo si considera sostanzialmente chiuso
  - Le prossime modifiche non sono più fix strutturali ma solo polish o nuove
    richieste di prodotto
  - I widget storici ora vanno evoluti insieme ai loro test UI

- Validation:
  - `npm run typecheck` OK
  - `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts` OK

- Next action:
  - nessun blocco tecnico aperto sul v1 storico
  - fare commit/push di questa chiusura quando vuoi consolidarla
  - in seguito, solo polish AI card o nuove capability richieste

### Sessione 26 (2026-02-28, browser smoke evidence)

- Completed:
  - **Browser smoke test raccolto**: screenshot del runtime reale confermano
    che `Storico` renderizza KPI, grafici, top client e contesto dati
  - **Card AI verificata in UI**: `Analisi AI dello storico` genera e mostra un
    output nel browser con badge modello `gpt-5.2`
  - **Semantica confermata in pagina**:
    - storico su due anni chiusi `2024-2025`
    - `2026` mostrato come `YTD`
    - `YoY` mostrato come `2025 vs 2024`
  - **Docs di continuità riallineati**: handoff/backlog/progress aggiornati per
    segnare chiuso anche il click-test browser

- Decisions:
  - Il primo flusso AI storico si considera verificato anche lato browser, non
    più solo lato remoto/server
  - Il prossimo step reale diventa la copertura test UI
  - L'eventuale refine della card AI è solo di leggibilità, non di logica

- Notes:
  - Dalla resa attuale non emergono errori semantici
  - L'unico spazio di miglioramento visibile è la leggibilità del markdown
    generato, se si vuole una card più compatta o più scansionabile

- Next action:
  - aggiungere test UI per empty/error/N-D/subtitle states
  - solo dopo valutare un piccolo polish di prompt/rendering markdown

### Sessione 25 (2026-02-28, remote AI smoke closure)

- Completed:
  - **Smoke test remoto AI chiuso**: verificato end-to-end `historical_analytics_summary`
    con utente autenticato temporaneo sul progetto `qvdmzhyzpyaveniirsmo`
  - **Auth runtime fix confermato**: il fallback
    `SB_PUBLISHABLE_KEY -> SUPABASE_ANON_KEY` in
    `supabase/functions/_shared/authentication.ts` ha eliminato il `401 Error:
    supabaseKey is required`
  - **Secrets remoti riallineati**: impostati esplicitamente
    `OPENAI_API_KEY` e `SB_PUBLISHABLE_KEY` sul progetto remoto
  - **Output OpenAI verificato**:
    - status `200 OK`
    - model `gpt-5.2`
    - summary coerente con `2026 YTD` e `2025 vs 2024`
  - **Docs di continuità aggiornati**: handoff/backlog/learnings/progress/spec
    riallineati allo stato finale della sessione

- Decisions:
  - Il lavoro infrastrutturale sul primo flusso AI storico si considera chiuso
    lato remoto/server
  - Il prossimo step non è più “far funzionare la function”, ma verificare il
    click-path browser e poi aggiungere test UI
  - La continuità tra chat va mantenuta aggiornando sempre handoff/backlog/spec
    quando cambiano stato remoto, secret o verifiche runtime

- Validation:
  - `npx supabase secrets list --project-ref qvdmzhyzpyaveniirsmo` OK
  - `npx supabase secrets set OPENAI_API_KEY ... SB_PUBLISHABLE_KEY ... --project-ref qvdmzhyzpyaveniirsmo` OK
  - authenticated remote smoke of `historical_analytics_summary` OK

- Notes:
  - La prima invocazione remota ha rivelato due problemi ambientali reali:
    secret `SB_PUBLISHABLE_KEY` mancante nel runtime Edge e `OPENAI_API_KEY`
    non presente sul progetto remoto
  - Entrambi i problemi sono stati corretti nella stessa sessione e il re-test
    finale è passato
  - Non è stato eseguito un click-test browser autenticato in questa
    environment
  - Questo punto va trattato come baseline stabile di rollback: dopo il push,
    se un'evoluzione successiva rompe il flusso storico AI, bisogna tornare a
    questo commit

- Next action:
  - aprire l'app autenticata e cliccare `Storico -> Genera analisi`
  - poi aggiungere test UI per empty/error/N-D/subtitle states
  - solo dopo valutare eventuale refine del prompt o UX conversazionale

### Sessione 24 (2026-02-28, OpenAI summary flow)

- Completed:
  - **Configurazione AI**: aggiunta sezione `AI` in Impostazioni con dropdown
    modello e default `gpt-5.2`
  - **Consumer UI reale**: aggiunta card `Analisi AI dello storico` dentro il
    dashboard `Storico`, con generazione manuale su click
  - **Provider methods**:
    - `getHistoricalAnalyticsContext()`
    - `generateHistoricalAnalyticsSummary()`
  - **Edge Function OpenAI**: creata `historical_analytics_summary` usando SDK
    ufficiale OpenAI e `responses.create`
  - **Deploy remoto**:
    - secret `OPENAI_API_KEY` impostato sul progetto remoto
    - function `historical_analytics_summary` deployata su
      `qvdmzhyzpyaveniirsmo`
  - **Docs di continuità aggiornati**: handoff/backlog/learnings/progress
    riallineati al nuovo stato

- Decisions:
  - L'uso di OpenAI resta server-side tramite Edge Function, non client-side
  - Il primo flusso AI e manuale e non chat-based, per controllare costi e
    qualità dell'output
  - La scelta modello e configurabile da Settings ma limitata a una whitelist

- Files created:
  - `src/lib/analytics/historicalAnalysis.ts`
  - `src/components/atomic-crm/settings/AISettingsSection.tsx`
  - `src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.tsx`
  - `supabase/functions/historical_analytics_summary/index.ts`

- Files modified:
  - `src/components/atomic-crm/types.ts`
  - `src/components/atomic-crm/root/ConfigurationContext.tsx`
  - `src/components/atomic-crm/root/defaultConfiguration.ts`
  - `src/components/atomic-crm/settings/SettingsPage.tsx`
  - `src/components/atomic-crm/providers/supabase/dataProvider.ts`
  - `src/components/atomic-crm/providers/fakerest/dataProvider.ts`
  - `src/components/atomic-crm/dashboard/DashboardHistorical.tsx`
  - `supabase/config.toml`
  - `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
  - `docs/historical-analytics-handoff.md`
  - `docs/historical-analytics-backlog.md`
  - `learnings.md`
  - `progress.md`

- Validation:
  - `npm run typecheck` OK
  - `npm test -- --run src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts` OK
  - `npx supabase secrets set OPENAI_API_KEY ... --project-ref qvdmzhyzpyaveniirsmo` OK
  - `npx supabase functions deploy historical_analytics_summary --project-ref qvdmzhyzpyaveniirsmo` OK

- Notes:
  - In questa sessione non e stato eseguito un click-test autenticato della
    card AI dentro il browser
  - Il flusso AI attuale produce una sintesi markdown, non ancora una chat o un
    pannello conversazionale

- Next action:
  - aprire `Storico`, lanciare `Analisi AI` e verificare output reale
  - poi aggiungere test UI sugli stati storico

### Sessione 23 (2026-02-28, AI analytics entry point)

- Completed:
  - **Entry point AI aggiunto**: introdotto
    `dataProvider.getHistoricalAnalyticsContext()` come primo punto di accesso
    stabile al payload semantico storico
  - **Payload semanticamente piu forte**: `buildAnalyticsContext()` ora include
    anche `caveats` umani oltre a `meta`, `metrics`, `series` e `qualityFlags`
  - **Copertura test aggiornata**: i test sul context serializzato verificano
    anche i nuovi caveat principali
  - **Scope riallineato**: backlog/handoff aggiornati per segnare che la demo
    non e una priorita corrente

- Decisions:
  - Il primo consumer AI resta lato client/provider e non richiede ancora una
    nuova edge function
  - L'assistente futuro dovra consumare il metodo custom del provider invece di
    interrogare tabelle o view raw in autonomia
  - FakeRest/demo historical support viene rinviato finche non entra davvero
    nel perimetro prodotto

- Files modified:
  - `src/lib/analytics/buildAnalyticsContext.ts`
  - `src/components/atomic-crm/providers/supabase/dataProvider.ts`
  - `src/components/atomic-crm/providers/fakerest/dataProvider.ts`
  - `src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
  - `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
  - `docs/historical-analytics-handoff.md`
  - `docs/historical-analytics-backlog.md`
  - `learnings.md`
  - `progress.md`

- Validation:
  - `npm run typecheck` OK
  - `npm test -- --run src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts` OK

- Next action:
  - scegliere il primo consumer reale del payload AI
  - poi aggiungere UI tests per gli stati storico

### Sessione 22 (2026-02-28, Remote historical verification)

- Completed:
  - **Verifica remota delle view storiche**: controllate sul progetto
    `qvdmzhyzpyaveniirsmo` via PostgREST:
    - `analytics_history_meta`
    - `analytics_yearly_competence_revenue`
    - `analytics_yearly_competence_revenue_by_category`
    - `analytics_client_lifetime_competence_revenue`
  - **Semantica confermata con dati reali**:
    - `first_year_with_data = 2024`
    - `last_year_with_data = 2025`
    - `2026` presente come riga `YTD`
    - `YoY = 2025 vs 2024 = +560%`
    - top client lifetime: `Diego Caltabiano = €23.700`
  - **Diagnosi RLS chiarita**: le stesse query con publishable/anon key
    restituiscono array vuoti non per assenza dati, ma per `security_invoker=on`
    sopra tabelle base protette da RLS
  - **Continuity docs aggiornati**: handoff/backlog/learnings riallineati al
    nuovo stato della verifica

- Decisions:
  - Considerare completata la verifica remota a livello risorse/dati, senza
    riaprire l'architettura dello storico
  - Non interpretare piu output vuoti con ruolo anonimo come prova di migration
    fallita sulle view analytics
  - Mantenere come prossimi step prioritari FakeRest/demo hardening e primo
    consumo AI del `buildAnalyticsContext`

- Files modified:
  - `docs/historical-analytics-handoff.md`
  - `docs/historical-analytics-backlog.md`
  - `learnings.md`
  - `progress.md`

- Validation:
  - query REST remote OK sulle nuove view con `service_role`
  - verifica publishable/anon OK per confermare il comportamento RLS

- Notes:
  - In questa sessione non e stato eseguito un browser smoke test completo del
    tab `Storico`; la verifica fatta e stata sul layer dati/runtime remoto
  - Il pooler Postgres remoto rimane poco affidabile per diagnostica dopo errori
    auth del temp role CLI

- Next action:
  - decidere se consolidare il gating demo/FakeRest o introdurre una capability
    check esplicita per lo storico
  - poi costruire il primo entry point AI sopra `buildAnalyticsContext`

### Sessione 21 (2026-02-28, Historical Analytics AI-Ready + push remoto)

- Completed:
  - **Spec tecnica storica**: aggiunta documentazione ufficiale con regole canoniche, viste aggregate, semantic layer e roadmap AI in `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
  - **Viste aggregate Supabase**: creata migration `20260228133000_historical_analytics_views.sql` con:
    - `analytics_business_clock`
    - `analytics_history_meta`
    - `analytics_yearly_competence_revenue`
    - `analytics_yearly_competence_revenue_by_category`
    - `analytics_client_lifetime_competence_revenue`
  - **Provider Supabase**: registrate le primary key delle nuove view nel data provider
  - **Dashboard shell**: separato il dashboard in `Annuale` e `Storico`
  - **Vista storica desktop/mobile**: aggiunti KPI storici, grafico annuale, mix categorie, top clienti all-time e card di contesto
  - **Semantic layer AI-ready**:
    - `analyticsDefinitions.ts`
    - `buildAnalyticsContext.ts`
  - **Regole bloccate in codice**:
    - anno corrente sempre `YTD`
    - `YoY` solo sugli ultimi due anni chiusi
    - baseline `0` => `N/D`
  - **Testing**: aggiunti test unitari su `dashboardHistoryModel`
  - **Continuity docs**: creati `docs/historical-analytics-handoff.md` e `docs/historical-analytics-backlog.md`
  - **Push remoto completato**: `npx supabase db push` eseguito con successo sul progetto collegato `qvdmzhyzpyaveniirsmo`

- Decisions:
  - La base semantica v1 dello storico è `compensi per competenza`, non `incassi`
  - Il dashboard storico non deve mescolare alert operativi e logica fiscale forward-looking
  - Le sessioni future devono ripartire leggendo handoff + backlog + spec, non dalla sola chat
  - La verifica runtime successiva va fatta sul remoto, non su locale, perché in questo ambiente non esiste un DB locale funzionante

- Files created:
  - `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
  - `supabase/migrations/20260228133000_historical_analytics_views.sql`
  - `src/components/atomic-crm/dashboard/DashboardAnnual.tsx`
  - `src/components/atomic-crm/dashboard/DashboardHistorical.tsx`
  - `src/components/atomic-crm/dashboard/DashboardHistoricalKpis.tsx`
  - `src/components/atomic-crm/dashboard/DashboardHistoricalRevenueChart.tsx`
  - `src/components/atomic-crm/dashboard/DashboardHistoricalCategoryMixChart.tsx`
  - `src/components/atomic-crm/dashboard/DashboardHistoricalTopClientsCard.tsx`
  - `src/components/atomic-crm/dashboard/dashboardHistoryModel.ts`
  - `src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
  - `src/components/atomic-crm/dashboard/useHistoricalDashboardData.ts`
  - `src/lib/analytics/analyticsDefinitions.ts`
  - `src/lib/analytics/buildAnalyticsContext.ts`
  - `docs/historical-analytics-handoff.md`
  - `docs/historical-analytics-backlog.md`

- Files modified:
  - `src/components/atomic-crm/dashboard/Dashboard.tsx`
  - `src/components/atomic-crm/dashboard/MobileDashboard.tsx`
  - `src/components/atomic-crm/providers/supabase/dataProvider.ts`

- Validation:
  - `npm run typecheck` OK
  - `npm test -- --run src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts` OK
  - `npx supabase db push` OK su remoto

- Notes:
  - `npx supabase migration list --linked` non è stato affidabile per auth del temp role
  - `npx supabase db push --dry-run` ha mostrato correttamente la migration pendente prima del push
  - dopo alcuni tentativi auth il pooler remoto ha aperto un circuit breaker sul temp role CLI; non usare questo come indicatore del fallimento del push reale se il comando `db push` ha già confermato l'applicazione

- Next action:
  - aprire l'app contro il remoto e validare davvero la vista `Storico`
  - poi iniziare il primo flusso AI sopra `buildAnalyticsContext`

### Sessione 20 (2026-02-28, Accessibilita form e warning dashboard)

- Completed:
  - **`SelectInput` label-safe**: corretto il collegamento `FormLabel` -> controllo reale nei select custom, eliminando issue Chrome su `label for=FORM_ELEMENT`
  - **`AutocompleteInput` e `AutocompleteArrayInput` accessibili**: aggiunti `id` e `name` all'elemento interattivo reale dei campi basati su `Popover`/`Command`
  - **Verifica promemoria**: creazione di un promemoria con cliente eseguita manualmente con esito positivo
  - **Dashboard ripulita**: eliminato il warning Recharts `width(-1) and height(-1)` nei grafici con `ResponsiveContainer`
  - **Verifica runtime dashboard**: controllo manuale confermato, warning sparito e grafici visibili correttamente

- Decisions:
  - Nei componenti form composti, `id`/`name` devono finire sul `button` o `input` che riceve focus, non su wrapper `div` o contenitori `Popover`
  - Per i grafici dashboard con altezza nota, usare `ResponsiveContainer` con altezza numerica diretta invece di `height="100%"` annidato in un wrapper fisso
  - Tenere separati i fix di accessibilita form dai fix dashboard per facilitare audit e revert

- Files modified:
  - `src/components/admin/select-input.tsx`
  - `src/components/admin/autocomplete-input.tsx`
  - `src/components/admin/autocomplete-array-input.tsx`
  - `src/components/atomic-crm/dashboard/DashboardRevenueTrendChart.tsx`
  - `src/components/atomic-crm/dashboard/DashboardCategoryChart.tsx`
  - `src/components/atomic-crm/dashboard/DashboardPipelineCard.tsx`

- Commits:
  - `74b38b3` `fix: align select labels with form controls`
  - `b874139` `fix: connect autocomplete fields to form labels`
  - `ff93cca` `fix: stabilize dashboard chart sizing`

- Next action: Push dei commit e smoke test trasversale sui form che usano `AutocompleteInput`

### Sessione 19 (2026-02-28, Stabilizzazione runtime e documentazione)

- Completed:
  - **Filtro periodo riusabile**: estratto `DateRangeFilter.tsx` per sidebar filtri di spese, pagamenti, progetti e servizi
  - **Filtri data estesi**: aggiunti range date a Progetti, Preventivi e vista attività dashboard
  - **Tooling repo pulita**: normalizzazione Prettier repo-wide, migrazione ignore dentro `eslint.config.js`, `make lint` tornato verde
  - **Vitest future-proof**: aggiunti `await` alle `expect(...).resolves` in `supabaseAdapter.spec.ts`
  - **Bug 406 su Spese/Pagamenti/Preventivi**: corretta la firma `useGetOne(resource, params, options)` per relazioni opzionali; eliminati fetch con id vuoto verso Supabase
  - **Verifica runtime**: test verdi, build OK, smoke check frontend OK, verifica manuale pagina Spese con record con/senza progetto OK
  - **Warning React nel registro lavori**: corretto `SelectInput` del campo `service_type` per leggere `label/value` invece dei default `name/id`
  - **Documentazione aggiornata**: README + docs developer allineate a lint/test, registry hook e convenzioni dei date range filter

- Decisions:
  - Tenere separati i commit di feature, cleanup tooling, fix runtime e docs per rendere semplice l'eventuale revert
  - Considerare `406 Not Acceptable` su `getOne` come segnale di `id` nullo/vuoto prima di ipotizzare problemi DB
  - Per tutte le liste/config basate su `LabeledValue`, dichiarare `optionText="label"` e `optionValue="value"` quando si usa `SelectInput`

- Files created:
  - `src/components/atomic-crm/filters/DateRangeFilter.tsx`

- Files modified:
  - `src/components/atomic-crm/expenses/ExpenseListFilter.tsx`
  - `src/components/atomic-crm/payments/PaymentListFilter.tsx`
  - `src/components/atomic-crm/projects/ProjectListFilter.tsx`
  - `src/components/atomic-crm/services/ServiceListFilter.tsx`
  - `src/components/atomic-crm/quotes/QuoteList.tsx`
  - `src/components/atomic-crm/tasks/TasksListContent.tsx`
  - `src/components/atomic-crm/providers/fakerest/internal/supabaseAdapter.spec.ts`
  - `src/components/atomic-crm/expenses/ExpenseListContent.tsx`
  - `src/components/atomic-crm/expenses/ExpenseShow.tsx`
  - `src/components/atomic-crm/payments/PaymentListContent.tsx`
  - `src/components/atomic-crm/payments/PaymentShow.tsx`
  - `src/components/atomic-crm/quotes/QuoteCard.tsx`
  - `src/components/atomic-crm/quotes/QuoteShow.tsx`
  - `src/components/atomic-crm/services/ServiceInputs.tsx`
  - `README.md`
  - `doc/src/content/docs/developers/architecture-choices.mdx`
  - `doc/src/content/docs/developers/data-providers.mdx`
  - `eslint.config.js`

- Commits:
  - `3d6d8af` `feat: unify date range filters across CRM lists`
  - `fe23ada` `chore: update registry for date range filter`
  - `e74a7f9` `chore: normalize formatting and lint config`
  - `4cf6127` `test: await async expectations in supabase adapter specs`
  - `8e31ee5` `fix: prevent invalid getOne requests for optional relations`
  - `e450b18` `docs: update tooling and filter guidance`
  - `4aca90e` `fix: use labeled values in service type select`

- Next action: Push dei commit e smoke test trasversale su Preventivi/Pagamenti dopo deploy

### Sessione 18 (2026-02-28, Navigazione per anno + Colori Dashboard)

- Completed:
  - **Year selector UI**: chevron `← 2025 →` con freccia destra disabilitata su anno corrente
  - **dashboardModel.ts**: parametro `year?` con validazione (2000–anno corrente, fallback), `selectedYear` e `isCurrentYear` nel DashboardModel, revenue trend adattato (gen-dic per anni passati vs rolling 12 per anno corrente)
  - **fiscalModel.ts**: parametro `year?` con stessa validazione, `monthsOfData = 12` per anni passati, aliquota calcolata su anno selezionato
  - **useDashboardData.ts**: accetta `year?`, lo passa a buildDashboardModel, aggiunto alle deps useMemo
  - **Dashboard.tsx**: state `selectedYear`, YearSelector component, visibilità condizionale per anni passati
  - **DashboardFiscalKpis.tsx**: label dinamiche ("Stima" → termine definitivo per anni passati), badge "Consuntivo anno completo"
  - **Filtro per anno**: pagamenti filtrati per `payment_date` (fallback `created_at`), preventivi per `created_at`, pipeline per anno
  - **Nascosti per anni passati**: DeadlinesCard, BusinessHealthCard, warnings fiscali, alerts card
  - **Sempre visibili**: KPI (filtrati per anno), revenue trend, categorie, top clienti, pipeline, FiscalKpis, AtecoChart
  - **Titolo dinamico**: "Fiscale & Salute Aziendale" (corrente) vs "Riepilogo Fiscale 2025" (passato)
  - **Error handling**: validazione anno (>= 2000, <= anno corrente), Number.isFinite check, freccia destra disabilitata
  - **Verifica**: Typecheck 0 errori, build OK, 42/42 test passati
  - **Colori semantici dashboard**: Badge success (verde) e warning (ambra) aggiunti a badge.tsx; Progress con prop variant (success/warning/destructive)
  - **KPI trend positivo**: badge verde (era grigio)
  - **Alert "In scadenza"**: badge ambra (era grigio) — triade ambra→rosso→outline
  - **Tetto forfettario**: progress bar verde < 70%, ambra 70-90%, rosso > 90% (desktop + mobile)
  - **Badge % netto**: verde se ≥ 60%
  - **BusinessHealth "Ottimo"/"Sano"**: badge verde (era blu generico)

- Files modified:
  - `src/components/atomic-crm/dashboard/dashboardModel.ts` (year param, selectedYear, isCurrentYear, referenceDate, filtro pagamenti/preventivi per anno)
  - `src/components/atomic-crm/dashboard/fiscalModel.ts` (year param, monthsOfData condizionale)
  - `src/components/atomic-crm/dashboard/useDashboardData.ts` (year param passthrough)
  - `src/components/atomic-crm/dashboard/Dashboard.tsx` (YearSelector, state, visibilità condizionale)
  - `src/components/atomic-crm/dashboard/DashboardFiscalKpis.tsx` (isCurrentYear prop, label dinamiche, colori tetto + badge netto)
  - `src/components/atomic-crm/dashboard/DashboardAlertsCard.tsx` (due_soon warning badge)
  - `src/components/atomic-crm/dashboard/DashboardBusinessHealthCard.tsx` (badge success per stati positivi)
  - `src/components/atomic-crm/dashboard/DashboardKpiCards.tsx` (trend positivo success badge)
  - `src/components/atomic-crm/dashboard/MobileDashboard.tsx` (progress bar tetto colorata)
  - `src/components/ui/badge.tsx` (varianti success + warning)
  - `src/components/ui/progress.tsx` (prop variant con CVA)

- Decisions:
  - Per anni passati nascondere completamente (non avvisi) i componenti forward-looking
  - Filtrare pagamenti e preventivi per anno (non mostrare dati globali)
  - Alerts nascosti per anni passati (operativi solo per anno corrente)
  - Pagamenti non ricevuti di anni passati restano visibili solo nell'anno di appartenenza (crediti persi = dato storico)
  - MobileDashboard non impattata (sempre anno corrente)

- Next action: Test visivo completo, deploy Vercel

### Sessione 17 (2026-02-28, Simulatore Fiscale)

- Completed:
  - **Tipi fiscali**: `FiscalTaxProfile` + `FiscalConfig` in types.ts
  - **ConfigurationContext**: aggiunto `fiscalConfig` con default (ATECO 731102 78%, 621000 67%)
  - **Settings UI**: nuova sezione "Fiscale" in Impostazioni con profili ATECO, aliquota auto, INPS, tetto
  - **Modello fiscale** (`fiscalModel.ts`): logica pura (KPI, ATECO breakdown, scadenze, business health, warnings)
  - **Dashboard desktop**: 4 nuovi componenti (FiscalKpis, AtecoChart, DeadlinesCard, BusinessHealthCard)
  - **Dashboard mobile**: 3 KPI compatti (accantonamento, prossima scadenza, tetto)
  - **Data integration**: query expenses + fiscalConfig integrati nel dashboard model
  - **Verifica**: Typecheck 0 errori, build OK (6.09s), 42/42 test passati

- Files created:
  - `src/components/atomic-crm/settings/FiscalSettingsSection.tsx`
  - `src/components/atomic-crm/dashboard/fiscalModel.ts`
  - `src/components/atomic-crm/dashboard/DashboardFiscalKpis.tsx`
  - `src/components/atomic-crm/dashboard/DashboardAtecoChart.tsx`
  - `src/components/atomic-crm/dashboard/DashboardDeadlinesCard.tsx`
  - `src/components/atomic-crm/dashboard/DashboardBusinessHealthCard.tsx`

- Files modified:
  - types.ts, ConfigurationContext.tsx, defaultConfiguration.ts, SettingsPage.tsx
  - dashboardModel.ts, useDashboardData.ts, Dashboard.tsx, MobileDashboard.tsx

- Next action: Test visivo completo, deploy Vercel

### Sessione 16 (2026-02-28, DateTime Range Support)

- Completed:
  - **DB Migration**: `20260228120000_datetime_range_support.sql`
    - quotes: event_date → event_start (TIMESTAMPTZ) + event_end (TIMESTAMPTZ) + all_day (BOOLEAN DEFAULT true)
    - projects: start_date/end_date convertiti a TIMESTAMPTZ + all_day aggiunto; CHECK constraint droppato e ricreato
    - services: service_date → TIMESTAMPTZ + service_end (TIMESTAMPTZ) + all_day (BOOLEAN DEFAULT true)
    - client_tasks: all_day (BOOLEAN DEFAULT true) aggiunto
  - **Utility condivise**: `src/components/atomic-crm/misc/formatDateRange.ts`
    - `formatDateRange(start, end, allDay)` — per liste/card (dd/MM/yyyy o dd/MM/yyyy HH:mm)
    - `formatDateLong(start, end, allDay)` — per PDF (formato lungo italiano con date-fns locale)
  - **Types + i18n**: Aggiornati `types.ts` e `i18nProvider.tsx` per tutti i moduli
  - **Preventivi** (5 file): QuoteInputs (BooleanInput + DateComponent condizionale), QuoteCard (formatDateRange), QuoteShow, QuotePDF (formatDateLong), QuoteList (exporter CSV aggiornato)
  - **Servizi** (4 file): ServiceInputs (BooleanInput + service_end), ServiceShow, ServiceListContent, ServiceList (exporter CSV)
  - **Progetti** (4 file): ProjectInputs (BooleanInput + DateComponent condizionale), ProjectShow (periodo combinato), ProjectListContent ("Periodo" con formatDateRange), ProjectList (exporter CSV)
  - **Promemoria** (3 file): TaskFormContent (BooleanInput + DateComponent), TaskCreateSheet (default all_day + transform), Task (formatDateRange + postponeDate helper)
  - **Verifica**: Typecheck 0 errori, build OK (6.27s), 42/42 test passati

- Decisions:
  - Pattern Google Calendar: all_day=true → DateInput (solo data), all_day=false → DateTimeInput (data+ora)
  - DATE → TIMESTAMPTZ migration sicura (DATE_TRUNC funziona identicamente, PostgREST accetta YYYY-MM-DD)
  - CHECK constraint: DROP → ALTER TYPE → RECREATE (pattern sicuro per cambio tipo colonna)
  - postponeDate preserva il time component quando all_day=false
  - Colonna "Periodo" nei progetti unifica start_date + end_date in una sola cella con formatDateRange

- Migration created:
  - `supabase/migrations/20260228120000_datetime_range_support.sql`

- Files created:
  - `src/components/atomic-crm/misc/formatDateRange.ts`

- Files modified:
  - `src/components/atomic-crm/types.ts` (Quote: +event_start/event_end/all_day, Project: +all_day, Service: +service_end/all_day, ClientTask: +all_day)
  - `src/components/atomic-crm/root/i18nProvider.tsx` (labels per nuovi campi)
  - `src/components/atomic-crm/quotes/QuoteInputs.tsx` (BooleanInput + DateComponent)
  - `src/components/atomic-crm/quotes/QuoteCard.tsx` (formatDateRange)
  - `src/components/atomic-crm/quotes/QuoteShow.tsx` (formatDateRange)
  - `src/components/atomic-crm/quotes/QuotePDF.tsx` (formatDateLong)
  - `src/components/atomic-crm/quotes/QuoteList.tsx` (exporter CSV)
  - `src/components/atomic-crm/services/ServiceInputs.tsx` (BooleanInput + service_end)
  - `src/components/atomic-crm/services/ServiceShow.tsx` (formatDateRange)
  - `src/components/atomic-crm/services/ServiceListContent.tsx` (formatDateRange)
  - `src/components/atomic-crm/services/ServiceList.tsx` (exporter CSV)
  - `src/components/atomic-crm/projects/ProjectInputs.tsx` (BooleanInput + DateComponent)
  - `src/components/atomic-crm/projects/ProjectShow.tsx` (formatDateRange, "Periodo" combinato)
  - `src/components/atomic-crm/projects/ProjectListContent.tsx` (formatDateRange, "Periodo")
  - `src/components/atomic-crm/projects/ProjectList.tsx` (exporter CSV)
  - `src/components/atomic-crm/tasks/TaskFormContent.tsx` (BooleanInput + DateComponent)
  - `src/components/atomic-crm/tasks/TaskCreateSheet.tsx` (default all_day + transform)
  - `src/components/atomic-crm/tasks/Task.tsx` (formatDateRange + postponeDate)

- Continued (bug fix audit):
  - **Migration fix**: DROP VIEW monthly_revenue + project_financials prima di ALTER TYPE service_date, poi RECREATE
  - **Migration pushata** al DB remoto con successo
  - **Validazione date range** aggiunta: event_end >= event_start (QuoteInputs), service_end >= service_date (ServiceInputs)
  - **Default all_day mancanti**: aggiunti a ProjectCreate, ServiceCreate, QuoteCreate, AddTask
  - **AddTask transform**: ora condizionale su all_day (non forza mezzanotte se all_day=false)
  - **Dashboard UpcomingServiceAlert**: aggiunto serviceEnd + allDay al tipo e al builder, DashboardAlertsCard usa formatDateRange quando allDay=false

- Next action: Test visivo completo, deploy Vercel

### Sessione 15 (2026-02-28, tipi servizio configurabili)

- Completed:
  - **Fix dialog preventivi**: NumberInput controlled/uncontrolled warning (destructured defaultValue), DialogTitle/DialogDescription mancanti su QuoteCreate, QuoteShow, QuoteEdit
  - **CHECK constraint quotes.service_type**: Migration `20260227230519_add_quotes_service_type_check.sql` (poi droppata — vedi sotto)
  - **Tipi servizio editabili da Impostazioni**:
    - ConfigurationContext: aggiunti `quoteServiceTypes` e `serviceTypeChoices` (LabeledValue[])
    - defaultConfiguration: valori default con nuovi tipi (produzione_tv, videoclip, documentario, spot, sito_web)
    - SettingsPage: 2 nuove sezioni "Tipi preventivo" e "Tipi servizio" con ArrayInput editabili
    - 10 componenti aggiornati per leggere da config invece che da costanti hardcoded:
      - Preventivi: QuoteInputs, QuoteCard, QuoteShow, QuoteList (exporter incluso)
      - Servizi: ServiceInputs, ServiceList (exporter incluso), ServiceShow, ServiceListContent, ServiceListFilter
    - Pulizia: rimossi export dead code da quotesTypes.ts, svuotato serviceTypes.ts
    - DB: droppati CHECK constraint su quotes.service_type e services.service_type (migration `20260227231714_drop_service_type_checks.sql`)

- Decisions:
  - Tipi preventivo e tipi servizio sono due liste separate (concettualmente diversi: tipo evento vs tipo lavoro tecnico)
  - Formato LabeledValue { value, label } per coerenza con ConfigurationContext (non { id, name })
  - ensureValues() auto-genera slug value dal label se mancante
  - CHECK constraint incompatibili con tipi dinamici — rimossi entrambi
  - Exporter CSV spostati dentro il componente per accedere alla config via hook

- Migrations created:
  - `supabase/migrations/20260227230519_add_quotes_service_type_check.sql` (aggiunto e poi droppato)
  - `supabase/migrations/20260227231714_drop_service_type_checks.sql`

- Files modified:
  - `src/components/admin/number-input.tsx` (fix defaultValue passthrough)
  - `src/components/atomic-crm/root/ConfigurationContext.tsx` (+ quoteServiceTypes, serviceTypeChoices)
  - `src/components/atomic-crm/root/defaultConfiguration.ts` (+ defaults con nuovi tipi)
  - `src/components/atomic-crm/settings/SettingsPage.tsx` (+ 2 sezioni editabili)
  - `src/components/atomic-crm/quotes/QuoteCreate.tsx` (+ DialogTitle/DialogDescription)
  - `src/components/atomic-crm/quotes/QuoteEdit.tsx` (+ DialogDescription)
  - `src/components/atomic-crm/quotes/QuoteShow.tsx` (+ DialogTitle/DialogDescription, config)
  - `src/components/atomic-crm/quotes/QuoteInputs.tsx` (config)
  - `src/components/atomic-crm/quotes/QuoteCard.tsx` (config)
  - `src/components/atomic-crm/quotes/QuoteList.tsx` (config, exporter inside component)
  - `src/components/atomic-crm/quotes/quotesTypes.ts` (rimossi quoteServiceTypes/quoteServiceTypeLabels)
  - `src/components/atomic-crm/services/ServiceInputs.tsx` (config)
  - `src/components/atomic-crm/services/ServiceList.tsx` (config, exporter inside component)
  - `src/components/atomic-crm/services/ServiceShow.tsx` (config)
  - `src/components/atomic-crm/services/ServiceListContent.tsx` (config)
  - `src/components/atomic-crm/services/ServiceListFilter.tsx` (config, type.id→type.value)
  - `src/components/atomic-crm/services/serviceTypes.ts` (svuotato, placeholder)

- Next action: Test visivo completo, deploy Vercel

### Sessione 14 (2026-02-28, audit robustezza)

- In progress:
  - **Audit robustezza** — 19 problemi identificati in audit.md (7 P0, 6 P1, 4 P2)
  - **A1 + B1: Duplicati clienti** — UNIQUE constraint DB su `clients.name` + validazione async frontend (query pre-save con esclusione record corrente in edit)
  - **A2 + B2: Importi negativi + crediti + rimborsi**:
    - CHECK >= 0 su tutte le colonne numeriche (services, payments, expenses, quotes)
    - `minValue(0)` di ra-core su tutti i NumberInput (4 file Inputs)
    - Nuovo tipo spesa `credito_ricevuto` (bene/sconto ricevuto dal cliente, riduce spese)
    - Nuovo tipo pagamento `rimborso` (rimborso al cliente, riduce il pagato)
    - Migration: iPhone da amount=-500 → amount=+500, type=credito_ricevuto
    - View `project_financials` aggiornata: crediti sottratti dalle spese, rimborsi sottratti dal pagato
    - `computeTotal` aggiornato in 3 file (ExpenseListContent, ExpenseShow, ExpenseList)
    - `ClientFinancialSummary` aggiornato per crediti e rimborsi
    - `dashboardModel.ts` aggiornato: rimborsi esclusi dai pending alerts
    - Descrizioni tipi aggiunte (expenseTypeDescriptions, paymentTypeDescriptions)
    - Sezione CreditSection nel form spese (solo campo amount con helperText)

- Decisions:
  - Il segno è determinato dal TIPO, non dal valore: importi sempre >= 0
  - `credito_ricevuto` per spese (iPhone, sconti, barter): valore positivo, sistema sottrae
  - `rimborso` per pagamenti: importo positivo, sistema sottrae dal total_paid
  - Duplicati clienti: DB UNIQUE + frontend check (scelta utente: entrambi)
  - Descrizioni mini per tipi spesa/pagamento: basate su funzionamento reale sistema

- Migration created:
  - `supabase/migrations/20260228000000_audit_constraints.sql` (UNIQUE, CHECK, tipi nuovi, iPhone migration, view aggiornata)

- Files modified:
  - `src/components/atomic-crm/clients/ClientInputs.tsx` (validazione unique name)
  - `src/components/atomic-crm/services/ServiceInputs.tsx` (minValue su 6 campi)
  - `src/components/atomic-crm/payments/PaymentInputs.tsx` (minValue su amount)
  - `src/components/atomic-crm/expenses/ExpenseInputs.tsx` (minValue + CreditSection)
  - `src/components/atomic-crm/quotes/QuoteInputs.tsx` (minValue su amount)
  - `src/components/atomic-crm/expenses/expenseTypes.ts` (credito_ricevuto + descriptions)
  - `src/components/atomic-crm/payments/paymentTypes.ts` (rimborso + descriptions)
  - `src/components/atomic-crm/expenses/ExpenseListContent.tsx` (computeTotal per crediti)
  - `src/components/atomic-crm/expenses/ExpenseShow.tsx` (computeTotal + CreditSection view)
  - `src/components/atomic-crm/expenses/ExpenseList.tsx` (computeTotal export)
  - `src/components/atomic-crm/clients/ClientFinancialSummary.tsx` (crediti e rimborsi)
  - `src/components/atomic-crm/dashboard/dashboardModel.ts` (rimborsi esclusi da pending)

- Continued (same session):
  - **A3 + B3: payment_date obbligatoria**:
    - Frontend: `validate={required()}` su DateInput in PaymentInputs.tsx
    - DB: Migration `20260227220805_payment_date_not_null.sql` — safety fill NULL→created_at + ALTER COLUMN SET NOT NULL
    - Migration pushata al DB remoto
  - **Ricerca descrizione nelle Spese**: Campo di ricerca `description@ilike` nella sidebar filtri ExpenseListFilter (stesso pattern di ServiceListFilter per località)
  - **Tooltip descrizioni tipi**: `optionText` come funzione con `<span title={...}>` su SelectInput tipo in ExpenseInputs e PaymentInputs — mostra descrizione al passaggio del mouse
  - iPhone dissociato dal progetto "Borghi Marinari" (scelta utente) — credito generico a livello cliente, non progetto-specifico

- Decisions (continued):
  - payment_date sempre obbligatoria (nessuna eccezione)
  - Tooltip nativi browser (`title` attr) per descrizioni tipi — approccio minimale senza componenti extra
  - Crediti senza project_id: esclusi da project_financials view (WHERE project_id IS NOT NULL), inclusi in ClientFinancialSummary (filtra per client_id)
  - Dashboard non usa expenses — KPI non impattati da crediti/rimborsi

- Migrations created (continued):
  - `supabase/migrations/20260227220805_payment_date_not_null.sql`

- Files modified (continued):
  - `src/components/atomic-crm/payments/PaymentInputs.tsx` (required payment_date + tooltip tipo)
  - `src/components/atomic-crm/expenses/ExpenseInputs.tsx` (tooltip tipo)
  - `src/components/atomic-crm/expenses/ExpenseListFilter.tsx` (campo ricerca descrizione)

- Continued (same session, second part):
  - **Filtri coerenti Pagamenti/Spese**: Client dropdown + date range filter aggiunti a PaymentListFilter e ExpenseListFilter; project colonna aggiunta a export CSV di entrambi
  - **A4: Motivo rifiuto required quando status=rifiutato**:
    - Frontend: `validate={required()}` su rejection_reason in QuoteInputs
    - DB: CHECK constraint `status != 'rifiutato' OR rejection_reason IS NOT NULL`
    - Kanban: drag verso colonna "Rifiutato" bloccato — editing obbligatorio per compilare motivo
  - **A5 + B8: Date incoerenti**:
    - DB: CHECK `end_date >= start_date` su projects, `response_date >= sent_date` su quotes (tollerano NULL)
    - Frontend: validatore inline su end_date e response_date
  - **A6: Date preventivo condizionali per status**:
    - Frontend: `sent_date` required se status ≠ primo_contatto; `response_date` required per accettato/rifiutato/successivi
    - Solo frontend (no DB CHECK per compatibilità Kanban drag-and-drop)
  - **A7: Tag name non vuoto**: early return + button disabled se `newTagName.trim()` vuoto in TagDialog
  - **B4: updated_at su services, payments, expenses**: Migration con ADD COLUMN + trigger `set_updated_at()`
  - **B6: UNIQUE (client_id, name) su projects**: Migration con UNIQUE constraint
  - **C1 + C2: Error handling liste e show pages**:
    - Creato `misc/ErrorMessage.tsx` (componente riutilizzabile con AlertCircle)
    - Aggiunto `if (error) return <ErrorMessage />` a 4 ListContent + 5 Show pages
  - **Typecheck 0 errori, build OK**

- Decisions (second part):
  - Dashboard come early warning per pagamenti scaduti — niente auto-update DB status (utente decide manualmente)
  - Kanban drag verso "Rifiutato" bloccato per coerenza con DB constraint rejection_reason
  - Date condizionali solo frontend (sent_date, response_date) per compatibilità drag-and-drop
  - ErrorMessage come componente condiviso in misc/ anziché duplicato in ogni file

- Migrations created (second part):
  - `20260227223414_quote_rejection_reason_required.sql`
  - `20260227224137_date_range_checks.sql`
  - `20260227224448_add_updated_at_columns.sql`
  - `20260227224515_unique_project_client_name.sql`

- Next action: Test visivo completo, deploy Vercel

### Sessione 13 (2026-02-27, sera)

- Completed:
  - **Deploy su Vercel** — Build OK, push a GitHub, deploy automatico
  - **Separazione workflow episodi/pagamenti** — QuickEpisodeDialog semplificato (solo servizio), QuickPaymentDialog nuovo (pagamento a livello progetto)
  - **Smart payment amounts** — Auto-fill importo in base al tipo: acconto=compensi, saldo=residuo, rimborso=totale spese
  - **Expenses nella view project_financials** — Migration `20260227230000_add_expenses_to_project_financials.sql`: aggiunge total_expenses da tabella expenses (km + materiale + noleggio con markup)
  - **Alert pagamenti intelligenti** — Dashboard mostra TUTTI i pagamenti pending con urgency (overdue/due_soon/pending), non solo finestra 7 giorni
  - **Progetto e note negli alert** — PaymentAlert esteso con projectName e notes per identificare i pagamenti
  - **Filtro cliente nella lista progetti** — Dropdown select con tutti i clienti (non badge, meglio UX con molti clienti)
  - **Fix ricerca progetti** — Campo "Cerca progetto" convertito da `q` (FTS, non funzionante) a `name@ilike` con wildcards
  - **Riallocazione COMPLETA pagamenti Diego** — Migration `20260227205707_reallocate_diego_payments.sql`:
    - Incrociati fogli CSV + fatture XML + DB per trovare allocazione corretta
    - DELETE 10 pagamenti errati, CREATE 11 corretti
    - Foglio 1: GS €6.761,59 + BTF €4.207,71 + 6 Spot €1.437,89 = €12.407,19
    - Foglio 2: GS €1.360,25 + BTF €1.322,10 + BM €7.152,10 = €9.834,45
    - Tutti gli spot a balance 0, GS a 0, BM a 0, Nisseno a 0
    - BTF mostra €669,60 = pending non fatturato, VIV mostra €389 = in attesa
    - Totale ricevuto invariato: €23.985,64

- Decisions:
  - Workflow pagamenti: separato da episodi, a livello progetto (non per singolo servizio)
  - Rimosso "parziale" come tipo pagamento (ridondante con acconto)
  - Rimosso "scaduto" dal dialog pagamento (auto-determinato dal sistema)
  - DROP VIEW + CREATE VIEW quando l'ordine colonne cambia (non CREATE OR REPLACE)
  - Fogli contabili CSV come fonte di verità per allocazione pagamenti
  - Km allocati proporzionalmente ai progetti basandosi sui dati foglio
  - Spese km NON fatturate al cliente (confermato dalle fatture XML)
  - Dropdown per filtro clienti (non badge) — scalabilità UX

- Migrations created:
  - `supabase/migrations/20260227230000_add_expenses_to_project_financials.sql`
  - `supabase/migrations/20260227205707_reallocate_diego_payments.sql`

- Files created:
  - `src/components/atomic-crm/projects/QuickPaymentDialog.tsx`

- Files modified:
  - `src/components/atomic-crm/projects/QuickEpisodeForm.tsx` (semplificato)
  - `src/components/atomic-crm/projects/QuickEpisodeDialog.tsx` (semplificato)
  - `src/components/atomic-crm/projects/ProjectShow.tsx` (+ QuickPaymentDialog, financials aggiornati)
  - `src/components/atomic-crm/projects/ProjectListFilter.tsx` (+ filtro cliente dropdown, fix ricerca)
  - `src/components/atomic-crm/dashboard/dashboardModel.ts` (alert urgency, projectName, notes)
  - `src/components/atomic-crm/dashboard/DashboardAlertsCard.tsx` (urgency UI, PaymentAlertRow)

- Next action: **Test visivo completo**, verifica deploy Vercel aggiornato

### Sessione 12 (2026-02-27)

- Completed:
  - **Import dati Diego Caltabiano** — Migration SQL `20260227100000_import_diego_caltabiano.sql`
    - 1 client (Diego Caltabiano, codice fiscale, P.IVA, email, telefono)
    - 9 projects (GS S1, BTF S1, SPOT S1, Borghi Marinari S2, GS regolari S2, BTF S2, montaggio bonus, HD Seagate, iPhone 14)
    - 64 services (16 GS S1 + 1 bonus + 15 BTF S1 + 6 SPOT S1 + 16 Borghi S2 + 3 GS S2 + 5 BTF S2 + 2 placeholder)
    - 7 payments (€999 + €2000 + €3113 + €2500 + €2000 + €1795.19 + €2682.35 = €15,089.54)
    - 3 expenses (HD Seagate €293, HD S2 €260, iPhone 14 -€500)
  - **Import spese km** — Migration `20260227110000_import_diego_km_expenses.sql`
    - 40 record expense tipo `spostamento_km`, uno per servizio con km > 0
    - Totale km expenses: €1,245.64
  - **Pagamento pendente + split per progetto** — Migrations:
    - `20260227120000_import_diego_pending_payment.sql` — pagamento iniziale €7,152.10
    - `20260227130000_import_diego_split_payments.sql` — split in 3 pagamenti per progetto:
      - GS S2: €989.24, Borghi Marinari: €5,201.36, BTF S2: €961.50
    - Assegnato `project_id` ai pagamenti esistenti (Foglio 1 → GS, Foglio 2 acconto → Borghi)
  - **UI: Riepilogo finanziario cliente** — `ClientFinancialSummary.tsx`
    - 4 metric cards: Compensi, Rimborso km (+spese), Pagato, Da saldare
    - Aggiunto alla scheda ClientShow
  - **UI: Riepilogo finanziario progetto** — `ProjectFinancials` in `ProjectShow.tsx`
    - 4 metriche: Servizi, Compensi, Km, Totale
  - **UI: Filtro per progetto** — Aggiunto a PaymentListFilter e ExpenseListFilter
  - **UI: Colonna Progetto** — Aggiunta a PaymentListContent
  - **FIX CRITICO: Prodotto cartesiano nella view project_financials** — Migration `20260227140000_fix_project_financials_view.sql`
    - Bug: LEFT JOIN services × payments produceva N×M righe, gonfiando tutti i totali
    - Fix: pre-aggregazione in subquery prima del JOIN
    - Compensi mostrati: €73,141 → dovrebbe essere ~€20,942
  - **Verifica totali** — Python script verifica al centesimo:
    - Foglio 1: €12,407.19 ✅
    - Foglio 2: €9,834.45 ✅
    - Grand Total: €22,241.64 ✅
    - Pagamenti: €15,089.54 ✅
    - Da saldare: €7,152.10 ✅
  - **Tutte le 5 migration pushate al DB remoto** ✅
  - Typecheck: 0 errori, Build: OK

- Decisions:
  - Migration idempotente con `ON CONFLICT DO NOTHING` su settings e client
  - Km rate €0.19 applicato ai totali foglio (colonna km_amount in DB)
  - HD Seagate con markup 25% (€234 → €293 per il cliente)
  - iPhone 14 come spesa negativa (-€500) perché è un credito/detrazione
  - Montaggio bonus come progetto separato (servizio singolo a €249)
  - 2 servizi BTF S2 come placeholder (data 2025-06-01 e 2025-07-01, importi zero)
  - Spese km create come record `spostamento_km` nella tabella expenses (1 per servizio con km > 0)
  - Pagamento pendente diviso proporzionalmente per progetto (GS 13.8%, Borghi 72.7%, BTF 13.4%)
  - View fix con subquery pre-aggregation per evitare Cartesian product

- Migrations created:
  - `supabase/migrations/20260227100000_import_diego_caltabiano.sql`
  - `supabase/migrations/20260227110000_import_diego_km_expenses.sql`
  - `supabase/migrations/20260227120000_import_diego_pending_payment.sql`
  - `supabase/migrations/20260227130000_import_diego_split_payments.sql`
  - `supabase/migrations/20260227140000_fix_project_financials_view.sql`

- Files created:
  - `src/components/atomic-crm/clients/ClientFinancialSummary.tsx`

- Files modified:
  - `src/components/atomic-crm/clients/ClientShow.tsx` (+ ClientFinancialSummary)
  - `src/components/atomic-crm/projects/ProjectShow.tsx` (+ ProjectFinancials section)
  - `src/components/atomic-crm/payments/PaymentListFilter.tsx` (+ filtro progetto)
  - `src/components/atomic-crm/payments/PaymentListContent.tsx` (+ colonna Progetto)
  - `src/components/atomic-crm/expenses/ExpenseListFilter.tsx` (+ filtro progetto)

- Continued (same session):
  - **Fix invoice_ref mancanti** — Migration `20260227190000_fix_missing_invoice_refs.sql`
    - 2 pagamenti (€989.24 e €5,201.36 del 10/11/2025) senza invoice_ref → assegnato FPR 6/25
    - Query remota via REST API con service_role key (bypassa RLS)
  - **Fix payment_type acconto → saldo** — Migration `20260227210000_fix_payment_types.sql`
    - €3,113 (03/03/2025) FPR 1/25: era "acconto", è "saldo" (completa la fattura)
    - €2,682.35 (14/10/2025) FPR 4/25: era "acconto", è "saldo" (unico pagamento)
    - Verifica sistematica: lette 5 fatture PDF, confrontati importi e date
  - **Servizi BTF non fatturati** — Migration `20260227200000_complete_btf_cantina_tre_santi.sql`
    - 18/09 (vendemmia) e 21/10 (puntata finale) a Cantina Tre Santi con fee=0
    - Confronto date fatture: nessuna fattura copre quelle date → lavoro non fatturato
    - Completati con tariffe standard BTF: shooting=187, editing=125, km=120
  - **Spese e pagamento BTF mancanti** — Migration `20260227220000_btf_extra_expenses_and_payment.sql`
    - 2 expense spostamento_km (120km × €0.19 ciascuno)
    - 1 payment in_attesa €669.60 (saldo per 2 puntate BTF non fatturate)
  - **Verifica km rate da file originale** — Letto file Numbers con numbers_parser
    - Confermato €0.19/km su tutti i servizi (nessuna eccezione)
  - **Google Calendar MCP** — Configurato server MCP per Google Calendar
    - OAuth credentials Google Cloud salvate in ~/.config/google-calendar-mcp/
    - Server aggiunto con `claude mcp add` (pacchetto @cocal/google-calendar-mcp)
  - **Tutte le 4 migration pushate al DB remoto** ✅

- Decisions (continued):
  - Verifica finanziaria via fatture PDF (date + importi), non solo file originale Numbers
  - Servizi completati ma non fatturati: creare anche expense km e payment in_attesa
  - payment_type "saldo" quando il pagamento completa la fattura (anche se c'è un acconto precedente)
  - €0.19/km confermato come rate uniforme da file originale

- Migrations created (continued):
  - `supabase/migrations/20260227190000_fix_missing_invoice_refs.sql`
  - `supabase/migrations/20260227200000_complete_btf_cantina_tre_santi.sql`
  - `supabase/migrations/20260227210000_fix_payment_types.sql`
  - `supabase/migrations/20260227220000_btf_extra_expenses_and_payment.sql`

- Next action: **Test visivo completo**, deploy Vercel, verifica date BTF su Google Calendar

### Sessione 11 (2026-02-26)

- Completed:
  - **Pulizia moduli Atomic CRM** — 4 fasi completate (A→D)
    - **Fase A**: Migration DB `20260226200000_client_tasks_notes_tags.sql`
      - Tabella `client_tasks` (UUID PK, FK opzionale a clients ON DELETE SET NULL)
      - Tabella `client_notes` (UUID PK, FK obbligatoria a clients ON DELETE CASCADE)
      - Colonna `tags BIGINT[]` aggiunta a clients
      - RLS + policy su tutte le nuove tabelle
      - Pushata al DB remoto con successo
    - **Fase B**: Adattamento Tasks, Notes, Tags per clients
      - Tasks adattati: `contact_id` → `client_id`, resource `tasks` → `client_tasks`
      - 10 file nel modulo tasks/ riscritti (Task, AddTask, TaskFormContent, TaskCreateSheet, TaskEdit, TaskEditSheet, TasksIterator, TasksListFilter, TasksListEmpty)
      - Notes clienti: ClientNoteItem.tsx + ClientNotesSection.tsx (inline create/list)
      - Tags clienti: ClientTagsList.tsx + ClientTagsListEdit.tsx (in tags/)
      - ClientShow aggiornato con sezioni Tags, Note, Promemoria
      - ClientTasksSection.tsx per promemoria nella scheda cliente
      - TasksList.tsx (pagina lista desktop per tab Promemoria)
    - **Fase C**: Rimozione moduli morti
      - 5 directory eliminate: companies/ (14), contacts/ (24), deals/ (16), activity/ (9), notes/ (14)
      - Sales UI rimossa (SalesList, SalesCreate, SalesEdit, SalesInputs), tenuto SaleName + headless
      - Import module eliminato (ImportPage, useImportFromJson — era per contacts/companies)
      - Commons puliti: activity.ts, getCompanyAvatar, getContactAvatar, mergeContacts eliminati
      - FakeRest generators eliminati: companies, contacts, contactNotes, deals, dealNotes, tasks
      - supabase/dataProvider.ts: rimosso view routing companies/contacts, unarchiveDeal, getActivityLog, mergeContacts, callbacks morti
      - fakerest/dataProvider.ts: rimosso tutti callbacks companies/contacts/deals/tasks
      - SettingsPage: rimosso sezioni "Aziende" e "Trattative"
      - Header: rimosso ImportFromJsonMenuItem e UsersMenu, aggiunto tab "Promemoria"
      - MobileNavigation: rimosso contacts/companies/deals, CreateButton crea solo Promemoria
      - ConfigurationContext: rimosso companySectors, dealCategories, dealStages, dealPipelineStatuses
      - types.ts: rimosso Company, Contact, Deal, DealNote, ContactNote (old), Task (old), Activity, ContactGender
      - consts.ts: rimosso costanti activity log vecchie
      - App.tsx: aggiornato commento JSDoc
      - ContactOption.tsx eliminato, SettingsPage.test.ts (deals) eliminato
    - **Fase D**: Verifica completa
      - Typecheck: 0 errori ✅
      - Build: OK (4.35s) ✅
      - Test: 42/42 passati ✅
      - Lint: 0 nuovi errori ✅

- Decisions:
  - client_tasks.client_id è opzionale (ON DELETE SET NULL) — promemoria possono essere generici
  - client_notes.client_id è obbligatorio (ON DELETE CASCADE) — note sempre legate a un cliente
  - Tags usano BIGINT[] sulla tabella clients (match con tags.id BIGINT)
  - Import module rimosso interamente (era per formato Atomic CRM, non compatibile)
  - Sales mantenuto headless (tabella + trigger) per futuro multi-utente
  - Pagina /settings semplificata: solo Marchio, Note, Attività

- Migration created:
  - `supabase/migrations/20260226200000_client_tasks_notes_tags.sql`

- Files created (Fase B):
  - `src/components/atomic-crm/clients/ClientNoteItem.tsx`
  - `src/components/atomic-crm/clients/ClientNotesSection.tsx`
  - `src/components/atomic-crm/clients/ClientTasksSection.tsx`
  - `src/components/atomic-crm/tags/ClientTagsList.tsx`
  - `src/components/atomic-crm/tags/ClientTagsListEdit.tsx`
  - `src/components/atomic-crm/tasks/TasksList.tsx`

- Files heavily modified:
  - `src/components/atomic-crm/tasks/` (10 file — contact → client)
  - `src/components/atomic-crm/clients/ClientShow.tsx` (tags + notes + tasks)
  - `src/components/atomic-crm/root/CRM.tsx` (risorse pulite)
  - `src/components/atomic-crm/providers/supabase/dataProvider.ts` (cleanup)
  - `src/components/atomic-crm/providers/fakerest/dataProvider.ts` (cleanup)
  - `src/components/atomic-crm/settings/SettingsPage.tsx` (sezioni ridotte)
  - `src/components/atomic-crm/layout/Header.tsx` (+Promemoria, -Import, -Utenti)
  - `src/components/atomic-crm/layout/MobileNavigation.tsx` (cleanup)
  - `src/components/atomic-crm/root/ConfigurationContext.tsx` (interface ridotta)
  - `src/components/atomic-crm/root/defaultConfiguration.ts` (defaults ridotti)
  - `src/components/atomic-crm/types.ts` (+ClientTask, +ClientNote, -Company, -Contact, -Deal, ecc.)
  - `src/components/atomic-crm/consts.ts` (costanti ridotte)

- Next action: **Import dati reali Diego Caltabiano** (da docs/data-import-analysis.md)

### Sessione 10 (precedente)

- Dashboard finanziaria con Recharts (4 KPI, 2 grafici, pipeline, alert)
- Mobile dashboard KPI-only
- Fix build production (useWatch import)
- Typecheck 0, build OK

### Sessione 9 (precedente)

- Modulo Preventivi (Quotes) — Kanban 10 stati, drag-and-drop, 13 file

### Sessione 7

- DB migration Fase 2, 5 moduli CRUD, 60/60 test

## Previous Sessions

- 2026-02-26 (sessione 10): Dashboard finanziaria Recharts
- 2026-02-26 (sessione 9): Modulo Preventivi Kanban
- 2026-02-26 (sessione 8): Solo documentazione
- 2026-02-26 (sessione 7): 5 moduli CRUD + migration
- 2026-02-25 (sessione 6): Design completo Fase 2
- 2026-02-25 (sessione 5): Deploy Vercel, Edge Functions, CORS
- 2026-02-25 (sessione 4): Audit, fix signup, keep-alive
- 2026-02-25 (sessione 3): Fix stringhe inglesi
- 2026-02-25 (sessione 2): i18n Provider, ~200+ stringhe
- 2026-02-25 (sessione 1): Fork, Supabase remoto, migration, RLS

## Next Steps

1. [x] DB migration (discount + tariffe + views)
2. [x] Modulo Clienti
3. [x] Modulo Progetti
4. [x] Modulo Registro Lavori (Services)
5. [x] Modulo Preventivi (Quotes)
6. [x] Modulo Pagamenti
7. [x] Modulo Spese
8. [x] Dashboard Recharts
9. [x] Pulizia moduli Atomic CRM + adattamento Tasks/Notes/Tags
10. [x] Import dati reali Diego Caltabiano (84 record + 40 km expenses + 3 split payments)
11. [x] Fix prodotto cartesiano view project_financials + UI finanziari (ClientShow, ProjectShow)
12. [ ] Test visivo completo di ogni modulo (in corso)
13. [ ] Deploy su Vercel e test in produzione

## Remaining Low-Priority Items

- FakeRest data generators usano `faker/locale/en_US` (solo demo mode, non produzione)
- 4 vulnerabilità npm (1 moderate, 3 high) — da valutare con `npm audit`
- Warnings Vitest su promise non awaited in supabaseAdapter.spec.ts (codice upstream)
- Verificare che signup sia disabilitato anche nel **Supabase Dashboard remoto**
- Edge Function `postmark` crasha (manca secrets Postmark — non prioritaria)
- 3 errori lint pre-esistenti (useGetOne condizionale in ExpenseShow/PaymentShow, mergeTranslations inutilizzato in i18nProvider)

## Certezze (sessione 12)

- [x] Import Diego Caltabiano: 84 record + 40 km expenses + 3 split payments = 127 record totali
- [x] Totali verificati al centesimo: €22,241.64 totale, €15,089.54 pagato, €7,152.10 da saldare
- [x] 5 migration pushate al DB remoto con successo
- [x] Fix prodotto cartesiano view project_financials (subquery pre-aggregation)
- [x] Filtri per progetto aggiunti a Pagamenti e Spese
- [x] Colonna Progetto aggiunta alla lista Pagamenti
- [x] Riepilogo finanziario su ClientShow e ProjectShow
- [x] Typecheck 0 errori, build OK

## Certezze (sessione 11)

- [x] Pulizia completata: 0 moduli Atomic CRM residui (companies, contacts, deals eliminati)
- [x] Tasks adattati come "Promemoria" (client_tasks), Notes come "Note clienti" (client_notes), Tags su clients
- [x] Navigazione aggiornata con 8 tab (+ Promemoria)
- [x] Typecheck 0 errori, build OK, 42/42 test, lint 0 nuovi errori
- [x] Migration client_tasks + client_notes + tags applicata al DB remoto

## Architectural Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-02-25 | Fork Atomic CRM come base | Stack compatibile, CRM modulare, MIT license |
| 2026-02-25 | Preservare .claude/skills/ e AGENTS.md | Guide preziose per sviluppo |
| 2026-02-25 | Nuova migration SQL anziché modificare le esistenti | Schema completamente diverso |
| 2026-02-25 | Recharts per grafici dashboard | Specifica lo richiede, gratuito |
| 2026-02-25 | RLS policy semplice auth.uid() IS NOT NULL | Single user |
| 2026-02-25 | Traduzioni inline nei componenti | Atomic CRM non usa useTranslate() |
| 2026-02-25 | Alias Vite per react-router | Compatibilità v6/v7 |
| 2026-02-25 | Audit obbligatorio a fine fase | Trovati problemi critici in fase "completata" |
| 2026-02-26 | Moduli custom in directory separate | Non modificare i moduli originali, più pulito |
| 2026-02-26 | Navigazione progressiva | Aggiungere tab man mano che i moduli vengono creati |
| 2026-02-26 | Table component per le liste | Più appropriato di CardList per dati tabulari |
| 2026-02-26 | Quotes usa Dialog modali come Deals | Pattern Kanban richiede overlay, non pagine dedicate |
| 2026-02-26 | Quote statuses come costanti locali | Fissi nel DB CHECK, non serve ConfigurationContext |
| 2026-02-26 | Niente archived_at per quotes | Status finali (saldato/rifiutato/perso) coprono il caso |
| 2026-02-26 | Dashboard aggregata | Componenti UI piccoli, dati/trasformazioni centralizzati |
| 2026-02-26 | Primary key esplicite per views | monthly_revenue e project_financials non hanno id |
| 2026-02-26 | client_tasks con FK opzionale | Promemoria possono essere generici o legati a un cliente |
| 2026-02-26 | Import module rimosso | Era per formato Atomic CRM (contacts/companies), non compatibile |
| 2026-02-26 | Sales headless (senza UI) | Tabella+trigger mantenuti per futuro multi-utente |
