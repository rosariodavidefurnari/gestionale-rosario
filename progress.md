# Progress — Gestionale Rosario Furnari

## Current Phase

🟢 Fase completamento infrastruttura — Deploy Vercel + Edge Functions funzionanti. Pronto per Fase 2 (Moduli Core).

## Last Session

- Date: 2026-02-25 (sessione 5)
- Completed:
  - **Deploy su Vercel** — gestionale-rosario.vercel.app funzionante
  - **Fix deploy.yml** — disabilitato trigger automatico (era per GitHub Pages, non Vercel)
  - **Fix utente auth** — inserito record sales + metadata per utente creato manualmente
  - **Deploy Edge Functions** — users, update_password, merge_contacts, postmark deployate su remoto
  - **Fix CORS Edge Functions** — impostato secret `SB_SECRET_KEY` (service role key) mancante
  - **Verifica CORS** — OPTIONS 204 su users, update_password, merge_contacts (postmark richiede secrets Postmark)

- Decisions:
  - deploy.yml impostato su `workflow_dispatch` (manual only) — non serve per Vercel
  - Vercel auto-deploya su push al repo GitHub (collegato)
  - Edge Function `postmark` non prioritaria (webhook email, richiede secrets Postmark)
  - Edge Function `merge_contacts` utile in futuro per deduplicare clienti

## Previous Sessions

- 2026-02-25 (sessione 4):
  - Audit completo di verifica Fase 1-4
  - Fix critico: config.toml signup disabilitato
  - Creato .github/workflows/keep-alive.yml
  - Fix Prettier (18 file), Fix MobileNavigation "Home" → "Inizio"
  - Typecheck + Test + Lint tutto verde

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
- Verificare che signup sia disabilitato anche nel **Supabase Dashboard remoto**
- Edge Function `postmark` crasha (manca POSTMARK_WEBHOOK_USER/PASSWORD/AUTHORIZED_IPS) — non prioritaria

## Certezze (sessione 5)

- [x] GitHub secrets SUPABASE_URL + SUPABASE_KEY configurati nel repo
- [x] Keep-alive workflow testato manualmente: HTTP 200
- [x] config.toml: signup disabilitato (auth + email + sms), project_id corretto
- [x] Typecheck 0 errori, 60/60 test, Prettier + ESLint OK
- [x] Schema DB conforme alla specifica (tutte le colonne, CHECK, FK, views verificati)
- [x] Deploy Vercel funzionante (gestionale-rosario.vercel.app)
- [x] Utente auth configurato con metadata first_name/last_name + record sales
- [x] Edge Functions deployate: users, update_password, merge_contacts (CORS OK, 204)
- [x] Secret SB_SECRET_KEY impostato sul progetto remoto
- [x] deploy.yml disabilitato auto-trigger (workflow_dispatch only)

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
