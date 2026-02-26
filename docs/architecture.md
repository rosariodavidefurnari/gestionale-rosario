# Architecture — Gestionale Rosario Furnari

## Overview

Fork di Atomic CRM personalizzato per gestire l'attività professionale
di fotografo, videomaker e web developer. Single-user, interfaccia italiana.

## Stato Infrastruttura (verificato sessione 10)

### Certezze — Audit superato

| Componente | Stato | Verificato |
|------------|-------|------------|
| Schema DB (8 tabelle + 2 views) | Deployed e conforme alla specifica | migration review |
| Migration Fase 2 (discount + tariffe) | Applicata al DB remoto | `npx supabase db push` |
| Migration quotes index | Applicata al DB remoto | sessione 9 |
| Dashboard Fase 2 (Recharts) | Implementata (desktop + mobile KPI) | sessione 10 |
| RLS policies | Attive su tutte le tabelle | audit manuale |
| Signup pubblico | DISABILITATO (config.toml) | sessione 4 |
| Keep-alive workflow | Attivo, testato con successo (HTTP 200) | `gh workflow run` |
| GitHub secrets | SUPABASE_URL + SUPABASE_KEY configurati | `gh secret list` |
| Localizzazione IT | Completa su ~70+ file, 3 livelli | audit sessione 4 |
| Typecheck | 0 errori | sessione 10 |
| Build produzione (`npm run build`) | OK | sessione 10 |
| Test | 60/60 passati | sessione 9 |
| Lint + Prettier | 0 errori | sessione 9 |
| Deploy Vercel | gestionale-rosario.vercel.app | sessione 5 |
| Edge Functions | users, update_password, merge_contacts deployate | CORS OPTIONS 204 |
| Supabase secrets | SB_SECRET_KEY impostato su remoto | sessione 5 |
| Utente auth | Metadata + sales record configurati | sessione 5 |

### Cose ancora da verificare manualmente

- Signup disabilitato nel **Supabase Dashboard remoto** (non solo config.toml locale)
- npm audit: 4 vulnerabilità (1 moderate, 3 high) — da valutare
- Edge Function `postmark` non funzionante (manca secrets Postmark — non prioritaria)

## Localizzazione

L'interfaccia è **completamente tradotta in italiano**. Tre livelli:

1. **i18nProvider** (`src/components/atomic-crm/root/i18nProvider.tsx`) — stringhe
   framework ra-core (bottoni, validazione, paginazione) tramite ra-i18n-polyglot
   con traduzioni inline.

2. **Stringhe hardcoded** — ~70+ file componente con stringhe UI in italiano nel JSX.

3. **Label form input** — Tutti gli input hanno `label="..."` esplicita in italiano.

### Convenzioni di traduzione
- Valori DB in inglese (produzione_tv, in_corso, ricevuto, primo_contatto, ecc.)
- Label UI in italiano
- Valute: EUR, locale it-IT
- Date: date-fns con locale `it`
- Ogni nuovo input DEVE avere `label` esplicita in italiano

## Database Schema

### Tabelle custom (da specifica)

| Tabella | Scopo | RLS | Colonne |
|---------|-------|-----|---------|
| clients | Anagrafica clienti | auth.uid() IS NOT NULL | 11 col, 2 CHECK |
| projects | Progetti/programmi | auth.uid() IS NOT NULL | 12 col, 3 CHECK |
| services | Registro lavori (cuore) | auth.uid() IS NOT NULL | 14 col (incl. discount), 1 CHECK |
| quotes | Preventivi + pipeline Kanban | auth.uid() IS NOT NULL | 13 col (incl. index), 1 CHECK (10 stati) |
| payments | Tracking pagamenti | auth.uid() IS NOT NULL | 12 col, 3 CHECK |
| expenses | Spese e km | auth.uid() IS NOT NULL | 11 col, 1 CHECK |
| settings | Configurazione | auth.uid() IS NOT NULL | 3 col (key-value) |
| keep_alive | Heartbeat free tier | SELECT public | 3 col |

### Quotes — 10 stati pipeline

```
primo_contatto → preventivo_inviato → in_trattativa → accettato →
acconto_ricevuto → in_lavorazione → completato → saldato → rifiutato / perso
```

La colonna `index` (SMALLINT) gestisce l'ordinamento delle card dentro ogni colonna Kanban.
Nessun campo `archived_at` — gli stati finali sono colonne visibili nel board.

### Settings (aggiornate Fase 2 — sessione 7)
- `default_km_rate`: 0.19
- `default_fee_shooting`: **233** (tariffa 2025/2026)
- `default_fee_editing_standard`: **311** (Montaggio GS)
- `default_fee_spot`: **312** (tariffa flat, riprese+montaggio)
- `default_fee_editing_short`: **156** (Montaggio VIV/BTF)
- `currency`: EUR

### Views (aggiornate Fase 2 — includono discount)

| View | Scopo |
|------|-------|
| project_financials | Riepilogo finanziario per progetto (fees - discount, km, paid, balance) |
| monthly_revenue | Fatturato mensile per categoria (fees - discount) |

Per l'uso frontend con React Admin/Supabase provider, le views dashboard hanno
primary key esplicite nel dataProvider:
- `monthly_revenue` → PK composita `month + category`
- `project_financials` → PK `project_id`

### Migrations

| Migration | Scopo |
|-----------|-------|
| `20260225180000_gestionale_schema.sql` | Schema iniziale (8 tabelle, RLS, views, dati iniziali) |
| `20260225230028_fase2_discount_tariffe.sql` | Colonna discount, tariffe aggiornate, views fix |
| `20260226120000_add_quotes_index.sql` | Colonna index su quotes per ordinamento Kanban |

## Moduli Frontend (sessione 10)

### Moduli IMPLEMENTATI

| Modulo | Directory | File | Tipo | Stato |
|--------|-----------|------|------|-------|
| **Clienti** | `src/components/atomic-crm/clients/` | 8 file | CRUD (Table) | Completo |
| **Progetti** | `src/components/atomic-crm/projects/` | 8 file | CRUD (Table) | Completo |
| **Registro Lavori** | `src/components/atomic-crm/services/` | 9 file | CRUD (Table) | Completo |
| **Preventivi** | `src/components/atomic-crm/quotes/` | 13 file | Kanban drag-and-drop | Completo |
| **Pagamenti** | `src/components/atomic-crm/payments/` | 8 file | CRUD (Table) | Completo |
| **Spese** | `src/components/atomic-crm/expenses/` | 8 file | CRUD (Table) | Completo |
| **Dashboard** | `src/components/atomic-crm/dashboard/` | 14 file | Recharts + KPI + alert | Completo |

### Struttura moduli CRUD (Clienti, Progetti, Servizi, Pagamenti, Spese)

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

### Struttura modulo Kanban (Preventivi)

```
src/components/atomic-crm/quotes/
├── index.tsx              # Export (list, recordRepresentation)
├── quotesTypes.ts         # 10 stati, 6 tipi servizio, label maps
├── stages.ts              # getQuotesByStatus (raggruppamento per colonne)
├── QuoteList.tsx          # List + filtri + CSV export + routing dialogs
├── QuoteListContent.tsx   # DragDropContext + onDragEnd + reorder logic
├── QuoteColumn.tsx        # Droppable column con totale EUR
├── QuoteCard.tsx          # Draggable card (descrizione, cliente, tipo, importo)
├── QuoteCreate.tsx        # Dialog creazione + reindex automatico
├── QuoteEdit.tsx          # Dialog modifica con DeleteButton
├── QuoteShow.tsx          # Dialog dettaglio con info fields
├── QuoteInputs.tsx        # Form condiviso (rejection_reason condizionale)
└── QuoteEmpty.tsx         # Stato vuoto con pulsante crea
```

**Pattern Kanban (da Deals):**
- `DragDropContext` wrappa il board, `onDragEnd` gestisce lo spostamento
- Ogni colonna è un `Droppable` con droppableId = status value
- Ogni card è un `Draggable` con draggableId = quote.id
- Update locale sincrono (optimistic UI) + persistenza asincrona + refetch
- Reorder gestisce sia spostamenti intra-colonna che cross-colonna
- Al Create, tutti i quotes nella stessa colonna vengono reindexati

### Moduli DA IMPLEMENTARE

| Modulo | Tipo | Note |
|--------|------|------|
| Nessuno | — | Moduli core Fase 2 completati (8/8) |

### Struttura Dashboard (Recharts)

```
src/components/atomic-crm/dashboard/
├── Dashboard.tsx                  # Composizione desktop (KPI + charts + pipeline/top + alert)
├── MobileDashboard.tsx            # Dashboard mobile (KPI-only)
├── useDashboardData.ts            # useGetList multipli (views + tabelle)
├── dashboardModel.ts              # Aggregazioni KPI/grafici/pipeline/alert
├── DashboardKpiCards.tsx          # 4 KPI cards
├── DashboardRevenueTrendChart.tsx # Line chart (12 mesi)
├── DashboardCategoryChart.tsx     # Bar chart orizzontale per categoria
├── DashboardPipelineCard.tsx      # Pipeline preventivi per stato
├── DashboardTopClientsCard.tsx    # Top 5 clienti (anno corrente)
├── DashboardAlertsCard.tsx        # Pagamenti / prossimi lavori / preventivi senza risposta
├── DashboardLoading.tsx           # Skeleton desktop + mobile
├── Welcome.tsx                    # Card demo (riusata)
├── TasksListFilter.tsx            # Helper legacy riusato da tasks/contacts
└── TasksListEmpty.tsx             # Helper legacy riusato da tasks/contacts
```

**Fonti dati dashboard:**
- `monthly_revenue` (KPI fatturato mese/anno, line chart, category chart, km mese)
- `quotes` (KPI preventivi aperti, pipeline, preventivi senza risposta)
- `payments` (KPI pagamenti in attesa, alert scadenze/scaduti)
- `services` + `projects` + `clients` (prossimi lavori, top clienti)

### Moduli Atomic CRM da rimuovere/valutare

| Modulo | Decisione |
|--------|-----------|
| Companies | RIMUOVERE |
| Tasks | Probabilmente rimuovere |
| Tags | Probabilmente rimuovere |
| Activity Log | Probabilmente rimuovere |

## Navigazione (sessione 10)

```
Bacheca | Clienti | Progetti | Registro Lavori | Preventivi | Pagamenti | Spese
```

Menu utente (dropdown): Profilo | Utenti | Impostazioni | Importa dati

## Risorse registrate in CRM.tsx

```
clients, projects, services, payments,      ← NUOVE (Fase 2, CRUD)
expenses, quotes                             ← NUOVE (Fase 2, Kanban)
deals, contacts, companies, contact_notes,   ← Atomic CRM (da rimuovere/adattare)
deal_notes, tasks, sales, tags
```

## Tipi TypeScript (types.ts)

```
Client, Project, Service, Payment,           ← NUOVI (Fase 2, CRUD)
Expense, Quote                               ← NUOVI (Fase 2, Quote ha campo index)
Contact, Company, Deal, ContactNote,         ← Atomic CRM originali
DealNote, Tag, Task, Sale, Activity
```

## Authentication

- Method: Supabase Auth, email/password
- User: rosariodavide.furnari@gmail.com (unico)
- Signup pubblico: DISABILITATO in config.toml (auth + email + sms)
- API Keys: VITE_SB_PUBLISHABLE_KEY (formato sb_publishable_...)

## Supabase Config

- Project ID locale: `gestionale-rosario`
- Progetto remoto: `qvdmzhyzpyaveniirsmo.supabase.co`
- Keep-alive: GitHub Actions, lunedì e giovedì 08:00 UTC
- GitHub secrets: SUPABASE_URL + SUPABASE_KEY configurati
- Edge Function secrets: SB_SECRET_KEY configurato su remoto

## Deployment

- **Hosting**: Vercel (gestionale-rosario.vercel.app)
- **Auto-deploy**: Vercel collegato al repo GitHub, deploya su ogni push a main
- **deploy.yml**: disabilitato auto-trigger, solo manual dispatch

## Pages Map

```
/login          → Login (unica pagina pubblica)
/               → Dashboard finanziaria (Recharts: KPI, grafici, pipeline, alert) ✅
/clients        → Lista clienti ✅
/clients/:id    → Scheda cliente ✅
/projects       → Lista progetti ✅
/projects/:id   → Dettaglio progetto ✅
/services       → Registro lavori ✅
/services/:id   → Dettaglio servizio ✅
/quotes         → Pipeline preventivi (Kanban 10 stati) ✅
/quotes/create  → Dialog creazione preventivo ✅
/quotes/:id     → Dialog modifica preventivo ✅
/quotes/:id/show → Dialog dettaglio preventivo ✅
/payments       → Lista pagamenti ✅
/payments/:id   → Dettaglio pagamento ✅
/expenses       → Spese e km ✅
/expenses/:id   → Dettaglio spesa ✅
/settings       → Impostazioni (tariffe default)
/profile        → Profilo utente
```

## Documenti design

- `docs/design-fase2.md` — Wireframe e design visivo di ogni modulo
- `docs/data-import-analysis.md` — Analisi dati reali da file Numbers di Diego Caltabiano
