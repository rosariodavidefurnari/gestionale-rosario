# Cantiere Gestionale Rosario

Stato del documento: working
Ultimo aggiornamento: 2026-06-14

## Scopo

Questo file e' il ponte tra roadmap e lavoro concreto.

Serve a iniziare una nuova chat sapendo subito:

- dove siamo;
- qual e' la prossima cosa da fare;
- quali spec, piani e review sono attivi;
- quali controlli/RAG sono gia' stati fatti;
- quali stop point non vanno superati.

Non e' un archivio storico lungo. Se cresce troppo, spostare il dettaglio nei
documenti canonici o nei piani e lasciare qui solo stato corrente e prossima
azione.

## Quando Usarlo

- all'inizio di ogni nuova chat;
- prima di decidere la prossima azione;
- prima di implementare un piano;
- prima di chiudere un lavoro strutturato.

## Quando NON Usarlo

- non usarlo come fonte tecnica se codice, DB o migration dicono altro;
- non usarlo al posto della spec;
- non usarlo al posto del piano;
- non usarlo al posto delle query o dei test.

## Protocollo Di Ripartenza

Ordine minimo di lettura per ogni nuova chat:

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/CANTIERE.md`
4. roadmap/spec/piano attivi linkati qui sotto
5. documenti canonici collegati al lavoro corrente
6. DeepWiki/RAG se il lavoro e' cross-file, rischioso o puo' avere superfici
   nascoste

Regola pratica:

- roadmap = direzione;
- cantiere = prossima azione;
- spec = cosa stiamo decidendo;
- piano = come lo eseguiamo;
- test/controllori = cosa impedisce regressioni;
- review = caselli obbligatori.

## Contratto Operativo Breve

- Parola d'ordine: deterministico.
- Prima si misura, poi si tocca.
- Se ci sono soldi o fiscalita', il test passa davanti a tutti.
- Spec e piano sono il biglietto d'ingresso.
- Ogni review e' un casello.
- Niente "mi pare": serve fonte reale.
- Se e' critico, il controllo nasce prima.

## Stato Corrente

Siamo nella fase di impostazione del metodo e del primo ciclo di sicurezza DB.
Branch corrente:

- `work/fiscal-backup-rls-hardening`

Obiettivo operativo attivo:

- chiudere il ciclo RLS backup fiscali + riconciliazione migration history con
  verifiche finali e documenti allineati.

Fatto:

- creata roadmap generale:
  `docs/gestionale-roadmap-generale.md`
- aggiunte regole operative in `AGENTS.md`:
  - spec prima del piano;
  - review spec;
  - review piano;
  - review implementazione;
  - TDD su soldi/fiscalita';
  - determinismo;
  - controllori eseguibili;
  - Cantiere;
  - RAG prima delle review su lavori rischiosi/cross-file.
- aggiunta regola progetto:
  - migration sempre additive e indipendenti.
- creata spec RLS backup fiscali:
  `docs/superpowers/specs/2026-06-14-fiscal-backup-rls-hardening-design.md`
- creato piano RLS backup fiscali:
  `docs/superpowers/plans/2026-06-14-fiscal-backup-rls-hardening.md`
- interrogato DeepWiki/RAG dopo correzione del processo.
- ricevute review sub-agenti su:
  - copertura spec/piano/superfici;
  - sicurezza SQL/RLS;
  - migration history;
  - autosufficienza docs;
  - controllore RED.
- creati controllori:
  - `scripts/check-fiscal-backup-rls.sql`
  - `scripts/check-fiscal-backup-rest-anon.mjs`
- aggiunti script npm:
  - `npm run security:check:fiscal-backups`
  - `npm run security:check:fiscal-backups:rest`
- RED eseguito e confermato:
  - metadata/RLS fallisce con 4 tabelle target con RLS disabilitata;
  - REST anon fallisce con 4 risposte `206` e `Content-Range` positivo.
- creata migration locale:
  `supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- review implementazione sub-agente: `PASS` per applicazione mirata via
  `npx supabase db query --linked -f supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- applicato hardening remoto con:
  `npx supabase db query --linked -f supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- GREEN eseguito e confermato:
  - `npm run security:check:fiscal-backups` passa;
  - `npm run security:check:fiscal-backups:rest` passa;
  - REST anon ritorna `401` e nessun `Content-Range` per tutte e quattro le
    backup tables.
- verifica finale repo passata:
  - `make typecheck`
  - `npm run continuity:check`
  - `npx eslint scripts/check-fiscal-backup-rest-anon.mjs`
- aperta spec migration history:
  `docs/superpowers/specs/2026-06-14-migration-history-reconciliation-design.md`
- aperto piano migration history:
  `docs/superpowers/plans/2026-06-14-migration-history-reconciliation.md`
- DeepWiki/RAG interrogato per migration history; risultato parziale ma utile,
  verificato con `rg` e sorgente reale.
- query schema read-only eseguita: l'effetto fiscale poi canonizzato come
  `20260414192200` e l'hardening `20260614150557` risultano gia' presenti nello
  schema remoto (`ok = true` per tutti i check).
- limite sub-agenti emerso: `agent thread limit reached`; tutti i vecchi agenti
  risultano `completed`, ma il tool non espone un comando di chiusura ulteriore.
  Finche' il limite resta, review nuove vanno fatte inline o rinviate.
- Supabase MCP ufficiale:
  - skill ufficiali `supabase` e `supabase-postgres-best-practices` aggiornate
    da `https://github.com/supabase/agent-skills.git`;
  - server MCP corretto aggiunto come `supabase-gestionale`;
  - project ref corretto: `qvdmzhyzpyaveniirsmo`;
  - URL valido:
    `https://mcp.supabase.com/mcp?project_ref=qvdmzhyzpyaveniirsmo&features=database,docs,debugging,development,functions`;
  - configurazione pulita finale: rimosso il vecchio server globale
    `supabase` che puntava a `qivhseixrkoakywgwkal`; per questo repo resta un
    solo MCP Supabase, `supabase-gestionale`;
  - `.vscode/mcp.json` allineato allo stesso nome e URL;
  - errore corretto: era stato usato `qvdmzhyzpyaveniirsmos` (21 caratteri) e
    feature non valida `edge-functions`.
  - test MCP reale eseguito con `supabase-gestionale/execute_sql`:
    `select current_setting('server_version')` -> PostgreSQL `17.6`.
- MCP `supabase-gestionale/execute_sql` usato davvero tramite nuovo processo
  `codex exec`: la history remota contiene:
  - `20260414192200_fiscal_interests_and_compensation`
  - `20260614150557_harden_fiscal_backup_rls`
  - nessun `20260414211500`
- riconciliazione locale/remota applicata:
  - creato `supabase/migrations/20260414192200_fiscal_interests_and_compensation.sql`
    dal contenuto registrato nella history remota;
  - rimosso il timestamp locale fantasma
    `supabase/migrations/20260414211500_fiscal_interests_and_compensation.sql`;
  - registrato in `supabase_migrations.schema_migrations` il solo metadata
    della migration gia' applicata `20260614150557_harden_fiscal_backup_rls`;
  - nessun `db push`, nessun `db reset`, nessuna nuova modifica schema.

Non fatto:

- nessun codice applicativo modificato.

## Prossima Azione

Aprire il prossimo ciclo dalla roadmap generale: Fase 2, "Verita' dati: remoto
vs locale vs XML".

Prima di qualunque implementazione:

- creare spec dedicata;
- interrogare DeepWiki/RAG;
- fare review spec;
- creare piano;
- fare review piano;
- definire controllori deterministici per confrontare remoto, seed e fonti XML.

Stato verifiche finali:

- `npm run security:check:fiscal-backups` passa
- `npm run security:check:fiscal-backups:rest` passa
- `npm run continuity:check` passa
- `make typecheck` passa

## Lavoro Attivo

Tema:

- sicurezza RLS delle quattro tabelle fiscali backup `*_backup_20260414`.

Artefatti:

- roadmap:
  `docs/gestionale-roadmap-generale.md`
- spec:
  `docs/superpowers/specs/2026-06-14-fiscal-backup-rls-hardening-design.md`
- piano:
  `docs/superpowers/plans/2026-06-14-fiscal-backup-rls-hardening.md`
- controllori:
  - `scripts/check-fiscal-backup-rls.sql`
  - `scripts/check-fiscal-backup-rest-anon.mjs`
- migration:
  - `supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- spec/piano prossima fase:
  - `docs/superpowers/specs/2026-06-14-migration-history-reconciliation-design.md`
  - `docs/superpowers/plans/2026-06-14-migration-history-reconciliation.md`
- documenti canonici da aggiornare prima della chiusura:
  - `docs/architecture.md`
  - `docs/development-continuity-map.md`
  - `docs/gestionale-roadmap-generale.md`

## RAG / DeepWiki

Stato DeepWiki:

- API locale attiva su `http://localhost:8001`
- cache locale presente:
  `~/.adalflow/databases/rosariodavidefurnari_gestionale-rosario.pkl`
- snapshot clone DeepWiki:
  `e4aa581af58c900c27fe55a4191e0c7f4ee9b4b0`
- working tree corrente:
  `7694296d269293eb78d845885665864131738e6a`
- conclusione: RAG utile per superfici gia' indicizzate, ma stale rispetto al
  working tree; ogni claim va verificato sul sorgente reale.

Query eseguite:

- riferimenti a `fiscal_*_backup_20260414` e pattern `_backup_YYYYMMDD`
- superfici esistenti per Supabase security, RLS, migration, continuity check e
  guardrail

Risultato utile:

- RAG non ha trovato consumer runtime applicativi delle tabelle backup fiscali;
- ha segnalato come superfici da verificare:
  - provider fiscale;
  - test fiscali/dashboard;
  - supporto E2E;
  - migrations;
  - scripts;
  - continuity checks.

Verifica sul sorgente reale prima dei controllori:

- `rg` ha trovato riferimenti backup solo in:
  `scripts/fiscal-reconciliation-2026-04-14.sql`
- quei riferimenti sono commenti di restore manuale, non consumer runtime;
- il runtime usa le tabelle reali:
  - `fiscal_declarations`
  - `fiscal_obligations`
  - `fiscal_f24_submissions`
  - `fiscal_f24_payment_lines`
  - `fiscal_f24_payment_lines_enriched`
- superfici runtime verificate:
  - `src/components/atomic-crm/providers/supabase/fiscalRealityProvider.ts`
  - `supabase/functions/fiscal_deadline_check/index.ts`
  - `supabase/migrations/20260402020254_fiscal_reality_layer.sql`
  - `supabase/migrations/20260414192200_fiscal_interests_and_compensation.sql`

Dopo i controllori, riferimenti backup attesi anche in:

- `scripts/check-fiscal-backup-rls.sql`
- `scripts/check-fiscal-backup-rest-anon.mjs`
- `package.json`

Questi sono guardrail, non consumer runtime.

## Review Sub-Agenti

Esiti ricevuti:

- spec/piano/superfici: `FLAG/BLOCK` finche' Cantiere e piano non venivano
  riallineati ai controllori e ai comandi REST;
- controllore RED: `BLOCK` verso migration finche' il controllore non copriva
  tabelle mancanti, privilegi effettivi e policy;
- security: `FLAG`, piano valido ma da rafforzare con `PUBLIC`, privilegi
  effettivi, policy e REST;
- implementazione: `PASS` per applicazione mirata via `db query`, con nota
  non bloccante di preferire REST `HEAD` per non scaricare righe;
- migration history: raccomandata Option A per riproducibilita' piena; applicata
  poi riconciliazione metadata dopo prove schema e verifica MCP.

Azioni applicate dopo review:

- controllore SQL rafforzato;
- controllore REST aggiunto e convertito a `HEAD`;
- piano aggiornato con comandi RED reali;
- Cantiere aggiornato.

## Gate Aperti

- [x] Review interna post-RAG della spec RLS.
- [x] Review interna post-RAG del piano RLS.
- [x] Decisione operativa su migration history: Option B per hardening
  immediato, niente `db push`.
- [x] Creare controllori RED prima della fix.
- [x] Eseguire RED e documentare fallimento atteso.
- [x] Creare migration minima locale.
- [x] Review implementazione.
- [x] Applicare fix minima via `db query`.
- [x] Verifica GREEN.
- [x] Aggiornare docs canonical coinvolti.
- [x] Eseguire verifica finale repo.
- [x] Aprire spec/piano per migration history reconciliation.
- [x] Sbloccare MCP Supabase corretto (`supabase-gestionale`).
- [x] Allineare localmente la migration fiscale al timestamp remoto reale
  `20260414192200`.
- [x] Eliminare il timestamp fantasma locale `20260414211500`.
- [x] Registrare in history remota il metadata della migration RLS gia'
  applicata `20260614150557`.
- [x] Verificare via MCP `supabase-gestionale/execute_sql` che la history
  remota contenga `20260414192200` e `20260614150557`, non `20260414211500`.
- [x] Eseguire giro finale guardrail + continuity + typecheck.

## Stop Point

Non procedere con DB remoto se:

- DeepWiki/RAG non e' stato usato per plan/review di lavori cross-file o ad alto
  rischio;
- qualcuno propone `npx supabase db push` senza prima verificare lo stato
  migration via MCP o CLI;
- non esiste un controllo RED prima della fix;
- il SQL proposto cancella dati o crea policy permissive;
- REST anon continua a leggere dati dopo la fix.
- un controllo finale fallisce dopo la riconciliazione.

## Regole Di Aggiornamento

Aggiornare questo file prima della risposta finale quando cambia:

- prossima azione;
- stato di spec/piano;
- esito RAG;
- esito review;
- test/controllore richiesto;
- decisione su migration;
- stop point;
- verifica finale.

Formato richiesto:

- mantenere il documento breve;
- lasciare una sola prossima azione chiara;
- non duplicare lunghi dettagli gia' presenti in spec o piano;
- linkare sempre il documento sorgente invece di riscriverlo tutto;
- segnare chiaramente se una review e' valida, invalida o da rifare.
