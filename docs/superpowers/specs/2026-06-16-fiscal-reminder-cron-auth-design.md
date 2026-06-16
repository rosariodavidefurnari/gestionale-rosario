# Fiscal Reminder Cron Auth (QW1) - Design Spec

Data: 2026-06-16
Stato: draft, in review
Origine: QW1 dell'assessment `docs/superpowers/2026-06-15-gestionale-assessment.md`
(finding #1, critical: promemoria fiscali morti).

## REVISIONE v2 (post review multi-superficie + RAG) — AUTORITATIVA

Dove confligge col corpo sotto, vince questa. La review ha trovato 3 errori
critici nella v1; corretti qui (claim verificati su prod).

- Vault NON stale (v1 SBAGLIATA): verificato via md5 (read-only, mai il valore)
  che `vault.decrypted_secrets('service_role_key')` == service role CORRENTE
  (`ref=qvdmzhyzpyaveniirsmo`, `role=service_role`, exp 2036). NON ruotare il
  Vault: e' una credenziale valida. Il 401 e' solo il gate JWKS, non scadenza.
- Env/key-space (v1 SBAGLIATA): NON confrontare con `SUPABASE_SERVICE_ROLE_KEY`
  (inesistente nel repo) ne' con `SB_SECRET_KEY` (formato opaco `sb_secret_`,
  `supabaseAdmin.ts:6`). Il cron manda un JWT HS256: spazi-chiave diversi -> il
  confronto fallirebbe sempre.
- APPROCCIO CORRETTO: secret DEDICATO `CRON_SHARED_SECRET` (valore random,
  NON il service role). Va messo, byte-identico, in: (a) Vault prod
  (`vault.create_secret`), (b) secret remoto della EF
  (`npx supabase secrets set CRON_SHARED_SECRET=... --project-ref qvdmzhyzpyaveniirsmo`),
  (c) `supabase/functions/.env` locale, (d) `supabase/seed.sql` (Vault locale).
  Verifica pre-deploy: `md5(Vault CRON_SHARED_SECRET) == md5(env EF)`.
- La migration del cron va aggiornata (re-schedule) per inviare
  `Authorization: Bearer <CRON_SHARED_SECRET da Vault>` invece di service_role.
- Helper sicuro: `Deno.env.get("CRON_SHARED_SECRET")` assente/vuota -> ritorna
  SEMPRE false (mai autorizzare); token mancante/vuoto -> false PRIMA del
  compare; confronto a tempo costante su valori non vuoti di pari lunghezza;
  MAI loggare/restituire il secret. Ordine: service-role-check PRIMA, poi
  fallback `AuthMiddleware` (utente RS256) senza passare il token cron a jose.
- Scope: estrarre `constantTimeEquals(a,b)` puro (testabile vitest); modificare
  SOLO `fiscal_deadline_check/index.ts` (+ nuovo helper in `_shared`); NON
  toccare `AuthMiddleware` per gli altri consumer. Niente framework cron-auth.
- NOTIFICHE (rischio attivato dal fix): `notifyImminent` (`index.ts:126-145`)
  NON e' idempotente -> una volta sbloccato il cron, il blocco 30/06/2026
  manderebbe email+WhatsApp OGNI GIORNO dal 23/06 al 30/06. In-scope minimo:
  aggiungere un marker "notified" per-deadline (o limitare a 1/giorno per
  deadline) PRIMA di andare GREEN su prod, altrimenti spam. NON shippare in
  silenzio.
- DEDUP task: il 30/06 ha 4 obblighi (2 f24 + 2 inps). RED/GREEN deve asserire
  4 task distinti al run1 e 0 nuovi al run2 (idempotenza cross-run gia'
  presente; nessuna valanga arretrati: finestra 30gg).
- Deploy: `npx supabase functions deploy fiscal_deadline_check --project-ref
  qvdmzhyzpyaveniirsmo` (BE-1/BE-8). config.toml gia' ok (verify_jwt=false).
  Continuity: >=1 doc continuity nel commit (product-doc-sync); +architecture.md
  e development-continuity-map.md se si aggiunge la migration cron.
- Nota RAG: una review ha smascherato un'allucinazione RAG ("AuthMiddleware
  accetta il service_role" = FALSO) -> ogni claim va verificato sul sorgente.

## Problema

Il cron `fiscal-deadline-check-daily` (pg_cron, `0 7 * * *`, attivo su prod) gira
ogni giorno ma la Edge Function `fiscal_deadline_check` risponde 401: NON viene
creato alcun promemoria fiscale. C'e' una scadenza reale 30/06/2026 (~8.224 EUR)
senza alcun avviso.

## Evidenze (verificate: RAG + sorgente + prod)

- prod `net._http_response` ultimo run (2026-06-16T07:00): `status_code = 401`,
  body `{"status":401,"message":"JOSENotSupported: Unsupported \"alg\" value for
  a JSON Web Key Set"}`. `cron.job` id 1 attivo. `cron.job_run_details`:
  `succeeded` (il cron accoda solo l'http_post).
- `supabase/config.toml:188` ha gia' `[functions.fiscal_deadline_check] verify_jwt
  = false` -> NON e' il BE-2 (Kong non blocca).
- `supabase/functions/fiscal_deadline_check/index.ts:280` avvolge tutto in
  `AuthMiddleware`; inserisce promemoria in `client_tasks` con `supabaseAdmin`
  (service role) (riga ~118).
- `supabase/migrations/20260304184909_fiscal_deadline_cron.sql`: il cron fa
  `net.http_post` con header `Authorization: Bearer <service_role_key da Vault>`.
- `supabase/functions/_shared/authentication.ts`: `AuthMiddleware` ->
  `verifySupabaseJWT` -> `jose.jwtVerify(jwt, createRemoteJWKSet(.../jwks.json))`
  -> accetta SOLO JWT utente asimmetrici (RS256). Il `service_role` (HS256 o
  chiave nuova opaca) NON e' nel JWKS -> errore "Unsupported alg" -> 401.
- RAG: `fiscal_deadline_check` e' l'UNICA EF pensata per cron; NON esiste un
  helper/middleware server-to-server condiviso in `_shared/`; le altre EF
  (workflow_notify, payment_reminder_send, google_calendar_sync) sono invocate
  dal client con JWT utente.

## Obiettivo

1. Il cron riesce ad autenticarsi e la EF crea i promemoria fiscali.
2. Nessun buco di sicurezza: l'accesso server-to-server deve essere ristretto a
   chi possiede il service role (non anon, non utenti generici).
3. L'invocazione manuale da utente loggato deve continuare a funzionare.

## Non-Obiettivi

- Non riscrivere la logica fiscale/di dedup dell'EF (gia' presente).
- Non cambiare schedule, ne' la struttura dei promemoria.
- Non toccare altre EF (ma il fix puo' essere un helper riusabile).
- Non introdurre nuove scritture DB oltre quelle gia' fatte dall'EF.

## Decisione Di Design

Aggiungere autenticazione server-to-server alla EF, in modo riusabile.

- Nuovo helper in `_shared/authentication.ts` (o file dedicato):
  `authenticateServiceRole(req)` -> true se `Authorization: Bearer <token>` e il
  `token` e' uguale a `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` (confronto
  a tempo costante). NON usa JWKS.
- In `fiscal_deadline_check/index.ts`: se `authenticateServiceRole(req)` ->
  procedi con contesto admin (gia' usa `supabaseAdmin`); ELSE -> `AuthMiddleware`
  (utente). Cosi' cron E utente funzionano; anon resta 401.

### RISCHIO CHIAVE da verificare PRIMA del deploy (allineamento chiave)

Il progetto e' stato RICREATO (`qvdmzhyzpyaveniirsmo`). Il confronto funziona
solo se il `service_role_key` in Vault (che il cron invia) e' lo STESSO della
env `SUPABASE_SERVICE_ROLE_KEY` della EF (service role CORRENTE). Se il Vault ha
una chiave stale (del vecchio progetto), il confronto fallisce comunque.
Verificare/aggiornare il Vault secret `service_role_key` con il service role
corrente (operazione su secret di prod: tracciata, non loggare il valore).
NB: l'errore reale "Unsupported alg" suggerisce che oggi il Vault contiene un
JWT HS256 (vecchio service role legacy) -> molto probabilmente VA aggiornato.

## SOLID / Sicurezza

- Single Responsibility: l'helper fa solo auth server-to-server; l'EF mantiene la
  sua logica. Open/Closed: helper riusabile per future EF cron.
- Sicurezza: confronto costante-time; il service role resta segreto (Vault + env
  Supabase); nessun nuovo endpoint pubblico; anon sempre respinto.

## TDD / Controlli (MONEY/FISCAL TDD)

- RED (gia' riprodotto su prod): invocazione EF con `Bearer <service_role>` ->
  401 "Unsupported alg"; 0 promemoria.
- GREEN: invocazione con service role -> 200 e i promemoria attesi vengono
  creati (o gia' presenti, idempotenza); invocazione con JWT utente -> continua
  a funzionare; invocazione anon / token errato -> 401.
- Controllore: smoke ripetibile (locale: chiamata EF locale con service role ->
  200 + righe client_tasks attese; prod: dopo deploy, invocazione manuale via
  net.http_post o curl con service role -> 200, poi `net._http_response` 200 e
  conteggio promemoria > 0). Idempotenza: ri-eseguire non duplica (verificare la
  dedup esistente nell'EF).

## DeepWiki / RAG

RAG (gemini-2.5-pro) interrogato PRIMA della spec: confermato che non esiste
pattern cron-auth condiviso, che AuthMiddleware usa JWKS RS256, e che il
service_role HS256 viene rifiutato. Ogni claim verificato sul sorgente reale e
sui dati prod (401 odierno).

## Rischi

- Vault key stale -> il fix EF non basta senza aggiornare il secret. Mitigazione:
  verificare l'allineamento prima del deploy; il controllore GREEN lo rivela.
- Confronto chiave mal fatto (timing/typo) -> mitigazione confronto costante-time
  + test.
- Deploy EF dimenticato (BE-1) -> il fix non va in prod: lo step di deploy +
  smoke prod e' obbligatorio nel piano.
- Aprire troppo l'accesso -> mitigazione: SOLO service role esatto, mai anon.

## Criteri Di Accettazione

- Invocazione cron/service-role -> 200; promemoria fiscali creati su prod.
- Invocazione utente loggato -> continua a funzionare; anon -> 401.
- `net._http_response` mostra 200 dopo il fix; conteggio promemoria fiscali > 0.
- typecheck/lint ok; EF deployata (ref `qvdmzhyzpyaveniirsmo`); idempotenza ok.

## Review Gate

1. Review spec (questa).
2. Review piano (multi-superficie + RAG): helper auth, scope EF, Vault key,
   RED/GREEN, deploy.
3. Review implementazione (multi-superficie + RAG).
4. Review finale: smoke prod 200 + promemoria creati, niente regressione utente.

## Stop Point

- Non deployare senza aver verificato l'allineamento del Vault `service_role_key`.
- Non allargare l'accesso oltre il service role esatto.
- Non toccare la logica fiscale/dedup dell'EF in questo ciclo.
