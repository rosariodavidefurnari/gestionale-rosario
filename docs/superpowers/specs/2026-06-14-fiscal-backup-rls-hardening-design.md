# Fiscal Backup RLS Hardening - Design Spec

Data: 2026-06-14
Stato: completed, applicata e verificata

## Problema

Quattro tabelle fiscali di backup nel database remoto risultano leggibili via
REST con anon key. Sono tabelle nel namespace `public`, quindi esposte dalla
Data API Supabase se non protette da RLS e privilegi corretti.

Le tabelle coinvolte sono:

- `public.fiscal_declarations_backup_20260414`
- `public.fiscal_obligations_backup_20260414`
- `public.fiscal_f24_submissions_backup_20260414`
- `public.fiscal_f24_payment_lines_backup_20260414`

Il rischio e' alto perche' i dati fiscali e finanziari non devono essere
leggibili da ruoli pubblici o sessioni generiche.

## Evidenze Raccolte

Verifiche read-only eseguite sul remoto:

- le quattro tabelle rispondono a GET REST anon con status `206`
- `Content-Range` rilevati:
  - `fiscal_declarations_backup_20260414`: `0-0/4`
  - `fiscal_obligations_backup_20260414`: `0-0/37`
  - `fiscal_f24_submissions_backup_20260414`: `0-0/21`
  - `fiscal_f24_payment_lines_backup_20260414`: `0-0/39`
- `pg_class.relrowsecurity = false` per tutte e quattro
- `pg_policies` non contiene policy per queste tabelle
- `information_schema.role_table_grants` mostra privilegi ampi per `anon` e
  `authenticated`, inclusi `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`

Verifica operativa iniziale:

- la storia migration remota non e' perfettamente allineata:
  - remote-only: `20260414192200`
  - local-only: `20260414211500`
- quindi non si deve eseguire `npx supabase db push` alla cieca.

Esito finale:

- l'hardening e' stato applicato con SQL mirato, senza `db push`;
- la migration history e' stata poi riconciliata;
- la history remota registra `20260414192200_fiscal_interests_and_compensation`
  e `20260614150557_harden_fiscal_backup_rls`;
- il timestamp locale fantasma `20260414211500` e' stato rimosso.

## Obiettivi

1. Bloccare l'accesso anonimo e authenticated alle quattro tabelle di backup.
2. Abilitare RLS sulle quattro tabelle, se ancora presenti.
3. Rimuovere i privilegi diretti di `anon` e `authenticated`.
4. Mantenere replayable la modifica tramite migration o procedura tracciata.
5. Verificare la chiusura con controlli ripetibili prima e dopo.

## Non-Obiettivi

- Non cancellare le tabelle di backup in questo ciclo.
- Non migrare o normalizzare i dati fiscali storici.
- Non modificare dashboard, UI, provider o Edge Functions.
- Non cambiare semantica fiscale, calcolo tasse, incassi o bollo.
- Non correggere in questo ciclo la divergenza completa tra seed, remoto e XML.

## Fonti Di Verita'

- Database remoto Supabase del progetto `qvdmzhyzpyaveniirsmo`
- Metadata Postgres: `pg_class`, `pg_policies`,
  `information_schema.role_table_grants`
- REST API Supabase con anon key per testare esposizione pubblica
- Documentazione Supabase RLS e API security
- Regole repo in `AGENTS.md`

## Invarianti

- Le tabelle fiscali di backup non devono essere leggibili da `anon`.
- Le tabelle fiscali di backup non devono essere leggibili da `authenticated`
  salvo decisione esplicita futura e policy mirata.
- Nessuna policy permissiva generica deve essere aggiunta.
- Il service role e le operazioni amministrative devono rimanere possibili se
  servono a manutenzione o recupero dati.
- Nessun dato deve essere cancellato.
- Nessuna migrazione deve dipendere da UUID remoti o stato manuale non
  verificato.
- La migration deve restare additive/independent: nessuna perdita dati, nessun
  presupposto manuale non versionato, replay sicuro da zero.
- Nessun `db push` deve partire prima di aver gestito la divergenza migration.
- Ogni passaggio deve essere deterministico: input noto, comando/query
  ripetibile, output atteso e stop condition dichiarati prima dell'esecuzione.

## Decisione Di Design

Per questo ciclo la correzione minima e' una hardening migration che, per ogni
tabella se esiste:

1. abilita Row Level Security;
2. revoca tutti i privilegi diretti da `anon` e `authenticated`;
3. non crea policy nuove.

Questa scelta segue il principio del layer minimo corretto: il problema e' nel
database, non nella UI. Non serve introdurre provider, Edge Function o logica
applicativa.

## SOLID

- Single Responsibility: la migration ha una sola responsabilita', chiudere
  l'esposizione delle tabelle backup fiscali.
- Open/Closed: non modifica flussi fiscali esistenti; aggiunge hardening su
  oggetti specifici.
- Liskov Substitution: non cambia shape dei dati o contratti dei consumer.
- Interface Segregation: non espone nuove interfacce pubbliche.
- Dependency Inversion: la sicurezza resta nel database, non in controlli UI.

## Migration Discipline

Questa migration e' una hardening migration non distruttiva:

- non cancella dati;
- non elimina colonne, tabelle, policy o vincoli;
- non crea nuove superfici applicative;
- abilita RLS e revoca privilegi pubblici/generici su tabelle backup esistenti;
- usa check `to_regclass` per restare replayable anche in ambienti dove le
  backup manuali non esistono.

## TDD / Controlli Prima Dell'Implementazione

Prima di applicare la correzione deve essere tracciato il RED:

- REST anon legge almeno una riga o rivela conteggio dalle quattro tabelle;
- `relrowsecurity = false`;
- grant diretti presenti per `anon` e `authenticated`.

Il GREEN atteso dopo l'implementazione:

- `relrowsecurity = true` per tutte le tabelle esistenti;
- nessun grant diretto residuo per `anon` o `authenticated`;
- REST anon non ritorna dati dalle tabelle;
- nessuna tabella viene cancellata.

## Controllore Di Repo

Serve un controllore versionato nel repo.

Decisione aggiornata:

- aggiungere un SQL check ripetibile in `scripts/check-fiscal-backup-rls.sql`
- il controllo deve fallire prima della fix, perche' oggi RLS e grant sono
  sbagliati
- il controllo deve passare dopo la fix
- il controllo deve fallire anche se una tabella target manca, se esistono
  policy sulle backup, o se `anon` / `authenticated` mantengono privilegi
  effettivi anche via `PUBLIC`
- non va messo in pre-commit, perche' richiede connessione e credenziali verso
  il DB remoto
- il piano deve includere il comando esatto per eseguirlo e l'output atteso

Questo controllore non sostituisce il test REST anon: copre metadata RLS/grant.
Il test REST resta un gate separato per verificare la superficie esposta dalla
Data API.

Controllore REST:

- aggiungere `scripts/check-fiscal-backup-rest-anon.mjs`
- il controllo deve fallire prima della fix se REST anon ritorna `2xx`
- il controllo deve passare dopo la fix solo se REST anon non espone dati

## DeepWiki / RAG Pre-Review

Errore corretto: la prima review era stata scritta prima di interrogare il RAG.
Da ora questa spec considera obbligatorio il gate RAG prima della review.

RAG interrogato con `model: gemini-2.5-pro`.

Staleness:

- clone DeepWiki: `e4aa581af58c900c27fe55a4191e0c7f4ee9b4b0`
- working tree: `7694296d269293eb78d845885665864131738e6a`
- quindi il RAG e' utile per superfici indicizzate, ma non vede le modifiche
  documentali correnti.

Risultato RAG:

- nessun consumer runtime applicativo individuato per le tabelle
  `*_backup_20260414`;
- superfici da verificare: provider fiscale, test fiscali/dashboard, supporto
  E2E, migrations, scripts, continuity checks.

Verifica su sorgente reale prima dei controllori:

- `rg` ha trovato riferimenti backup solo in
  `scripts/fiscal-reconciliation-2026-04-14.sql`;
- i riferimenti sono commenti di restore manuale, non consumer runtime;
- il runtime usa le tabelle fiscali reali e la view enriched, non le backup.

Dopo la creazione dei controllori, `rg` trova anche:

- `scripts/check-fiscal-backup-rls.sql`
- `scripts/check-fiscal-backup-rest-anon.mjs`
- `package.json`

Questi sono guardrail del repo, non consumer runtime del prodotto.

## Rischi

- `db push` puo' applicare migrazioni impreviste se la history resta
  divergente.
- Una revoca troppo ampia su ruoli sbagliati potrebbe bloccare manutenzione.
- Una policy permissiva aggiunta per errore riaprirebbe l'accesso.
- Limitarsi a RLS senza revocare grant puo' ridurre il rischio ma lasciare una
  superficie fragile e meno esplicita.

## Criteri Di Accettazione

- Spec revisionata.
- Piano revisionato.
- RED documentato nel piano con comandi/query ripetibili.
- Migration o procedura SQL revisionata prima dell'applicazione.
- Post-implementazione revisionata.
- Verifica finale mostra:
  - RLS attivo;
  - zero grant `anon`/`authenticated`;
  - nessun dato leggibile con anon key;
  - nessuna modifica distruttiva.

## Review Spec

Esito: completata e verificata post-RAG.

Controlli:

- il problema e' circoscritto a quattro tabelle backup fiscali esposte;
- gli obiettivi non includono redesign, normalizzazione o cancellazione dati;
- i non-obiettivi impediscono drift verso dashboard, UI o calcoli fiscali;
- il ciclo TDD e' definito tramite controlli RED/GREEN ripetibili;
- il vincolo deterministico e' presente negli invarianti;
- il controllore versionato nel repo e' previsto prima della fix;
- DeepWiki/RAG e' stato interrogato e i claim sono stati verificati con `rg`;
- la divergenza migration e' trattata come stop point, non ignorata.

## Review Gate

1. Review spec: verificare che problema, obiettivo e non-obiettivi siano
   corretti.
2. Review piano: verificare che il piano non salti RED/GREEN, migration history
   gate e stop point.
3. Review implementazione: verificare SQL, scope, assenza di policy permissive
   e assenza di operazioni distruttive.
4. Review finale: verificare output dei controlli e aggiornamento docs.

## Stop Point Storici

Questi erano gli stop point prima dell'applicazione; restano come regole per
interventi futuri simili:

- la migration history resta divergente e non c'e' decisione esplicita;
- una tabella risulta usata da UI/provider in modo necessario;
- il controllo REST o metadata produce risultati incoerenti;
- il SQL proposto include `DROP`, `DELETE`, `TRUNCATE` o policy permissive.
