# Migration History Reconciliation - Design Spec

Data: 2026-06-14
Stato: completed, riconciliazione applicata e verificata via Supabase MCP

## Problema

La migration history Supabase non era allineata tra repo locale e remoto.

Stato iniziale verificato con `npx supabase migration list --linked --output pretty`:

- remote-only: `20260414192200`
- local-only: `20260414211500`
- local-only: `20260614150557`

Questo bloccava `npx supabase db push`: usarlo in quello stato avrebbe potuto applicare o saltare
migration in modo non deterministico rispetto allo stato reale dello schema.

## Esito Finale

La riconciliazione e' stata completata senza `db push`, senza `db reset` e senza
nuove modifiche schema/dati.

Azioni effettive:

- configurato e autenticato MCP ufficiale Supabase per il gestionale:
  `supabase-gestionale`
- project ref corretto:
  `qvdmzhyzpyaveniirsmo`
- corretto errore iniziale di configurazione MCP:
  - ref errato `qvdmzhyzpyaveniirsmos` (21 caratteri);
  - feature errata `edge-functions`, sostituita con `functions`.
- creato localmente:
  `supabase/migrations/20260414192200_fiscal_interests_and_compensation.sql`
  usando il contenuto gia' registrato nella history remota;
- rimosso localmente:
  `supabase/migrations/20260414211500_fiscal_interests_and_compensation.sql`
  perche' era lo stesso fatto storico con timestamp locale fantasma;
- registrato in `supabase_migrations.schema_migrations` il metadata della
  migration RLS gia' applicata:
  `20260614150557_harden_fiscal_backup_rls`;
- verificato via MCP `supabase-gestionale/execute_sql`:

```json
[
  {
    "version": "20260414192200",
    "name": "fiscal_interests_and_compensation",
    "statements_count": 1
  },
  {
    "version": "20260614150557",
    "name": "harden_fiscal_backup_rls",
    "statements_count": 1
  }
]
```

`20260414211500` non risulta piu' nella history remota e non resta nel repo.

## Contesto

`20260414192200_fiscal_interests_and_compensation.sql` esiste localmente e tocca
fiscalita':

- estende `fiscal_obligations.component` con `interessi_erario` e
  `interessi_inps`
- aggiunge `fiscal_f24_submissions.compensation_credit`
- ricrea `fiscal_f24_payment_lines_enriched` con `security_invoker = on`

`20260614150557_harden_fiscal_backup_rls.sql` esiste localmente ed e' stato
applicato al remoto via:

```bash
npx supabase db query --linked -f supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql
```

La history remota ora lo registra come migration applicata.

## Evidenze Read-Only

DeepWiki/RAG:

- interrogato con `model: gemini-2.5-pro`
- snapshot stale rispetto al working tree:
  - DeepWiki clone: `e4aa581af58c900c27fe55a4191e0c7f4ee9b4b0`
  - working tree: `7694296d269293eb78d845885665864131738e6a`
- utile per superfici storiche indicizzate, non per i nuovi file di questa
  sessione

Verifica reale con `rg` prima della riconciliazione:

- `Makefile` contiene `remote-deploy-supabase` con `npx supabase db push`
- `Makefile` contiene `supabase-reset-database` con `npx supabase db reset` +
  load di `supabase/seed_domain_data.sql`
- `AGENTS.md` contiene regole su migration replayable, additive e indipendenti
- `docs/development-continuity-map.md`, `docs/architecture.md` e
  `docs/CANTIERE.md` registrano l'hardening RLS e la divergenza history
- `supabase/migrations/20260414211500_fiscal_interests_and_compensation.sql`
  era la local-only fiscale con timestamp fantasma
- `supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql` e' la
  local-only RLS gia' applicata via query mirata

Verifica schema remoto read-only:

```sql
with checks as (
  select 'compensation_credit_column' as check_name,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'fiscal_f24_submissions'
        and column_name = 'compensation_credit'
    ) as ok
  union all
  select 'enriched_view_compensation_credit',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'fiscal_f24_payment_lines_enriched'
        and column_name = 'compensation_credit'
    )
  union all
  select 'obligations_interessi_erario_allowed',
    exists (
      select 1 from pg_constraint
      where conname = 'fiscal_obligations_component_check'
        and pg_get_constraintdef(oid) like '%interessi_erario%'
    )
  union all
  select 'obligations_interessi_inps_allowed',
    exists (
      select 1 from pg_constraint
      where conname = 'fiscal_obligations_component_check'
        and pg_get_constraintdef(oid) like '%interessi_inps%'
    )
  union all
  select 'backup_rls_guard_green',
    not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'fiscal_declarations_backup_20260414',
          'fiscal_obligations_backup_20260414',
          'fiscal_f24_submissions_backup_20260414',
          'fiscal_f24_payment_lines_backup_20260414'
        )
        and c.relrowsecurity is not true
    )
)
select * from checks order by check_name;
```

Risultato osservato:

- tutti i check sono `ok = true`

Questo indicava che l'effetto della migration fiscale e la migration RLS
risultavano gia' applicati nello schema remoto, pur non essendo interamente
coerenti con la history locale.

## Obiettivi

1. Portare il repo ad avere il file della remote-only `20260414192200`.
2. Rimuovere il timestamp locale fantasma `20260414211500`.
3. Registrare nella history remota la migration RLS gia' applicata allo schema.
4. Rendere di nuovo possibile usare `db push --dry-run` come controllo
   deterministico.
5. Non modificare dati o schema in questo ciclo, salvo la tabella di migration
   history se tutte le prove sono verdi.

## Non-Obiettivi

- Non applicare nuove migration di schema.
- Non usare `npx supabase db push`.
- Non usare `--include-all`.
- Non fare `db reset`.
- Non cambiare seed, dati fiscali, dashboard, UI o provider.
- Non cancellare o riscrivere migration esistenti.

## Decisione Di Design

Procedere con una riconciliazione in due parti:

1. Ricostruzione locale della migration remota `20260414192200` dal contenuto
   gia' registrato in `supabase_migrations.schema_migrations`.
2. Rimozione del file locale con timestamp fantasma `20260414211500`.
3. Inserimento idempotente nella history remota del metadata
   `20260614150557`, solo perche' le prove schema confermavano che la migration
   RLS era gia' effettivamente presente nel remoto.

Questa e' una riconciliazione di history, non una nuova modifica schema.

## Migration Discipline

La regola progetto resta:

- migration additive e indipendenti;
- no distruzione dati;
- replay da zero;
- no dipendenza da stato manuale non dichiarato.

Per questa spec, una modifica manuale alla history e' ammessa solo come
operazione di metadata quando lo schema remoto dimostra gia' la presenza della
migration. Se una prova schema fallisce, marcare la migration come applicata e'
vietato.

## Rischi

- una ricostruzione della history puo' produrre un file diverso da quello
  atteso: va revisionato.
- marcare metadata come applied puo' mentire alla history se lo schema non e'
  davvero allineato.
- `db push` con history divergente resta vietato.
- La remote-only `20260414192200` potrebbe contenere SQL non additive: anche se
  e' gia' applicata sul remoto, va trattata come fatto storico da documentare.
- il comando `npx supabase migration list --linked --output pretty` puo'
  fallire per auth/circuit breaker del ruolo temporaneo CLI; in quel caso usare
  MCP Supabase per verificare lo stato prima di qualunque azione metadata.

## Criteri Di Accettazione

- `20260414192200` esiste localmente in `supabase/migrations/`.
- `20260414211500` non esiste piu' localmente.
- Le prove schema per l'effetto fiscale e per `20260614150557` sono verdi prima
  della modifica metadata.
- Supabase MCP conferma che la history remota contiene `20260414192200` e
  `20260614150557`.
- La comparison local-vs-remote delle versioni non mostra divergenze.
- I controllori RLS backup restano verdi.
- `docs/CANTIERE.md` viene aggiornato con la prossima azione reale.

## Stop Point

Fermarsi se:

- il contenuto remoto di `20260414192200` non e' ricostruibile o non e'
  leggibile;
- il file fetchato e' vuoto, incomprensibile o confligge con
  `20260414211500`;
- una prova schema per l'effetto fiscale o per `20260614150557` fallisce;
- la modifica metadata richiede di marcare come applied una migration non
  provata;
- `db push --dry-run` propone di applicare SQL non previsto;
- `migration list` fallisce per auth, password mancante o circuit breaker;
- un sub-agente/review segnala BLOCK.

## Review Spec

Esito interno: completata con deviazione controllata dal piano originale.

Controlli eseguiti:

- DeepWiki/RAG interrogato prima della spec;
- claim RAG verificati con `rg` e sorgente reale;
- history remota letta via MCP `supabase-gestionale/execute_sql`;
- schema remoto verificato read-only;
- mutazione remota limitata a metadata `supabase_migrations.schema_migrations`
  per `20260614150557`.
