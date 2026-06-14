# Fiscal Cascade Protection - Design Spec

Data: 2026-06-14
Stato: draft v2 (post review multi-superficie + RAG), pronta per il piano

Origine: TASK 4 del brief `gestionale-rifinitura-db_2.md` (analisi deterministica
sul DB di produzione). Continuazione del ciclo sicurezza DB dopo
`2026-06-14-fiscal-backup-rls-hardening` (TASK 5 del brief, gia' chiuso).

Cronologia review:

- v1: spec iniziale, review mono-superficie (verdetto FLAG).
- v2: review MULTI-SUPERFICIE e MULTI-COMPETENZA con uso attivo del RAG
  (5 revisori: DB/Postgres, dominio fiscale, frontend/superfici, provider/Edge,
  TDD/controllori). Verdetto: BLOCK. Questa v2 chiude i finding bloccanti.

## Problema

Diverse foreign key delle tabelle operative/fiscali usano `ON DELETE CASCADE`.
Cancellare un record padre distrugge in silenzio la storia finanziaria e
fiscale dei figli, senza traccia e senza recupero (non esiste soft delete).

Casi concreti verificati sul DB live `qvdmzhyzpyaveniirsmo`:

- cancellare un `client` cancella in cascata le sue `financial_documents`
  (fatture = documenti fiscali insostituibili), i suoi `projects`, e a catena
  `services` e `quotes`;
- cancellare un `project` cancella in cascata i suoi `services` (registro
  lavori = base del fatturato).

Doppio danno scoperto dal RAG (modello finanziario a due layer):

- il fatturato/incassato non vive solo nei record cancellati: la view
  `project_financials` calcola `total_paid` dalle allocazioni
  (`financial_document_cash_allocations`) preferendo il layer
  `financial_foundation` a `legacy_payments` (campo `payment_semantics_basis`),
  e `total_fees` dai `services`. Quindi cancellare una fattura o un service non
  perde solo il record: falsa `total_paid`/`total_fees`/`balance_due` letti da
  dashboard e contesto AI (`dataProviderAi`).

Il bottone "Elimina" e' esposto in UI su clienti e progetti; un singolo click
puo' innescare la cascata. Inoltre il DeleteButton e' `undoable` (vedi
Evidenze): con una FK che blocca, l'utente vedrebbe un falso successo seguito da
rollback e da un errore Postgres grezzo — UX ingannevole su dati fiscali.

L'esistenza di tabelle di backup manuali `*_backup_20260414` conferma che il
bisogno di proteggere questi dati e' reale.

## Evidenze Raccolte

Verifiche su DB remoto `qvdmzhyzpyaveniirsmo` (MCP, read-only), sul sorgente
reale, e tramite RAG (poi verificate sul sorgente).

### FK reali (live `pg_constraint`)

Le 4 FK da proteggere — nomi e stato verificati sul DB live, tutte
`confdeltype='c'` (CASCADE), `condeferrable=false`:

- `financial_documents_client_id_fkey`  (financial_documents.client_id -> clients) CASCADE — CRITICO, fiscale
- `projects_client_id_fkey`             (projects.client_id -> clients)            CASCADE
- `services_project_id_fkey`            (services.project_id -> projects)          CASCADE
- `quotes_client_id_fkey`               (quotes.client_id -> clients)              CASCADE

Cascate legittime, NON toccare (figli derivati o richiesti dal codice/dominio):

- `expenses.source_service_id -> services` (CASCADE): spesa km auto-generata dal
  trigger `sync_service_km_expense`; figlio derivato del service, deve sparire
  col service (migration `20260306065425`, `20260306071030`).
- `financial_document_project_allocations.document_id -> financial_documents` (CASCADE): riga ponte.
- `financial_document_cash_allocations.document_id -> financial_documents` (CASCADE): riga ponte.
- `financial_document_cash_allocations.cash_movement_id -> cash_movements` (CASCADE): riga ponte.
- `fiscal_f24_payment_lines.submission_id -> fiscal_f24_submissions` (CASCADE):
  `fiscalRealityProvider.deleteF24Submission` SI AFFIDA a questo cascade. Non toccare.
- `workflow_executions.workflow_id -> workflows` (CASCADE): log figlio.
- `client_notes.client_id -> clients`, `client_notes.supplier_id -> suppliers` (CASCADE): note dipendenti, non fiscali.
- `project_contacts.project_id -> projects`, `project_contacts.contact_id -> contacts` (CASCADE): tabella ponte.

Protezioni gia' presenti (live), tutte NO ACTION (`'a'`, inline senza ON DELETE):

- `payments.{client_id,project_id,quote_id}` -> NO ACTION (un cliente con
  pagamenti gia' oggi non e' cancellabile; un quote con pagamenti idem).
- `expenses.{client_id,project_id,supplier_id}` -> NO ACTION.

FK SET NULL (`'n'`): `services.client_id -> clients`, `quotes.project_id -> projects`,
`financial_documents.supplier_id -> suppliers`.

Correzione nota di drift (v1 errata): `financial_documents.supplier_id` e'
SET NULL sia nel live sia nella migration `20260308003136` (riga 22) — nessun
drift. Il CASCADE alla riga 3 di quella migration e' `client_notes.supplier_id`,
non `financial_documents`. (Il punto generale "vince il DB live" resta valido.)

### Superfici UI di cancellazione (sweep completa, verificata)

DeleteButton singolo:

- `clients/ClientShow.tsx:179`  -> `<DeleteButton redirect="list" />`  [delete CLIENT: NEWLY bloccato dai flip]
- `projects/ProjectShow.tsx:164` -> `<DeleteButton redirect="list" />` [delete PROJECT: NEWLY bloccato dai flip]
- `services/ServiceShow.tsx:177` -> `<DeleteButton redirect="list" />` [delete SERVICE: NON bloccato dai flip; cascade solo su km expense]
- `quotes/QuoteShowActions.tsx:134,237`, `quotes/QuoteEdit.tsx:96,142,235` [delete QUOTE: puo' essere bloccato da `payments.quote_id` NO ACTION, gia' oggi, indipendente dai flip]

Bulk delete (`<ListBulkToolbar allowDelete />`, gate `misc/ListBulkSelection.tsx`):

- ATTIVO: `services/ServiceListContent.tsx:124,148`, `payments/PaymentListContent.tsx:94,187`,
  `expenses/ExpenseListContent.tsx:62,156`, `suppliers/SupplierList.tsx:84,123`
- OFF (nessun `allowDelete`): `clients/ClientListContent.tsx`, `projects/ProjectListContent.tsx`

Modalita' di cancellazione:

- `src/components/admin/delete-button.tsx:64` usa `useDeleteWithUndoController`,
  che forza `useDeleteController({ ...props, mutationMode: 'undoable' })`:
  cancellazione ottimistica + Undo, la `DELETE` reale parte dopo il timeout. Con
  una FK che blocca, l'errore arriva DOPO il falso successo. Passare
  `mutationOptions.mutationMode` rende pessimistic la DELETE ma NON spegne il
  toast "Annulla" (la `onSuccess` interna legge il mutationMode top-level) ->
  serve estendere il componente (vedi Decisione B).
- `contacts/ContactShow.tsx:278` NON e' un precedente DeleteButton: e' un
  `deleteOne(project_contacts, { mutationMode: 'pessimistic' })` via `useDelete`.
  Il pattern pessimistic esiste nel repo, ma non sul componente DeleteButton.

Nessuna UI di delete per `financial_documents` ne' `cash_movements` (verificato:
non sono resource in `moduleRegistry`; `SupplierFinancialSection.tsx` e'
read-only). Le loro FK CASCADE verso le allocazioni NON sono raggiungibili da
utente oggi.

### Consumer del cascade e modello finanziario

- `providers/supabase/dataProvider.ts` (services `afterDelete`) chiama
  `syncServiceToCalendar("delete", id)`. Oggi il cascade `project -> services`
  cancella i service via DB SENZA passare dal dataProvider -> `afterDelete` non
  gira -> eventi Google Calendar orfani. Il flip a NO ACTION chiude questo buco
  (fix collaterale).
- `project_financials` (migration `20260302010500`): `total_fees` da
  `services` (riga 201); `total_paid` via `CASE` che preferisce
  `total_paid_foundation` (allocazioni, righe 233-244, 286-298) a
  `total_paid_legacy` (payments); `payment_semantics_basis` espone quale layer.
  Consumata da dashboard e da `dataProviderAi.ts` (contesto AI).
- `fiscalRealityProvider.deleteF24Submission` (riga 271) si affida al cascade su
  `fiscal_f24_payment_lines`; `deleteFiscalDeclaration` (riga 337) fa cascade
  manuale (FK `fiscal_obligations.declaration_id` = NO ACTION). Entrambe
  intenzionalmente FUORI SCOPE FK: protezione a livello applicativo.
- Nessuna Edge Function / provider cancella clients/projects/services/quotes/
  financial_documents/cash_movements (conferma incrociata RAG + verifica).

Soft delete: assente nel progetto (nessun `deleted_at`).

Percorso test-only di perdita dati (noto, nessuna azione): `resetDatabaseViaSql`
in `tests/e2e/support/test-data-controller.ts` usa `TRUNCATE ... CASCADE`.

## Obiettivi

1. Cancellare un `client` NON deve distruggere in silenzio le sue
   `financial_documents`, `projects` e `quotes`.
2. Cancellare un `project` NON deve distruggere in silenzio i suoi `services`.
3. Quando la cancellazione e' bloccata, l'utente deve vedere un ERRORE CHIARO in
   italiano PRIMA di qualsiasi (falso) successo ottimistico — niente Undo
   ingannevole su dati fiscali (Approccio Bambino).
4. Preservare le cascate legittime (spesa km derivata, allocazioni, righe F24,
   log workflow, note, ponti) e il codice che vi si appoggia.
5. Controllo deterministico RED/GREEN versionato nel repo, realmente eseguibile.
6. Fix collaterale: il flip elimina gli eventi Calendar orfani da cascade
   project->services.

## Non-Obiettivi

- Niente soft delete (`deleted_at`): cambiamento piu' ampio, ciclo dedicato se
  servira'.
- Nessuna cancellazione o migrazione di dati esistenti.
- Nessuna modifica a calcolo fiscale, bollo, riconciliazione incassi (TASK 1/2).
- Niente tocco alle FK legacy Atomic CRM (`contacts/companies/deals/sales/tasks/tags`).
- Non rimuovere le tabelle backup `*_backup_20260414`.
- `financial_documents` e `cash_movements` NON hanno UI di delete (non sono
  resource registrate): le loro FK CASCADE verso le allocazioni NON sono
  raggiungibili dall'utente, quindi restano fuori scope in questo ciclo. Se in
  futuro si espone un DeleteButton su queste entita', riaprire un ciclo dedicato.
  (Motivazione corretta rispetto a v1: non e' "basso valore fiscale" — una
  customer_invoice e' insostituibile — ma "non raggiungibile da delete utente".)
- La cancellazione diretta di un singolo `service` resta CONSENTITA e fa cascade
  SOLO sulla spesa km derivata (`expenses.source_service_id`). I flip proteggono
  solo il path padre->figlio (client/project), non il singolo figlio. Idem per
  il singolo `quote`.
- La protezione F24/dichiarazioni resta applicativa (provider), fuori scope FK.

## Fonti Di Verita'

- DB remoto Supabase `qvdmzhyzpyaveniirsmo` (PostgreSQL 17), `pg_constraint`.
- Sorgente reale: migration in `supabase/migrations/`, provider e UI in `src/`.
- Brief deterministico `gestionale-rifinitura-db_2.md` (TASK 4).
- Regole repo in `AGENTS.md` e `.claude/rules/`.

## Invarianti

Riancorati al DATO fiscale, non al contenitore:

- Cancellato (tentato) un `client` con almeno una `financial_document`: la DELETE
  e' BLOCCATA E la fattura sopravvive con `total_amount`, `taxable_amount`,
  `stamp_amount`, `document_number`, `issue_date` invariati.
- Cancellato (tentato) un `client` con `projects`/`quotes`: DELETE bloccata, i
  record sopravvivono; `project_financials.total_paid`/`total_fees` invariati.
- Cancellato (tentato) un `project` con `services`: DELETE bloccata, i service
  sopravvivono; `total_fees` invariato.
- Cancellato un `service` con `km_distance > 0`: la DELETE riesce e la spesa km
  derivata (creata dal trigger) sparisce esattamente una volta (cascade
  legittima preservata).
- Le cascate legittime elencate restano invariate; nessun codice consumer
  (km, allocazioni, F24) si rompe.
- La UI mostra l'errore di blocco PRIMA di un successo ottimistico.
- Migration non distruttiva, replayable da zero, idempotente
  (`DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` con nome canonico esplicito).
- Esattamente UNA FK per colonna dopo la migration, nessuna `confdeltype='c'`
  residua sulle 4 colonne.
- Determinismo: input noto, comando ripetibile, output atteso e stop condition
  dichiarati prima dell'esecuzione.

## Decisione Di Design

Due layer nati insieme (DB + UX della protezione), entrambi nel layer minimo
corretto.

### A. Database (layer principale)

Flip `ON DELETE CASCADE -> NO ACTION` sulle 4 FK, per nome canonico reale:

- `financial_documents_client_id_fkey`
- `projects_client_id_fkey`
- `services_project_id_fkey`
- `quotes_client_id_fkey`

Pattern per ognuna (nomi letti dal live, gia' verificati):

```sql
ALTER TABLE public.<child> DROP CONSTRAINT IF EXISTS <name>;
ALTER TABLE public.<child> ADD  CONSTRAINT <name>
  FOREIGN KEY (<col>) REFERENCES public.<parent>(id);   -- no ON DELETE = NO ACTION
```

Decisione RESTRICT vs NO ACTION -> **NO ACTION**, per coerenza con le protezioni
gia' presenti (`payments`/`expenses` sono tutte NO ACTION). Ai fini del blocco
sono equivalenti (entrambe alzano `foreign_key_violation`; nessuna FK del
progetto e' DEFERRABLE — verificato). Il brief suggeriva RESTRICT in modo
generico; qui vince l'uniformita' di schema (una sola semantica di blocco).
Scelta documentata per evitare drift.

Effetto: un cliente con fatture/progetti/preventivi non e' piu' cancellabile; un
progetto con servizi non e' piu' cancellabile. Coerente con la filosofia
dichiarata ("User deletion is not supported to avoid data loss").

### B. Frontend (UX della protezione)

Sui DeleteButton delle entita' la cui cancellazione e' NEWLY bloccata dai flip:

- estendere `delete-button.tsx` con prop `mutationMode` (default `undoable`) e su
  `clients/ClientShow.tsx:179` e `projects/ProjectShow.tsx:164` usare
  `mutationMode="pessimistic"` PIU' `mutationOptions.onError` che legge
  `error.body.code === '23503'` (PostgREST -> `body.code`, NON `error.code`) e
  mostra un messaggio italiano ("Impossibile eliminare: ci sono fatture, progetti
  o preventivi collegati. Elimina o scollega prima quelli."). NON sono
  alternative: pessimistic serve a far arrivare l'errore PRIMA del falso
  successo, onError serve a renderlo leggibile. Dettaglio implementativo nel
  piano (Step 5).

Estensione di igiene (stesso slice, raccomandata): applicare lo stesso pattern a
`quotes` (QuoteShowActions/QuoteEdit) e al bulk delete di `services`, perche'
possono gia' oggi essere rifiutati da FK NO ACTION pre-esistenti
(`payments.quote_id`) o dai nuovi flip. Marcata come pre-esistente, non
introdotta da TASK 4: il piano decide se includerla o tracciarla come follow-up.

## SOLID

- Single Responsibility: migration = protezione integrita'; modifica UI = UX
  dell'errore di blocco. Responsabilita' separate, stesso slice.
- Open/Closed: si estende il comportamento delle FK e si riusa il pattern
  `pessimistic` esistente; nessuna riscrittura.
- Liskov: shape dati e contratti consumer invariati.
- Interface Segregation: nessuna nuova interfaccia pubblica.
- Dependency Inversion: l'invariante vive nel DB; la UI riflette l'errore, non
  reimplementa la regola.

## Migration Discipline

Hardening migration non distruttiva:

- nessun `DELETE`/`TRUNCATE`/drop di tabella o colonna;
- solo `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` (stesso nome, stessa coppia
  colonna/parent) con semantica delete diversa;
- nessun backfill: NO ACTION vincola solo cancellazioni future, i dati esistenti
  restano validi (0 record orfani verificato);
- replay sicuro: i nomi canonici `<table>_<col>_fkey` coincidono con quelli
  auto-generati inline dalle `CREATE TABLE`, quindi il `DROP IF EXISTS` matcha
  sia su DB live sia su DB fresco;
- verifica finale: per ognuna delle 4 colonne, esattamente UNA FK con
  `confdeltype='a'`, zero `'c'` residue (no doppia FK).

## TDD / Controlli Prima Dell'Implementazione

Cambiamento su dati fiscali/finanziari -> MONEY/FISCAL TDD obbligatorio.

Vincolo di esecuzione (finding bloccante v2): `npx supabase db query --linked`
passa dalla Management API, NON da una sessione psql persistente -> la semantica
`BEGIN; ... ROLLBACK;` cross-statement NON regge. Inoltre un
`foreign_key_violation` ABORTA la transazione corrente.

Soluzione: il controllore e' UN SINGOLO blocco anonimo `DO $$ ... $$` (un solo
statement -> atomico in autocommit, eseguibile con `supabase db query --linked -f`):

1. inserisce un fixture usa-e-getta rispettando TUTTI i NOT NULL/CHECK/UNIQUE
   reali (verificati): `client` (name UNIQUE, client_type valido), `project`
   (category valida), `quote` (service_type, amount), `financial_document`
   (`outbound`/`customer_invoice`, numero+data univoci), `service` del project
   con `km_distance > 0` e `service_type` sicuro (`all_day` ha gia' un default,
   non va fornito);
2. NON inserisce la spesa km a mano: la crea il trigger `sync_service_km_expense`;
   assert che la spesa km esista (cascata legittima funzionante);
3. per ogni FK da proteggere: la DELETE del padre dentro un blocco plpgsql
   `BEGIN DELETE ...; EXCEPTION WHEN foreign_key_violation THEN <PASS>; END;`
   (in plpgsql il blocco `BEGIN/EXCEPTION` E' gia' la subtransazione — NIENTE
   `SAVEPOINT` espliciti, non ammessi). Cattura SPECIFICA di
   `foreign_key_violation`, MAI `WHEN OTHERS` (un fixture malformato 23502/23514
   non deve passare per protezione FK). Se la DELETE riesce (stato RED) -> `RAISE
   EXCEPTION`;
4. assert contenuto fiscale invariato dopo i blocchi: la fattura esiste con i
   campi monetari originali E `project_financials.total_fees` del progetto e'
   invariato (la view che alimenta dashboard e AI);
5. caso positivo: `DELETE <service>` deve RIUSCIRE e la spesa km derivata deve
   sparire (assert: 0 righe km per quel service);
6. cleanup deterministico nel blocco stesso (DELETE figli rimasti -> padri), cosi'
   su SUCCESSO non resta alcun dato e il comando esce 0; su FALLIMENTO il `RAISE`
   fa rollback dell'intero `DO` (nessun dato persiste) ed esce non-zero.

RED atteso (prima della fix): le DELETE dei padri RIESCONO e i figli spariscono
-> il blocco `RAISE`a -> exit non-zero documentato.

GREEN atteso (dopo la fix): tutte le DELETE dei padri sono bloccate, il
contenuto fiscale sopravvive, la cascata km funziona -> exit 0.

## Controllore Di Repo

- `scripts/check-cascade-protection.sql`: il blocco `DO $$` sopra. Eseguibile con
  `npx supabase db query --linked -f scripts/check-cascade-protection.sql`.
- runner `scripts/check-cascade-protection.mjs` (opzionale ma raccomandato, sul
  pattern di `scripts/check-fiscal-backup-rls.sql` + `check-fiscal-backup-rest-anon.mjs`)
  per normalizzare exit-code e messaggi.
- script npm `security:check:cascade-protection` (pattern
  `security:check:fiscal-backups`).
- non in pre-commit: richiede connessione al DB. Il piano dichiara comando esatto
  e output atteso (RED prima, GREEN dopo).

## DeepWiki / RAG Pre-Review

RAG locale interrogato con `model: gemini-2.5-pro` sullo snapshot
`gestionale-rosario-current-20260614` (HEAD `39b3e463`), in due fasi:

1. pre-spec: dove l'app cancella / si affida al cascade (provider, UI, soft delete).
2. review v2: 5 revisori specializzati, 3 query RAG ciascuno (15 query totali),
   ognuno con verifica sul sorgente.

Cosa il RAG ha aggiunto oltre il grep:

- il modello finanziario a due layer e il calcolo `total_paid` dalle allocazioni
  con `payment_semantics_basis` -> cancellare una fattura falsa dashboard e AI;
- il consumer nascosto `services.afterDelete` (Calendar) bypassato dal cascade;
- conferma incrociata che nessuna Edge Function/provider cancella queste entita'
  e che financial_documents/cash_movements non hanno UI di delete -> de-risca il
  finding allocazioni.

Disciplina: il corpus RAG e' code-only e NON indicizza `supabase/migrations/`,
`scripts/`, docs; quindi il RAG e' stato usato come SEGNALE, verificato sul
sorgente. Ha allucinato una migration inesistente
(`20240115100000_add_core_fk_constraints.sql`), smentita dal sorgente: prova che
la verifica e' obbligatoria.

## Rischi

- Controllore non eseguibile (Management API + transazione abortita): mitigato
  dal design single-`DO`-block con SAVEPOINT + cattura 23503 specifica.
- UX falso-successo su dati fiscali: mitigata con `pessimistic`/`onError` su
  Client/Project (in scope).
- Flip della FK sbagliata: lista esplicita "non toccare" + controllore che
  verifica le cascate legittime ancora attive (km).
- Nome constraint non matchato -> doppia FK o nessuna rimozione: mitigato usando
  i nomi canonici reali letti dal live + verifica "una sola FK per colonna".
- Applicazione con history divergente: stessa disciplina del ciclo RLS (verifica
  stato migration prima, niente `db push` alla cieca). La history e' gia' stata
  riconciliata nel ciclo precedente; il piano riconferma e dichiara il metodo.

## Criteri Di Accettazione

- Le 4 FK risultano `confdeltype='a'` (NO ACTION) nel DB, una sola per colonna,
  zero CASCADE residue.
- `check-cascade-protection` passa (falliva prima): client/project con figli ->
  DELETE bloccata; fattura e service sopravvivono con campi invariati; service
  con km -> DELETE ok e km derivata rimossa una volta.
- UI: DELETE bloccata mostra messaggio italiano comprensibile PRIMA di qualsiasi
  successo ottimistico, su ClientShow e ProjectShow.
- `make typecheck`, `make lint`, `npm run continuity:check` e i guardrail
  esistenti passano.
- Migration replayable, nessun dato cancellato.
- Docs canonici aggiornati nello STESSO commit: `docs/architecture.md`,
  `docs/development-continuity-map.md`,
  `docs/contacts-client-project-architecture.md`.

## Review Spec

- v1: FLAG (mono-superficie).
- v2: BLOCK risolto. Questa revisione chiude i 12 finding: controllore
  eseguibile (single-DO + SAVEPOINT + 23503), UX in-scope (pessimistic/onError),
  surface sweep completa, nomi FK canonici dal live, RESTRICT->NO ACTION,
  financial_documents/cash_movements come non-obiettivo motivato, consumer
  cascade registrati, invarianti riancorati al dato fiscale, doc canonici
  nominati, single-service delete dichiarato, percorso test-only annotato.

## Review Gate

1. Review spec: problema/obiettivi/non-obiettivi e lista FK corretti (questa v2).
2. Review piano (MULTI-SUPERFICIE + RAG): non salta RED/GREEN; legge i nomi FK
   reali; controllore single-DO eseguibile via Management API; surface sweep UI
   clients/projects (+ quotes/services se incluso); metodo di applicazione e
   stato history.
3. Review implementazione (MULTI-SUPERFICIE + RAG): SQL mirato, nessuna FK
   legittima toccata, UX corretta, nessuna operazione distruttiva.
4. Review finale: output controllore RED->GREEN + aggiornamento docs.

## Stop Point

Non procedere sul DB remoto se:

- DeepWiki/RAG non usato per piano/review di questo lavoro (fatto per la spec);
- qualcuno propone `db push` senza verificare prima lo stato migration;
- il controllore non e' eseguibile come single-DO o non riproduce il RED;
- l'SQL contiene `DROP`/`DELETE`/`TRUNCATE` di dati o flippa una FK della lista
  "non toccare";
- dopo la migration resta anche una sola `confdeltype='c'` sulle 4 colonne, o
  esiste una doppia FK su una colonna.
