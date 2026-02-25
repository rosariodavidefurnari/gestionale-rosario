# Architecture — Gestionale Rosario Furnari

## Overview

Fork di Atomic CRM personalizzato per gestire l'attività professionale
di fotografo, videomaker e web developer. Single-user, interfaccia italiana.

## Stato Localizzazione

L'interfaccia è **completamente tradotta in italiano**. Due approcci coesistono:

1. **i18nProvider** (`src/components/atomic-crm/root/i18nProvider.tsx`) — gestisce le
   stringhe framework di ra-core (bottoni, validazione, paginazione, ecc.) tramite
   ra-i18n-polyglot con traduzioni inline.

2. **Stringhe hardcoded** — ~40 file componente hanno le stringhe UI direttamente in
   italiano nel JSX (Atomic CRM non usa useTranslate() nei componenti).

### File i18n chiave
- `src/components/atomic-crm/root/i18nProvider.tsx` — Provider con traduzioni inline
- `patches/ra-core+5.14.2.patch` — Fix per React Router v7 compatibility

### Convenzioni di traduzione
- Valori DB in inglese (Work/Home/Other, hot/warm/cold, ecc.)
- Label UI in italiano
- Valute: EUR, locale it-IT
- Date: date-fns con locale `it`

## Database Schema

### Tabelle nuove (da specifica)

| Tabella | Scopo | RLS |
|---------|-------|-----|
| clients | Anagrafica clienti | auth.uid() IS NOT NULL |
| projects | Progetti/programmi (contenitori logici) | auth.uid() IS NOT NULL |
| services | Registro lavori (cuore del gestionale) | auth.uid() IS NOT NULL |
| quotes | Preventivi + pipeline vendita | auth.uid() IS NOT NULL |
| payments | Tracking pagamenti | auth.uid() IS NOT NULL |
| expenses | Spese e km | auth.uid() IS NOT NULL |
| settings | Configurazione (tariffa km, ecc.) | auth.uid() IS NOT NULL |
| keep_alive | Heartbeat per evitare sospensione free tier | SELECT public |

### Views

| View | Scopo |
|------|-------|
| project_financials | Riepilogo finanziario per progetto |
| monthly_revenue | Fatturato mensile per categoria |

### Tabelle Atomic CRM esistenti (da valutare)

| Tabella | Mapping | Azione |
|---------|---------|--------|
| contacts | → clients | Sostituire con schema custom |
| companies | — | Rimuovere (non serve) |
| deals | → quotes | Sostituire con schema custom |
| tasks | — | Valutare se mantenere |
| sales | — | Semplificare (single user) |
| tags | — | Mantenere per categorizzazione |
| configuration | — | Mantenere per config CRM |

## Authentication

- Method: Supabase Auth, email/password
- User: rosariodavide.furnari@gmail.com (unico)
- Signup pubblico: DISABILITATO
- Protected routes: tutto tranne /login
- API Keys: VITE_SB_PUBLISHABLE_KEY (nuovo formato sb_publishable_...)

## Routing & React Router

### Compatibilità v6/v7
- Progetto usa `react-router@7`, ra-core dipende da `react-router-dom@6`
- Risolto con alias Vite in `vite.config.ts` e `vite.demo.config.ts`:
  ```ts
  "react-router-dom": path.resolve(__dirname, "node_modules/react-router")
  ```
- Patch-package (`patches/ra-core+5.14.2.patch`): flatten arrays in CoreAdminRoutes.js
- Script postinstall in package.json: `npx patch-package`

## Pages Map

```
/login          → Login (unica pagina pubblica)
/               → Dashboard (cards, grafici, alert)
/clients        → Lista clienti
/clients/:id    → Scheda cliente
/projects       → Lista progetti
/projects/:id   → Dettaglio progetto
/services       → Registro lavori (tabella filtrabile)
/quotes         → Pipeline preventivi (Kanban + lista)
/payments       → Lista pagamenti
/expenses       → Spese e km
/settings       → Impostazioni (tariffe default)
/profile        → Profilo utente
```

## Component Tree (target)

```
App.tsx
└── CRM (title="Gestionale Rosario Furnari")
    ├── Dashboard
    │   ├── RevenueCards
    │   ├── MonthlyRevenueChart (Recharts)
    │   ├── CategoryRevenueChart (Recharts)
    │   ├── PipelineOverview
    │   ├── TopClients
    │   └── AlertsSection
    ├── clients/ (adattato da contacts/)
    ├── projects/ (nuovo)
    ├── services/ (nuovo — registro lavori)
    ├── quotes/ (adattato da deals/)
    ├── payments/ (nuovo)
    ├── expenses/ (nuovo)
    └── settings/ (adattato)
```

## File tradotti (localizzazione IT)

### Dashboard
- Welcome.tsx, DashboardStepper.tsx, LatestNotes.tsx, HotContacts.tsx
- DealsChart.tsx, TasksList.tsx, DashboardActivityLog.tsx, DealsPipeline.tsx
- TasksListEmpty.tsx

### Contacts
- ContactShow.tsx, ContactAside.tsx, ContactInputs.tsx, ContactListFilter.tsx
- ContactBackgroundInfo.tsx, ContactPersonalInfo.tsx, ContactEmpty.tsx
- ContactMergeButton.tsx, ContactImportButton.tsx, ExportVCardButton.tsx
- TagsListEdit.tsx, ContactListContent.tsx

### Deals
- DealShow.tsx, DealArchivedList.tsx, DealEmpty.tsx, DealInputs.tsx
- DealList.tsx, OnlyMineInput.tsx, ContactList.tsx

### Companies
- CompanyShow.tsx, CompanyAside.tsx, CompanyInputs.tsx, CompanyEmpty.tsx
- CompanyList.tsx, CompanyListFilter.tsx

### Notes
- Note.tsx, NoteCreate.tsx, NoteCreateSheet.tsx, NoteInputs.tsx

### Tasks
- AddTask.tsx, TaskEdit.tsx, TaskFormContent.tsx

### Tags
- TagDialog.tsx, TagCreateModal.tsx, TagEditModal.tsx

### Settings & Profile
- SettingsPage.tsx, ProfilePage.tsx

### Sales (utenti)
- SalesList.tsx, SalesCreate.tsx, SalesEdit.tsx

### Login
- LoginPage.tsx, SignupPage.tsx, ConfirmationRequired.tsx

### Import / Misc
- ImportPage.tsx, ImportFromJsonButton.tsx, ImageEditorField.tsx
- ContactOption.tsx, CreateSheet.tsx, ListNoResults.tsx

### Activity Log
- ActivityLogContactCreated.tsx, ActivityLogDealCreated.tsx
- ActivityLogCompanyCreated.tsx, ActivityLogContactNoteCreated.tsx
- ActivityLogDealNoteCreated.tsx

### Layout
- Header.tsx, MobileNavigation.tsx

## Server Actions / Data Provider

| Risorsa | Operazioni | Note |
|---------|-----------|------|
| clients | CRUD + filtri per tipo | Eredita pattern contacts |
| projects | CRUD + filtri per categoria/stato | Nuovo modulo |
| services | CRUD + inserimento rapido + duplica | Cuore del sistema |
| quotes | CRUD + Kanban drag-drop | Eredita pattern deals |
| payments | CRUD + riepilogo dovuto/ricevuto | Nuovo modulo |
| expenses | CRUD + calcolo rimborso km | Nuovo modulo |

## Supabase Tables (stato attuale)

| Table | RLS | Policies | Status |
|-------|-----|----------|--------|
| clients | Enabled | auth.uid() IS NOT NULL (ALL) | Deployed |
| projects | Enabled | auth.uid() IS NOT NULL (ALL) | Deployed |
| services | Enabled | auth.uid() IS NOT NULL (ALL) | Deployed |
| quotes | Enabled | auth.uid() IS NOT NULL (ALL) | Deployed |
| payments | Enabled | auth.uid() IS NOT NULL (ALL) | Deployed |
| expenses | Enabled | auth.uid() IS NOT NULL (ALL) | Deployed |
| settings | Enabled | auth.uid() IS NOT NULL (ALL) | Deployed |
| keep_alive | Enabled | SELECT public (true) | Deployed |

Migration: `supabase/migrations/20260225180000_gestionale_schema.sql`
Progetto remoto: `qvdmzhyzpyaveniirsmo.supabase.co`
