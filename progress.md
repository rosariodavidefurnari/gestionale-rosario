# Progress — Gestionale Rosario Furnari

## Current Phase

🟢 Fase 4 — Localizzazione completa al 100%, pronto per adattamento moduli

## Last Session

- Date: 2026-02-25 (sessione 3)
- Completed:
  - **Fix stringhe inglesi residue (batch 2)** — 38 file aggiuntivi tradotti:
    - Admin components: theme-mode-toggle, error, autocomplete-input, data-table,
      columns-button, export-button, breadcrumb, show-guesser, number-field, record-field
    - CRM: ActivityLogContactCreated, CompanyListFilter, sizes, ContactEditSheet,
      ContactInputs, TagsListEdit, DealsChart (mesi italiano con date-fns locale),
      HotContacts, DealEdit, ImportPage, InfinitePagination, MobileBackButton,
      RelativeDate (date-fns locale), NoteEditSheet, NoteShowPage, NotesIteratorMobile,
      SaleName, ListNoResults, getCompanyAvatar, defaultConfiguration (settori, fasi,
      categorie, stati note, tipi attività)
    - FakeRest: companies.ts (USD→EUR, paesi italiani)
    - i18nProvider.tsx: chiavi mancanti (breadcrumb, search_columns, clear_search, ecc.)
    - Test aggiornati: getCompanyAvatar.spec, SettingsPage.test
  - **Fix label form input (batch 3)** — 35 campi input con label esplicita italiana:
    - DealInputs: Descrizione, Azienda, Importo, Data chiusura prevista, Fase
    - ContactInputs: Nome, Cognome, Ruolo, Azienda, Iscritto newsletter
    - CompanyInputs: Nome, Sito web, URL LinkedIn, Telefono, Settore, Dimensione,
      Fatturato, P.IVA/C.F., Indirizzo, Città, CAP, Provincia, Nazione, Descrizione, Link utili
    - NoteInputs: Stato
    - TaskFormContent: Scadenza, Tipo
    - SalesInputs: Nome, Cognome, Email, Amministratore, Disabilitato
    - ProfilePage: Nome, Cognome, Email
    - AutocompleteCompanyInput: accetta prop `label`
  - **Aria-labels** aggiunti a RoundButton e TagChip
  - **Typecheck e test** — 0 errori, 60/60 test passati

- Decisions:
  - ra-core auto-genera label dal `source` in inglese → servono label esplicite su ogni input
  - AutocompleteCompanyInput esteso con prop `label` per riuso

## Previous Sessions

- 2026-02-25 (sessione 2):
  - i18n Provider configurato (ra-i18n-polyglot, traduzioni inline)
  - Route error risolto (react-router v6/v7 alias + patch-package)
  - Traduzione prima passata ~40 file, ~200+ stringhe
  - Valute USD→EUR, date-fns locale italiano
  - Decisioni: stringhe hardcoded, nomi DB inglesi, personalInfoTypes con campo `name`

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
