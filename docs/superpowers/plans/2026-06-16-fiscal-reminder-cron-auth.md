# Fiscal Reminder Cron Auth (QW1) - Piano

> Plan derivato dalla spec v2 (REVISIONE autoritativa) + checklist della review
> multi-superficie (BLOCK chiusa). Spec:
> `docs/superpowers/specs/2026-06-16-fiscal-reminder-cron-auth-design.md`.

**Goal:** il cron giornaliero autentica la EF `fiscal_deadline_check` -> i
promemoria fiscali in-app vengono creati; nessuno spam di notifiche; nessun
secret valido ruotato. Locale prima, prod gated.

**Regole attive:** MONEY/FISCAL TDD (RED/GREEN), executable guardrail, commit
gate (continuity nello stesso commit), deploy EF manuale (BE-1, ref
`qvdmzhyzpyaveniirsmo` BE-8), niente prod senza verde locale + OK utente.

## Scope v1

- Auth server-to-server con secret DEDICATO `CRON_SHARED_SECRET` (random, NON
  service_role): Vault prod + secret EF prod + `supabase/functions/.env` (locale)
  + `supabase/seed.sql` (Vault locale), byte-identici.
- Helper `_shared/cronAuth.ts`: `constantTimeEquals(a,b)` puro + `isCronAuthorized(req)`
  (env assente/vuota -> false; token mancante/vuoto -> false; constant-time su
  valori non vuoti di pari lunghezza; mai loggare il secret).
- `fiscal_deadline_check/index.ts`: `if (isCronAuthorized(req)) handler(admin)`
  ELSE `AuthMiddleware(req, handler)`. Non toccare AuthMiddleware.
- migration: re-schedule del cron per inviare `Bearer <CRON_SHARED_SECRET da Vault>`.
- ANTI-SPAM notifiche: rendere `notifyImminent` idempotente per-deadline (marker
  additivo) -> al massimo 1 notifica per scadenza, mai giornaliera. I task in-app
  restano creati (dedup cross-run gia' presente: 4 task sul 30/06 al run1, 0 al run2).

## Non-obiettivi
- NON ruotare il Vault `service_role_key` (verificato allineato via md5).
- NON usare `SUPABASE_SERVICE_ROLE_KEY`/`SB_SECRET_KEY` per il confronto.
- NON cambiare la logica fiscale/scadenze; NON toccare altre EF.

## Step (TDD, locale prima)

1. RED gia' su prod: cron -> 401 "Unsupported alg" (documentato).
2. Helper `_shared/cronAuth.ts` + unit test `constantTimeEquals` (matrix:
   uguali->true; diversi->false; lunghezze diverse->false; vuoto->false).
3. Wire in `fiscal_deadline_check/index.ts` (service-role-check first, fallback
   AuthMiddleware). Idempotenza notifiche (marker).
4. Locale: set `CRON_SHARED_SECRET` in `functions/.env` + `seed.sql`; reload
   (`supabase stop --no-backup && supabase start`, BE-5).
5. Smoke locale: `curl -H "Authorization: Bearer <secret locale>"` alla EF locale
   -> 200 + N task fiscali creati; bearer errato/vuoto -> 401; user JWT -> 200.
   Re-run -> 0 nuovi task (idempotenza), <=1 notifica per deadline.
6. typecheck/lint; commit (con doc continuity, product-doc-sync;
   +architecture/continuity-map se migration).
7. Review IMPLEMENTAZIONE multi-superficie + RAG.
8. PROD (gated, OK utente): `vault.create_secret(<random>,'cron_shared_secret')`;
   `npx supabase secrets set CRON_SHARED_SECRET=<random> --project-ref qvdmzhyzpyaveniirsmo`;
   verifica `md5(Vault)==md5(env EF)`; applica migration re-schedule cron;
   `npx supabase functions deploy fiscal_deadline_check --project-ref qvdmzhyzpyaveniirsmo`;
   smoke prod: net.http_post col secret -> `net._http_response` 200 + 4 task sul
   30/06/2026; re-run -> 0 nuovi; verifica niente spam.

## Stop point
- Niente prod senza verde locale + OK utente.
- Niente rotazione Vault service_role.
- Se la notifica non e' resa idempotente, NON abilitare l'invio esterno su prod.
