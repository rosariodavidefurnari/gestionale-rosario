# Progress — Gestionale Rosario Furnari

## Current Phase

🟢 Fase 3 — Localizzazione italiana completata, pronto per adattamento moduli

## Last Session

- Date: 2026-02-25
- Completed:
  - **i18n Provider configurato** — ra-i18n-polyglot con traduzioni italiane inline
    (pacchetto @christianascone incompatibile, traduzioni direttamente in i18nProvider.tsx)
  - **Route error risolto** — Conflitto react-router v6/v7, risolto con alias Vite
    (`react-router-dom` → `react-router`) + patch-package per flatten arrays in CoreAdminRoutes
  - **Traduzione completa UI in italiano** — ~40 file tradotti, ~200+ stringhe:
    - Dashboard: Welcome, Stepper, LatestNotes, HotContacts, DealsChart, TasksList,
      DealsPipeline, DashboardActivityLog, TasksListEmpty
    - Contacts: ContactShow, ContactAside, ContactInputs, ContactListFilter,
      ContactBackgroundInfo, ContactPersonalInfo, ContactEmpty,
      ContactMergeButton, ContactImportButton, ExportVCardButton, TagsListEdit
    - Deals: DealShow, DealArchivedList, DealEmpty, DealInputs, DealList, OnlyMineInput
    - Companies: CompanyShow, CompanyAside, CompanyInputs, CompanyEmpty, CompanyList,
      CompanyListFilter
    - Notes: Note, NoteCreate, NoteCreateSheet, NoteInputs
    - Tasks: AddTask, TaskEdit, TaskFormContent
    - Tags: TagDialog, TagCreateModal, TagEditModal
    - Settings: SettingsPage, ProfilePage
    - Sales: SalesList, SalesCreate, SalesEdit
    - Login: LoginPage, SignupPage, ConfirmationRequired
    - Import: ImportPage, ImportFromJsonButton, ContactImportButton
    - Misc: ImageEditorField, CreateSheet, MobileNavigation, ContactOption,
      ContactListContent, ListNoResults
    - Activity: ActivityLogContactCreated, ActivityLogDealCreated,
      ActivityLogCompanyCreated, ActivityLogContactNoteCreated,
      ActivityLogDealNoteCreated
    - Layout: Header (menu labels)
  - **Valute aggiornate** — USD → EUR, locale en-US → it-IT nelle formattazioni
  - **Date in italiano** — date-fns locale `it` usata per formatDistance
  - **Typecheck passato** — zero errori TypeScript

- Decisions:
  - Stringhe UI hardcoded direttamente in italiano nei componenti (Atomic CRM non usa
    useTranslate() nei componenti, i18nProvider gestisce solo le stringhe ra-core framework)
  - Mantenuti i nomi campi DB in inglese (first_name, last_name, ecc.)
  - personalInfoTypes: id rimane "Work"/"Home"/"Other" (valori DB), aggiunto campo
    `name` per le label italiane "Lavoro"/"Casa"/"Altro"

## Previous Sessions

- 2026-02-25 (sessione 1):
  - Fork Atomic CRM, installazione dipendenze, esplorazione struttura
  - Progetto Supabase remoto creato (ref: qvdmzhyzpyaveniirsmo)
  - .env.development e .env.production configurati
  - Migration schema custom applicata al DB remoto
  - RLS verificato su tutte le 8 tabelle custom
  - Views create (project_financials, monthly_revenue)

## Next Steps

1. [x] Creare progetto Supabase e copiare keys in .env
2. [x] Creare schema SQL personalizzato (nuova migration)
3. [x] Configurare i18n italiano
4. [x] Tradurre tutta l'interfaccia in italiano
5. [ ] Adattare modulo Contacts → Clienti
6. [ ] Adattare modulo Deals → Preventivi/Pipeline
7. [ ] Creare modulo Progetti (nuovo)
8. [ ] Creare modulo Registro Lavori (nuovo — il più importante)

## Architectural Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-02-25 | Fork Atomic CRM come base | Stack compatibile (React+Vite+Supabase), CRM modulare, MIT license, ~15k LOC gestibili |
| 2026-02-25 | Preservare .claude/skills/ e AGENTS.md | Contengono guide preziose per lo sviluppo frontend/backend specifiche di Atomic CRM |
| 2026-02-25 | Nuova migration SQL anziché modificare le esistenti | Lo schema della specifica è completamente diverso, più pulito partire da zero |
| 2026-02-25 | Recharts per grafici dashboard | Specifica lo richiede esplicitamente, gratuito, ben integrato con React |
| 2026-02-25 | RLS policy semplice auth.uid() IS NOT NULL | Single user, non serve policy per-user |
| 2026-02-25 | keep_alive con SELECT public | Necessario per ping esterno (GitHub Actions) senza auth |
| 2026-02-25 | Traduzioni inline nei componenti | Atomic CRM non usa useTranslate(), le stringhe sono hardcoded → tradotte direttamente |
| 2026-02-25 | Alias Vite per react-router | ra-core dipende da react-router-dom@6, progetto usa react-router@7, alias forza versione unica |
| 2026-02-25 | patch-package per ra-core | Fix per flatten arrays in CoreAdminRoutes.js, necessario per React Router v7 |

## Known Issues

- 2 vulnerabilità npm (1 moderate, 1 high) — da valutare con `npm audit`
- Supabase free tier: progetto si sospende dopo 7gg inattività — keep_alive table pronta, serve GitHub Action per il ping
