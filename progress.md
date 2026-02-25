# Progress — Gestionale Rosario Furnari

## Current Phase

🟢 Fase 4 — Setup, DB e localizzazione completati. Audit post-sessione superato. Pronto per Fase 2 (Moduli Core).

## Last Session

- Date: 2026-02-25 (sessione 4)
- Completed:
  - **Audit completo di verifica Fase 1-4** — controllo indipendente su tutto il lavoro fatto
  - **Fix critico: config.toml signup disabilitato** — `enable_signup = false` su auth, email, sms
  - **Fix config.toml project_id** — da "atomic-crm-demo" a "gestionale-rosario"
  - **Fix config.toml email templates** — subject tradotto in italiano
  - **Creato .github/workflows/keep-alive.yml** — ping Supabase ogni lunedì e giovedì
  - **Fix MobileNavigation.tsx** — label "Home" → "Inizio"
  - **Fix Prettier** — 18 file riformattati, `make lint` ora passa
  - **Learning aggiunto** — "MAI dichiarare una fase completata senza audit"
  - **Typecheck + Test + Lint** — tutto verde (0 errori, 60/60 test, Prettier OK)

- Decisions:
  - Audit obbligatorio prima di dichiarare una fase completata
  - `defaultValue="Work"` in ContactInputs è corretto (valore DB, display mostra "Lavoro")
  - Label inglesi nei test (SettingsPage.test.ts) sono dati di test, non stringhe UI
  - FakeRest faker locale en_US: bassa priorità, solo demo mode

## Previous Sessions

- 2026-02-25 (sessione 3):
  - Fix stringhe inglesi residue (batch 2) — 38 file
  - Fix label form input (batch 3) — 35 campi
  - Aria-labels aggiunti a RoundButton e TagChip

- 2026-02-25 (sessione 2):
  - i18n Provider configurato (ra-i18n-polyglot, traduzioni inline)
  - Route error risolto (react-router v6/v7 alias + patch-package)
  - Traduzione prima passata ~40 file, ~200+ stringhe
  - Valute USD→EUR, date-fns locale italiano

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
5. [x] Audit di verifica completamento fasi precedenti
6. [ ] Adattare modulo Contacts → Clienti
7. [ ] Adattare modulo Deals → Preventivi/Pipeline
8. [ ] Creare modulo Progetti (nuovo)
9. [ ] Creare modulo Registro Lavori (nuovo — il più importante)

## Remaining Low-Priority Items

- FakeRest data generators usano `faker/locale/en_US` (solo demo mode, non produzione)
- 2 vulnerabilità npm (1 moderate, 1 high) — da valutare con `npm audit`
- 26 Vitest warnings su promise non awaited in supabaseAdapter.spec.ts (codice upstream)
- GitHub Actions: keep-alive.yml creato ma servono secrets SUPABASE_URL e SUPABASE_KEY nel repo
- Verificare che signup sia disabilitato anche nel Supabase Dashboard remoto
- 8 commit locali da pushare su origin/main

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
| 2026-02-25 | Audit obbligatorio a fine fase | Sessione 4: trovati problemi critici (signup abilitato, keep-alive mancante, Prettier rotto) in una fase "completata". Mai fidarsi dello stato senza verificare |
