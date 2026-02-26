# Progress — Gestionale Rosario Furnari

## Current Phase

🟢 Fase 2 — Moduli Core COMPLETATI. 8/8 step completati.

## Last Session

### Sessione 10 (2026-02-26)

- Completed:
  - **Dashboard finanziaria** — riscrittura completa dashboard Atomic CRM con **Recharts**
    - 4 KPI card: fatturato mese, fatturato anno, pagamenti in attesa, preventivi aperti
    - 2 grafici: andamento fatturato mensile (line, 12 mesi) + fatturato per categoria (bar orizzontale)
    - Pipeline preventivi (bar orizzontale per stato) + Top 5 clienti (anno corrente)
    - Sezione alert: pagamenti urgenti/scaduti, prossimi lavori (14 giorni), preventivi senza risposta >7 giorni
    - Mobile dashboard semplificata: KPI card (pattern dedicato, senza grafici pesanti)
    - Loading skeleton + stato errore con pulsante "Riprova"
  - **Data layer dashboard** centralizzato
    - `useDashboardData.ts` con `useGetList` su `monthly_revenue`, `payments`, `quotes`, `services`, `projects`, `clients`
    - `dashboardModel.ts` per aggregazioni KPI/grafici/pipeline/alert (view-model unico)
  - **Installato `recharts`** (`package.json` + `package-lock.json`)
  - **DataProvider Supabase aggiornato** — primary keys esplicite per views:
    - `monthly_revenue` → `["month", "category"]`
    - `project_financials` → `["project_id"]`
  - **Pulizia dashboard legacy**
    - rimossi componenti non più usati: `DealsChart`, `HotContacts`, `LatestNotes`, `DashboardActivityLog`, `DashboardStepper`, `DealsPipeline`, `TasksList`
    - mantenuti `TasksListFilter` e `TasksListEmpty` perché riusati da moduli `tasks/` e `contacts/`
  - **Fix build production** (blocco Vite/Rollup)
    - `useWatch` importato da `ra-core` causava errore runtime di bundle
    - fixato in 5 file (`projects`, `quotes`, `expenses`, `services`) con import da `react-hook-form`
  - **Verifiche**
    - `npm run typecheck` ✅
    - `npm run build` ✅
    - lint mirato dashboard/provider ✅

- Decisions:
  - Dashboard desktop con grafici + sezioni dettagliate; dashboard mobile solo KPI (più veloce e leggibile)
  - Aggregazioni in `dashboardModel.ts` per mantenere i componenti UI piccoli (<150 righe)
  - Dashboard legge dati grezzi dalle tabelle/views e calcola KPI/alert lato frontend (single-user, volume ridotto)
  - Primary key esplicite sulle views nel dataProvider per compatibilità React Admin / ra-data-postgrest

- Files created:
  - `src/components/atomic-crm/dashboard/dashboardModel.ts`
  - `src/components/atomic-crm/dashboard/useDashboardData.ts`
  - `src/components/atomic-crm/dashboard/DashboardLoading.tsx`
  - `src/components/atomic-crm/dashboard/DashboardKpiCards.tsx`
  - `src/components/atomic-crm/dashboard/DashboardRevenueTrendChart.tsx`
  - `src/components/atomic-crm/dashboard/DashboardCategoryChart.tsx`
  - `src/components/atomic-crm/dashboard/DashboardPipelineCard.tsx`
  - `src/components/atomic-crm/dashboard/DashboardTopClientsCard.tsx`
  - `src/components/atomic-crm/dashboard/DashboardAlertsCard.tsx`

- Files modified:
  - `src/components/atomic-crm/dashboard/Dashboard.tsx` (desktop dashboard Recharts)
  - `src/components/atomic-crm/dashboard/MobileDashboard.tsx` (mobile KPI-only)
  - `src/components/atomic-crm/providers/supabase/dataProvider.ts` (primary keys views)
  - `package.json` / `package-lock.json` (aggiunta `recharts`)
  - `src/components/atomic-crm/projects/ProjectInputs.tsx` (`useWatch` import fix)
  - `src/components/atomic-crm/quotes/QuoteInputs.tsx` (`useWatch` import fix)
  - `src/components/atomic-crm/expenses/ExpenseInputs.tsx` (`useWatch` import fix)
  - `src/components/atomic-crm/services/ServiceInputs.tsx` (`useWatch` import fix)
  - `src/components/atomic-crm/services/ServiceTotals.tsx` (`useWatch` import fix)

- Next action: **Pulizia moduli Atomic CRM non necessari** (Companies, Deals, Activity Log, ecc.)

### Sessione 9 (precedente)

- Date: 2026-02-26 (sessione 9)
- Completed:
  - **Modulo Preventivi (Quotes)** — Kanban 10 stati con drag-and-drop, adattamento da Deals
    - 13 file creati in `src/components/atomic-crm/quotes/`
    - Board Kanban con @hello-pangea/dnd (DragDropContext > Droppable > Draggable)
    - 10 colonne: Primo contatto → Preventivo inviato → In trattativa → Accettato → Acconto ricevuto → In lavorazione → Completato → Saldato → Rifiutato → Perso
    - Card mostra: descrizione, nome cliente (via useGetOne), tipo servizio + data evento, importo EUR
    - Dialog modali per Create/Edit/Show (pattern identico a Deals, non pagine full come altri moduli)
    - Create con reindex automatico (incrementa index dei quotes nella stessa colonna)
    - Export CSV con risoluzione FK (fetchRelatedRecords per nome cliente)
    - Filtri: ricerca testo, cliente (autocomplete), tipo servizio (select)
    - Campo "Motivo rifiuto" condizionale (visibile solo se status = rifiutato, via useWatch)
    - Scroll orizzontale per 10 colonne con min-w-[150px] per colonna
  - **Migration `20260226120000_add_quotes_index.sql`** — Aggiunta colonna `index SMALLINT DEFAULT 0` a quotes per ordinamento Kanban
  - **Migration pushata al DB remoto** con successo
  - **Tipo `Quote` aggiunto** a types.ts (14 campi incluso index)
  - **Risorsa `quotes` registrata** in CRM.tsx
  - **Tab "Preventivi" aggiunto** al Header.tsx (7 tab totali)
  - **Typecheck 0 errori, 60/60 test, lint OK**

- Decisions:
  - Quotes usa Dialog modali (come Deals) anziché pagine full (come Clienti/Progetti) — coerente con il pattern Kanban
  - Stati quotes definiti come costanti locali in quotesTypes.ts (non via ConfigurationContext) — schema DB fisso con CHECK constraint
  - Nessun meccanismo di archiviazione (archived_at) per quotes — gli stati finali (saldato, rifiutato, perso) sono semplicemente colonne nel Kanban
  - Header column usa text-xs per compattezza con 10 colonne
  - Colonna `index` necessaria per il drag-and-drop — non era nello schema originale, aggiunta via migration dedicata

- Files created:
  - `supabase/migrations/20260226120000_add_quotes_index.sql`
  - `src/components/atomic-crm/quotes/index.tsx`
  - `src/components/atomic-crm/quotes/quotesTypes.ts` (10 stati, 6 tipi servizio, label maps)
  - `src/components/atomic-crm/quotes/stages.ts` (getQuotesByStatus)
  - `src/components/atomic-crm/quotes/QuoteCard.tsx` (Draggable card)
  - `src/components/atomic-crm/quotes/QuoteColumn.tsx` (Droppable column)
  - `src/components/atomic-crm/quotes/QuoteListContent.tsx` (DragDropContext + reorder logic)
  - `src/components/atomic-crm/quotes/QuoteList.tsx` (List + filters + CSV export)
  - `src/components/atomic-crm/quotes/QuoteCreate.tsx` (Dialog + reindex)
  - `src/components/atomic-crm/quotes/QuoteEdit.tsx` (Dialog + FormToolbar)
  - `src/components/atomic-crm/quotes/QuoteShow.tsx` (Dialog + detail view)
  - `src/components/atomic-crm/quotes/QuoteInputs.tsx` (form con rejection_reason condizionale)
  - `src/components/atomic-crm/quotes/QuoteEmpty.tsx` (stato vuoto)

- Files modified:
  - `src/components/atomic-crm/types.ts` (aggiunto tipo Quote)
  - `src/components/atomic-crm/root/CRM.tsx` (risorsa quotes + import)
  - `src/components/atomic-crm/layout/Header.tsx` (7 tab: +Preventivi)

- Next action: Implementare **Dashboard** — riscrittura completa con Recharts (4 card, 2 grafici, pipeline, alert)

### Sessione 8 (precedente)

- Date: 2026-02-26 (breve, solo documentazione)
- Completed:
  - learnings.md aggiornato — 8 nuove voci dalla sessione 7
  - progress.md e architecture.md verificati

### Sessione 7

- Date: 2026-02-26
- Completed:
  - DB migration Fase 2, 5 moduli CRUD (Clienti, Progetti, Registro Lavori, Pagamenti, Spese)
  - Navigazione aggiornata, 5 risorse registrate, 6 tipi TypeScript
  - Typecheck 0 errori, 60/60 test, lint OK

## Previous Sessions

- 2026-02-25 (sessione 6): Design completo Fase 2, analisi dati Diego Caltabiano
- 2026-02-25 (sessione 5): Deploy Vercel, Edge Functions, fix CORS, fix utente auth
- 2026-02-25 (sessione 4): Audit completo, fix signup, keep-alive, Prettier
- 2026-02-25 (sessione 3): Fix stringhe inglesi (batch 2+3)
- 2026-02-25 (sessione 2): i18n Provider, traduzione ~200+ stringhe
- 2026-02-25 (sessione 1): Fork Atomic CRM, Supabase remoto, migration, RLS, views

## Next Steps

1. [x] DB migration (discount + tariffe + views)
2. [x] Modulo Clienti
3. [x] Modulo Progetti
4. [x] Modulo Registro Lavori (Services)
5. [x] Modulo Preventivi (Quotes) — Kanban 10 stati, drag-and-drop ✅ sessione 9
6. [x] Modulo Pagamenti
7. [x] Modulo Spese
8. [x] Dashboard — riscrittura completa con Recharts ✅ sessione 10

### Dopo i moduli core:
9. [ ] Pulizia moduli Atomic CRM non necessari (Companies, Tasks, Tags, Activity Log)
10. [ ] Import dati reali Diego Caltabiano (da docs/data-import-analysis.md)
11. [ ] Test visivo completo di ogni modulo
12. [ ] Deploy su Vercel e test in produzione

## Remaining Low-Priority Items

- FakeRest data generators usano `faker/locale/en_US` (solo demo mode, non produzione)
- 4 vulnerabilità npm (1 moderate, 3 high) — da valutare con `npm audit`
- 26 Vitest warnings su promise non awaited in supabaseAdapter.spec.ts (codice upstream)
- Verificare che signup sia disabilitato anche nel **Supabase Dashboard remoto**
- Edge Function `postmark` crasha (manca secrets Postmark — non prioritaria)

## Certezze (sessione 10)

- [x] Migration Fase 2 + quotes index applicate al DB remoto (3 migration custom totali)
- [x] 7 moduli core funzionanti: Clienti, Progetti, Registro Lavori, Preventivi (Kanban), Pagamenti, Spese + Dashboard
- [x] Navigazione aggiornata con 7 tab
- [x] Dashboard finanziaria implementata con Recharts (4 KPI, 2 grafici, pipeline, top clienti, alert)
- [x] Typecheck 0 errori e build produzione OK (`npm run build`)
- [x] Test 60/60 e lint completo OK (ultimo run completo: sessione 9)
- [x] Tutti i moduli CRUD seguono il pattern Atomic CRM
- [x] Modulo Preventivi segue il pattern Kanban di Deals (@hello-pangea/dnd)
- [x] Export CSV in italiano per ogni modulo (inclusi Preventivi)
- [x] Filtri con operatori postgrest per ogni lista
- [x] 7 tipi TypeScript custom: Client, Project, Service, Payment, Expense, Quote

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
| 2026-02-26 | Dashboard aggregata via `dashboardModel.ts` + `useDashboardData` | Componenti UI piccoli, dati/trasformazioni centralizzati |
| 2026-02-26 | Primary key esplicite per views dashboard nel dataProvider | `monthly_revenue` e `project_financials` non hanno `id` |
