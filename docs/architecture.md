# Architecture — Gestionale Rosario Furnari

## Overview

Fork di Atomic CRM personalizzato per gestire l'attività professionale
di fotografo, videomaker e web developer. Single-user, interfaccia italiana.

## Stato Infrastruttura (verificato sessione 4)

### Certezze — Audit superato

| Componente | Stato | Verificato |
|------------|-------|------------|
| Schema DB (8 tabelle + 2 views) | Deployed e conforme alla specifica | typecheck + migration review |
| RLS policies | Attive su tutte le tabelle | audit manuale |
| Signup pubblico | DISABILITATO (config.toml) | sessione 4 |
| Keep-alive workflow | Attivo, testato con successo (HTTP 200) | `gh workflow run` |
| GitHub secrets | SUPABASE_URL + SUPABASE_KEY configurati | `gh secret list` |
| Localizzazione IT | Completa su ~70 file, 3 livelli | audit sessione 4 |
| Typecheck | 0 errori | `make typecheck` |
| Test | 60/60 passati | `make test` |
| Lint + Prettier | 0 errori | `make lint` |
| Commit pushati | Tutto su origin/main | `git push` |

### Cose ancora da verificare manualmente

- Signup disabilitato nel **Supabase Dashboard remoto** (non solo config.toml locale)
- npm audit: 2 vulnerabilità (1 moderate, 1 high) — da valutare

## Localizzazione

L'interfaccia è **completamente tradotta in italiano**. Tre livelli:

1. **i18nProvider** (`src/components/atomic-crm/root/i18nProvider.tsx`) — stringhe
   framework ra-core (bottoni, validazione, paginazione) tramite ra-i18n-polyglot
   con traduzioni inline.

2. **Stringhe hardcoded** — ~70 file componente con stringhe UI in italiano nel JSX.

3. **Label form input** — Tutti gli input hanno `label="..."` esplicita in italiano.

### Convenzioni di traduzione
- Valori DB in inglese (Work/Home/Other, hot/warm/cold, ecc.)
- Label UI in italiano
- Valute: EUR, locale it-IT
- Date: date-fns con locale `it`
- Ogni nuovo input DEVE avere `label` esplicita in italiano

### Bassa priorità (non bloccanti)
- FakeRest data generators usano `faker/locale/en_US` (solo demo mode)
- 26 Vitest warnings su promise non awaited (codice upstream Atomic CRM)

## Database Schema

### Tabelle custom (da specifica)

| Tabella | Scopo | RLS | Colonne verificate |
|---------|-------|-----|-------------------|
| clients | Anagrafica clienti | auth.uid() IS NOT NULL | 11 colonne, 2 CHECK |
| projects | Progetti/programmi | auth.uid() IS NOT NULL | 12 colonne, 3 CHECK |
| services | Registro lavori (cuore) | auth.uid() IS NOT NULL | 13 colonne, 1 CHECK |
| quotes | Preventivi + pipeline | auth.uid() IS NOT NULL | 12 colonne, 1 CHECK (10 stati) |
| payments | Tracking pagamenti | auth.uid() IS NOT NULL | 12 colonne, 3 CHECK |
| expenses | Spese e km | auth.uid() IS NOT NULL | 11 colonne, 1 CHECK |
| settings | Configurazione | auth.uid() IS NOT NULL | 3 colonne (key-value) |
| keep_alive | Heartbeat free tier | SELECT public | 3 colonne |

### Dati iniziali (settings)
- `default_km_rate`: 0.19
- `default_fee_shooting`: 187
- `default_fee_editing_standard`: 249
- `default_fee_editing_spot`: 250
- `default_fee_editing_short`: 125
- `currency`: EUR

### Views

| View | Scopo |
|------|-------|
| project_financials | Riepilogo finanziario per progetto (fees, km, paid, balance) |
| monthly_revenue | Fatturato mensile per categoria |

### Tabelle Atomic CRM esistenti (da mappare in Fase 2)

| Tabella | Mapping | Azione |
|---------|---------|--------|
| contacts | → clients | Sostituire con schema custom |
| companies | — | Rimuovere (non serve) |
| deals | → quotes | Sostituire con schema custom |
| tasks | — | Valutare se mantenere |
| sales | — | Semplificare (single user) |
| tags | — | Mantenere per categorizzazione |
| configuration | — | Mantenere per config CRM |

Migration: `supabase/migrations/20260225180000_gestionale_schema.sql`

## Authentication

- Method: Supabase Auth, email/password
- User: rosariodavide.furnari@gmail.com (unico)
- Signup pubblico: DISABILITATO in config.toml (auth + email + sms)
- Protected routes: tutto tranne /login
- API Keys: VITE_SB_PUBLISHABLE_KEY (formato sb_publishable_...)

## Supabase Config

- Project ID locale: `gestionale-rosario`
- Progetto remoto: `qvdmzhyzpyaveniirsmo.supabase.co`
- Keep-alive: GitHub Actions, lunedì e giovedì 08:00 UTC
- GitHub secrets: SUPABASE_URL + SUPABASE_KEY configurati

## Routing & React Router

### Compatibilità v6/v7
- Progetto usa `react-router@7`, ra-core dipende da `react-router-dom@6`
- Risolto con alias Vite in `vite.config.ts` e `vite.demo.config.ts`:
  ```ts
  "react-router-dom": path.resolve(__dirname, "node_modules/react-router")
  ```
- Patch-package (`patches/ra-core+5.14.2.patch`): flatten arrays in CoreAdminRoutes.js
- Script postinstall in package.json: `npx patch-package`

## Pages Map (target)

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

## CI/CD

### GitHub Actions
- `.github/workflows/check.yml` — Lint, test, build su push/PR
- `.github/workflows/deploy.yml` — Deploy docs, demo, Supabase migrations
- `.github/workflows/keep-alive.yml` — Ping Supabase lunedì e giovedì

### Git Hooks
- Pre-commit: `make registry-gen` (auto-regenera registry.json)
