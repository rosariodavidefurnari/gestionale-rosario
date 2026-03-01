# Architecture — Gestionale Rosario Furnari

## Overview

Fork di Atomic CRM personalizzato per gestire l'attività professionale
di fotografo, videomaker e web developer. Single-user, interfaccia italiana.

## Continuita'

Per riprendere correttamente il progetto in una nuova chat o sessione, i file
di riferimento minimi non sono solo questa architettura generale.

Leggere sempre anche:

- `docs/historical-analytics-handoff.md`
- `docs/development-continuity-map.md`
- `docs/historical-analytics-backlog.md`
- `docs/contacts-client-project-architecture.md`

Regola pratica:

- se una modifica introduce una nuova regola configurabile o cambia un default
  condiviso, va aggiornata anche `Impostazioni`
- se una modifica e' solo strutturale/read-only, `Impostazioni` non va toccata
  ma la motivazione va lasciata nei docs di continuita'

## Stato Infrastruttura (verificato sessione 17, aggiornato)

### Certezze — Audit superato

| Componente | Stato | Verificato |
|------------|-------|------------|
| Schema DB (8 tabelle + 2 views + 2 tabelle tasks/notes) | Deployed e conforme | migration review |
| Migration Fase 2 (discount + tariffe) | Applicata al DB remoto | `npx supabase db push` |
| Migration quotes index | Applicata al DB remoto | sessione 9 |
| Migration client_tasks + client_notes + tags | Applicata al DB remoto | sessione 11 |
| Import dati Diego Caltabiano (84 + 40 km + 3 split) | Applicata al DB remoto | sessione 12 |
| Riallocazione pagamenti Diego (DELETE 10 + CREATE 11) | Applicata al DB remoto | sessione 13 |
| Fix view project_financials (Cartesian product) | Applicata al DB remoto | sessione 12 |
| Filtri progetto su Pagamenti/Spese | Implementati | sessione 12 |
| Ricerca progetto (ilike) | Fix `q` → `name@ilike` | sessione 13 |
| Bilanci verificati: tutti i progetti Diego a 0 o pending | Confermato | sessione 13 |
| Riepilogo finanziario su ClientShow/ProjectShow | Implementato | sessione 12 |
| Dashboard Fase 2 (Recharts) | Implementata (desktop + mobile KPI) | sessione 10 |
| Pulizia moduli Atomic CRM | Completata (companies, contacts, deals eliminati) | sessione 11 |
| Tasks adattati (Promemoria) | Funzionanti con client_tasks | sessione 11 |
| Notes clienti | Funzionanti con client_notes | sessione 11 |
| Tags clienti | Funzionanti (BIGINT[] su clients) | sessione 11 |
| RLS policies | Attive su tutte le tabelle | audit manuale |
| Signup pubblico | DISABILITATO (config.toml) | sessione 4 |
| Keep-alive workflow | Attivo, testato con successo (HTTP 200) | `gh workflow run` |
| Localizzazione IT | Completa su ~70+ file, 3 livelli | audit sessione 4 |
| DateTime Range Support (all_day pattern) | Implementato su 4 moduli | sessione 16 |
| Simulatore Fiscale + KPI Salute Aziendale | Implementato | sessione 17 |
| Mobile UX (card lists, Sheet filters, MobileBackButton) | Tutti i moduli CRUD | sessione 77 |
| Login/Signup branding (foto utente, maschera circolare) | Implementato | sessione 77 |
| Auth init bypass (single-user hardcoded) | Implementato | sessione 77 |
| Navigazione per anno Dashboard | Implementata | sessione 18 |
| Colori semantici Dashboard (success/warning badge + progress) | Implementati | sessione 18 |
| Typecheck | 0 errori | sessione 18 |
| Build produzione (`npm run build`) | OK | sessione 18 |
| Test | 42/42 passati | sessione 18 |
| Lint | 0 nuovi errori | sessione 11 |
| Deploy Vercel | gestionale-rosario.vercel.app | sessione 5 |

### Cose ancora da verificare manualmente

- Signup disabilitato nel **Supabase Dashboard remoto** (non solo config.toml locale)
- npm audit: 4 vulnerabilità (1 moderate, 3 high) — da valutare
- Edge Function inbound `postmark` rimossa dal progetto: comunicazioni future su
  `Gmail` outbound cliente e `CallMeBot` per alert interni prioritari
- 3 errori lint pre-esistenti (useGetOne condizionale in ExpenseShow/PaymentShow)

## Database Schema

### Tabelle custom (da specifica)

| Tabella | Scopo | RLS | Colonne |
|---------|-------|-----|---------|
| clients | Anagrafica clienti | auth.uid() IS NOT NULL | 12 col (incl. tags BIGINT[]), 2 CHECK |
| projects | Progetti/programmi | auth.uid() IS NOT NULL | 13 col (+all_day), start_date/end_date TIMESTAMPTZ, 3 CHECK |
| services | Registro lavori (cuore) | auth.uid() IS NOT NULL | 16 col (+service_end, +all_day, service_date TIMESTAMPTZ), no CHECK service_type (dinamico) |
| quotes | Preventivi + pipeline Kanban | auth.uid() IS NOT NULL | 15 col (+event_start, +event_end, +all_day, -event_date), 1 CHECK (10 stati), no CHECK service_type (dinamico) |
| payments | Tracking pagamenti | auth.uid() IS NOT NULL | 12 col, 3 CHECK + tipo rimborso |
| expenses | Spese e km | auth.uid() IS NOT NULL | 11 col, 1 CHECK + tipo credito_ricevuto |
| client_tasks | Promemoria (opzionalmente legati a un cliente) | auth.uid() IS NOT NULL | 9 col (+all_day), due_date TIMESTAMPTZ, FK opzionale |
| client_notes | Note clienti (con allegati) | auth.uid() IS NOT NULL | 7 col, FK obbligatoria |
| settings | Configurazione | auth.uid() IS NOT NULL | 3 col (key-value) |
| keep_alive | Heartbeat free tier | SELECT public | 3 col |

### Quotes — 10 stati pipeline

```
primo_contatto → preventivo_inviato → in_trattativa → accettato →
acconto_ricevuto → in_lavorazione → completato → saldato → rifiutato / perso
```

### Settings (aggiornate Fase 2)
- `default_km_rate`: 0.19
- `default_fee_shooting`: **233** (tariffa 2025/2026)
- `default_fee_editing_standard`: **311** (Montaggio GS)
- `default_fee_spot`: **312** (tariffa flat, riprese+montaggio)
- `default_fee_editing_short`: **156** (Montaggio VIV/BTF)
- `currency`: EUR

### Views

| View | Scopo |
|------|-------|
| project_financials | Riepilogo finanziario per progetto (fees - discount, km, paid, balance) |
| monthly_revenue | Fatturato mensile per categoria (fees - discount) |

PK esplicite nel dataProvider:
- `monthly_revenue` → PK composita `month + category`
- `project_financials` → PK `project_id`

### Migrations

| Migration | Scopo |
|-----------|-------|
| `20260225180000_gestionale_schema.sql` | Schema iniziale (8 tabelle, RLS, views, dati iniziali) |
| `20260225230028_fase2_discount_tariffe.sql` | Colonna discount, tariffe aggiornate, views fix |
| `20260226120000_add_quotes_index.sql` | Colonna index su quotes per ordinamento Kanban |
| `20260226200000_client_tasks_notes_tags.sql` | Tabelle client_tasks, client_notes, colonna tags su clients |
| `20260227100000_import_diego_caltabiano.sql` | Import dati reali: 1 client + 9 projects + 64 services + 7 payments + 3 expenses |
| `20260227110000_import_diego_km_expenses.sql` | 40 spese spostamento_km (una per servizio con km > 0) |
| `20260227120000_import_diego_pending_payment.sql` | Pagamento pendente iniziale €7,152.10 |
| `20260227130000_import_diego_split_payments.sql` | Split pagamento pendente per progetto + assign project_id |
| `20260227140000_fix_project_financials_view.sql` | Fix prodotto cartesiano nella view (subquery pre-aggregation) |
| `20260227150000_assign_invoice_refs.sql` | Assegna invoice_ref (FPR) ai pagamenti ricevuti |
| `20260227160000_import_diego_nisseno.sql` | Import 4 puntate Nisseno + km expenses + pagamento |
| `20260227170000_fix_nisseno_payment_date.sql` | Fix data pagamento Nisseno (29/12/2025) |
| `20260227180000_fix_nisseno_fee_breakdown.sql` | Fix breakdown compensi Nisseno (shooting+editing separati) |
| `20260227190000_fix_missing_invoice_refs.sql` | Fix 2 pagamenti senza invoice_ref → FPR 6/25 |
| `20260227200000_complete_btf_cantina_tre_santi.sql` | Completa 2 servizi BTF non fatturati (vendemmia + puntata finale) |
| `20260227210000_fix_payment_types.sql` | Fix payment_type acconto → saldo per 2 pagamenti che completano fattura |
| `20260227220000_btf_extra_expenses_and_payment.sql` | Aggiunge 2 expense km + 1 payment in_attesa per BTF non fatturato |
| `20260227205707_reallocate_diego_payments.sql` | Riallocazione completa: DELETE 10 errati + CREATE 11 corretti per progetto |
| `20260227230000_add_expenses_to_project_financials.sql` | Aggiunge total_expenses dalla tabella expenses alla view project_financials |
| `20260228000000_audit_constraints.sql` | Audit sessione 14: UNIQUE, CHECK >= 0, tipi credito_ricevuto + rimborso, iPhone migrato |
| `20260227220805_payment_date_not_null.sql` | payment_date NOT NULL (safety fill + ALTER COLUMN) |
| `20260227223414_quote_rejection_reason_required.sql` | CHECK rejection_reason required when status=rifiutato |
| `20260227224137_date_range_checks.sql` | CHECK end_date >= start_date (projects), response_date >= sent_date (quotes) |
| `20260227224448_add_updated_at_columns.sql` | updated_at + trigger set_updated_at() su services, payments, expenses |
| `20260227224515_unique_project_client_name.sql` | UNIQUE (client_id, name) su projects |
| `20260227230519_add_quotes_service_type_check.sql` | CHECK su quotes.service_type (poi droppato) |
| `20260227231714_drop_service_type_checks.sql` | DROP CHECK su quotes + services service_type (tipi ora dinamici) |
| `20260228120000_datetime_range_support.sql` | DateTime Range Support: DATE→TIMESTAMPTZ, event_date→event_start/end, all_day su 4 tabelle |

## Moduli Frontend (sessione 11)

### Moduli IMPLEMENTATI

| Modulo | Directory | File | Tipo | Stato |
|--------|-----------|------|------|-------|
| **Clienti** | `clients/` | 11 file | CRUD (Table) + Tags/Notes/Tasks | Completo |
| **Progetti** | `projects/` | 8 file | CRUD (Table) | Completo |
| **Registro Lavori** | `services/` | 9 file | CRUD (Table) | Completo |
| **Preventivi** | `quotes/` | 13 file | Kanban drag-and-drop | Completo |
| **Pagamenti** | `payments/` | 8 file | CRUD (Table) | Completo |
| **Spese** | `expenses/` | 8 file | CRUD (Table) | Completo |
| **Promemoria** | `tasks/` | 11 file | Lista con filtri temporali | Completo |
| **Tags** | `tags/` | 4 file | CRUD + array su clients | Completo |
| **Dashboard** | `dashboard/` | 19 file | Recharts + KPI + alert + fiscale | Completo |

### Struttura moduli CRUD

```
src/components/atomic-crm/[modulo]/
├── index.tsx              # Export (list, show, edit, create, recordRepresentation)
├── [Modulo]List.tsx       # Lista con filtri, export CSV, sort
├── [Modulo]ListContent.tsx # Rendering tabella con Table component
├── [Modulo]ListFilter.tsx # Sidebar filtri con badge toggle
├── [Modulo]Create.tsx     # CreateBase + Form + Inputs + FormToolbar
├── [Modulo]Edit.tsx       # EditBase + Form + Inputs + FormToolbar
├── [Modulo]Show.tsx       # ShowBase + dettaglio record
├── [Modulo]Inputs.tsx     # Campi form condivisi Create/Edit
└── [modulo]Types.ts       # Choices e labels per select/badge
```

### Struttura Promemoria (Tasks)

```
src/components/atomic-crm/tasks/
├── TasksList.tsx          # Pagina lista desktop
├── MobileTasksList.tsx    # Pagina lista mobile
├── TasksListContent.tsx   # Composizione filtri temporali
├── Task.tsx               # Riga singola task con checkbox done
├── AddTask.tsx            # Dialog creazione (con selectClient opzionale)
├── TaskFormContent.tsx    # Form fields (testo, tipo, data, cliente)
├── TaskCreateSheet.tsx    # Sheet mobile creazione
├── TaskEdit.tsx           # Pagina edit
├── TaskEditSheet.tsx      # Sheet mobile edit
├── TasksIterator.tsx      # Lista task con ordinamento
└── taskFilters.ts         # Filtri: overdue, today, tomorrow, thisWeek, later
```

Risorsa: `client_tasks` (UUID PK, FK opzionale a clients)

### Struttura Note Clienti

Integrato nella scheda cliente (ClientShow):
- `clients/ClientNotesSection.tsx` — lista + inline create
- `clients/ClientNoteItem.tsx` — singola nota con edit/delete
- `clients/ClientTasksSection.tsx` — promemoria del cliente

Risorsa: `client_notes` (UUID PK, FK obbligatoria a clients)

### Struttura Tags

```
src/components/atomic-crm/tags/
├── ClientTagsList.tsx     # Display tags (ReferenceArrayField)
├── ClientTagsListEdit.tsx # Gestione tags (add/remove/create)
├── TagsList.tsx           # Lista tags base
└── colors.ts              # Palette colori
```

### Dashboard (Recharts + Fiscale)

```
src/components/atomic-crm/dashboard/
├── Dashboard.tsx                       # Desktop (KPI + charts + pipeline + alert + fiscale + year nav)
├── MobileDashboard.tsx                 # Mobile (KPI + fiscale compatti)
├── useDashboardData.ts                 # useGetList multipli + expenses + fiscalConfig (year param)
├── dashboardModel.ts                   # Aggregazioni KPI/grafici/pipeline/alert + fiscal (year-aware)
├── fiscalModel.ts                      # Logica pura calcoli fiscali regime forfettario
├── DashboardKpiCards.tsx               # 4 KPI cards fatturato/pagamenti
├── DashboardFiscalKpis.tsx             # 4 KPI cards fiscali (netto, tasse, accantonamento, tetto)
├── DashboardAtecoChart.tsx             # Bar chart orizzontale fatturato vs reddito per ATECO
├── DashboardDeadlinesCard.tsx          # Scadenze fiscali con countdown ed espansione dettagli
├── DashboardBusinessHealthCard.tsx     # Salute aziendale (conversione, DSO, concentrazione, margini)
├── DashboardRevenueTrendChart.tsx      # Line chart (12 mesi)
├── DashboardCategoryChart.tsx          # Bar chart per categoria
├── DashboardPipelineCard.tsx           # Pipeline preventivi
├── DashboardTopClientsCard.tsx         # Top 5 clienti
├── DashboardAlertsCard.tsx             # Alert urgenti
├── DashboardLoading.tsx                # Skeleton loading
├── TasksListFilter.tsx                 # Helper filtro task per dashboard
└── TasksListEmpty.tsx                  # Helper stato vuoto task
```

## Navigazione (sessione 11)

```
Bacheca | Clienti | Progetti | Registro Lavori | Preventivi | Pagamenti | Spese | Promemoria
```

Menu utente (dropdown): Profilo | Impostazioni

Mobile: Inizio | Clienti | [+] | Promemoria | Altro

## Risorse registrate in CRM.tsx

```
clients, projects, services, payments,     ← CRUD con pagine
expenses, quotes                           ← CRUD/Kanban con pagine
client_tasks                               ← Lista con pagina desktop + mobile
client_notes, sales, tags                  ← Headless (senza pagina dedicata)
```

### Utility condivise (misc/)

| File | Scopo |
|------|-------|
| `misc/formatDateRange.ts` | `formatDateRange(start, end, allDay)` e `formatDateLong(start, end, allDay)` — formattazione date coerente con supporto range e all_day |
| `misc/ErrorMessage.tsx` | Componente errore riutilizzabile con AlertCircle |
| `misc/CreateSheet.tsx` | Sheet mobile per creazione record |
| `misc/FormToolbar.tsx` | Toolbar form con Save/Delete |

## Tipi TypeScript (types.ts)

```
Client, Project, Service, Payment,         ← CRUD
Expense, Quote                             ← CRUD/Kanban
ClientTask, ClientNote                     ← Tasks/Notes adattati
Tag, Sale, SalesFormData, SignUpData        ← Infrastruttura
RAFile, AttachmentNote                     ← File/allegati
LabeledValue, NoteStatus                  ← Config
FiscalConfig, FiscalTaxProfile             ← Fiscale
```

## Authentication

- Method: Supabase Auth, email/password
- User: rosariodavide.furnari@gmail.com (unico)
- Signup pubblico: DISABILITATO in config.toml
- API Keys: VITE_SB_PUBLISHABLE_KEY (formato sb_publishable_...)

## Supabase Config

- Progetto remoto: `qvdmzhyzpyaveniirsmo.supabase.co`
- Keep-alive: GitHub Actions, lunedì e giovedì 08:00 UTC
- Edge Function secrets: SB_SECRET_KEY configurato su remoto

## Deployment

- **Hosting**: Vercel (gestionale-rosario.vercel.app)
- **Auto-deploy**: Vercel collegato al repo GitHub, deploya su ogni push a main

## Pages Map

```
/login          → Login (unica pagina pubblica)
/               → Dashboard finanziaria (Recharts: KPI, grafici, pipeline, alert, navigazione anno)
/clients        → Lista clienti
/clients/:id    → Scheda cliente (dettagli + tags + note + promemoria)
/projects       → Lista progetti
/projects/:id   → Dettaglio progetto
/services       → Registro lavori
/services/:id   → Dettaglio servizio
/quotes         → Pipeline preventivi (Kanban 10 stati)
/payments       → Lista pagamenti
/payments/:id   → Dettaglio pagamento
/expenses       → Spese e km
/expenses/:id   → Dettaglio spesa
/client_tasks   → Lista promemoria (filtri: scaduti, oggi, domani, settimana, più avanti)
/settings       → Impostazioni (Marchio, Tipi preventivo, Tipi servizio, Note, Attività, Fiscale)
/profile        → Profilo utente
```
