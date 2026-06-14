# Fiscal Backup RLS Hardening Implementation Plan

> **For agentic workers:** Execute this plan step by step. Do not skip the RED
> checks, review gates, migration-history gate, or final verification. This plan
> is intentionally deterministic because it touches fiscal/security data.
> Migrations must stay additive and independent.

**Goal:** close public and generic authenticated access to fiscal backup tables
without deleting data or changing business semantics.

**Status:** completed on 2026-06-14.

**Spec:** `docs/superpowers/specs/2026-06-14-fiscal-backup-rls-hardening-design.md`

**Architecture:** database-only hardening. RLS and privileges are enforced in
Postgres/Supabase, with no UI/provider/Edge Function changes in this cycle.

**Tech Stack:** Supabase CLI, PostgreSQL metadata queries, Supabase REST API,
project documentation.

## Phase 0 - DeepWiki / RAG Gate

Purpose: scovare superfici che una ricerca testuale o la memoria dell'agente
potrebbero saltare prima di validare spec e piano.

Query eseguite con `model: gemini-2.5-pro`:

- riferimenti a `fiscal_*_backup_20260414` e pattern `_backup_YYYYMMDD`
- superfici esistenti per Supabase security, RLS, migration, continuity check e
  guardrail

Staleness:

- clone DeepWiki: `e4aa581af58c900c27fe55a4191e0c7f4ee9b4b0`
- working tree: `7694296d269293eb78d845885665864131738e6a`
- conseguenza: ogni claim RAG va verificato sul sorgente reale prima di usarlo.

Verifica reale:

```bash
rg -n "backup_20260414|fiscal_.*backup|_backup_[0-9]{8}|fiscal_declarations_backup|fiscal_obligations_backup|fiscal_f24" src supabase scripts tests package.json docs
```

Risultato:

- nessun consumer runtime applicativo delle tabelle backup fiscali;
- prima dei controllori, riferimenti backup verificati solo in
  `scripts/fiscal-reconciliation-2026-04-14.sql`, come commenti di restore;
- dopo i controllori, riferimenti attesi anche in:
  - `scripts/check-fiscal-backup-rls.sql`
  - `scripts/check-fiscal-backup-rest-anon.mjs`
  - `package.json`
- il runtime usa tabelle fiscali reali e view enriched.

Stop condition:

- se un nuovo RAG o `rg` trova consumer runtime delle backup, fermarsi e
  aggiornare spec e piano prima di applicare qualunque SQL.

## Review Gate 0 - Spec Review

- [x] Spec exists before plan.
- [x] Spec has internal review.
- [x] DeepWiki/RAG was queried before accepting the review.
- [x] RAG claims were verified against the real source.
- [x] User confirms/authorizes execution by continuing the workflow.

## Phase 1 - RED: Prove The Current Exposure

Purpose: prove the problem before implementation.

Input:

- remote Supabase project `qvdmzhyzpyaveniirsmo`
- anon REST access
- metadata queries against remote Postgres

Commands/queries:

```bash
npx supabase migration list --linked --output pretty
```

Expected known result:

- remote-only migration `20260414192200`
- local-only migration `20260414211500`

Stop condition:

- if more migration divergence appears, stop and update this plan before any
  migration or remote SQL.

Metadata RED query:

```sql
select
  c.relname,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'fiscal_declarations_backup_20260414',
    'fiscal_obligations_backup_20260414',
    'fiscal_f24_submissions_backup_20260414',
    'fiscal_f24_payment_lines_backup_20260414'
  )
order by c.relname;
```

Expected RED:

- every existing table returns `rls_enabled = false`

Grant RED query:

```sql
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'fiscal_declarations_backup_20260414',
    'fiscal_obligations_backup_20260414',
    'fiscal_f24_submissions_backup_20260414',
    'fiscal_f24_payment_lines_backup_20260414'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expected RED:

- rows exist for `anon` and/or `authenticated`
- `SELECT` is present

REST RED command:

```bash
npm run security:check:fiscal-backups:rest
```

Il comando usa `scripts/check-fiscal-backup-rest-anon.mjs`, carica
`.env.production`, invia REST GET anon con `Range: 0-0` e non stampa body.

Expected RED already observed:

- `fiscal_declarations_backup_20260414`: HTTP `206`, `Content-Range: 0-0/4`
- `fiscal_obligations_backup_20260414`: HTTP `206`, `Content-Range: 0-0/37`
- `fiscal_f24_submissions_backup_20260414`: HTTP `206`, `Content-Range: 0-0/21`
- `fiscal_f24_payment_lines_backup_20260414`: HTTP `206`, `Content-Range: 0-0/39`
- command fails with `4 table(s) still return 2xx responses`

## Phase 2 - Repo Controllers RED

Purpose: turn the RLS/grant rule into an executable guardrail before the fix.

Created:

- `scripts/check-fiscal-backup-rls.sql`
- `scripts/check-fiscal-backup-rest-anon.mjs`

Package scripts:

```bash
npm run security:check:fiscal-backups
npm run security:check:fiscal-backups:rest
```

Controller scope:

- fails if any target table is missing;
- fails if any target table has RLS disabled;
- fails if any policy exists on the backup tables;
- fails if `anon` or `authenticated` keep effective
  `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` privileges, including via `PUBLIC`;
- fails if REST anon returns any `2xx` response for the backup tables.

RED observed:

```bash
npm run security:check:fiscal-backups
npm run security:check:fiscal-backups:rest
```

Observed RED:

- metadata command fails with
  `Fiscal backup RLS check failed: 4 target table(s) have RLS disabled`
- REST command fails with four `206` responses and positive `Content-Range`

Stop condition:

- if either controller passes before the fix, it is testing the wrong thing;
  stop and review before continuing.

## Phase 3 - Migration-History Gate

Purpose: avoid applying unexpected migrations.

Required decision before remote apply:

- Option A: reconcile/fetch migration history first, then use `db push` after
  dry-run review.
- Option B: apply only the reviewed hardening SQL file directly with
  `npx supabase db query --linked`, then resolve migration history separately.

Decision for this cycle:

- use Option B for the immediate security hardening;
- do not run `npx supabase db push` while history is divergent;
- keep the hardening SQL as a replayable migration file in the repo;
- leave full migration history reconciliation as the next tracked Cantiere item.

Actual apply:

```bash
npx supabase db query --linked -f supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql
```

Result: applied successfully on remote.

Stop condition:

- do not run `npx supabase db push` while the known migration divergence is
  unresolved.

## Phase 4 - Write The Minimal Migration

Purpose: create the smallest replayable SQL that closes the exposure.

Command:

```bash
npx supabase migration new harden_fiscal_backup_rls
```

Expected output:

- one new file in `supabase/migrations/` with suffix
  `_harden_fiscal_backup_rls.sql`

SQL to insert:

```sql
-- Harden fiscal backup tables exposed through the public schema.
-- No data is deleted and no permissive policies are created.

do $$
begin
  if to_regclass('public.fiscal_declarations_backup_20260414') is not null then
    execute 'alter table public.fiscal_declarations_backup_20260414 enable row level security';
    execute 'revoke all on table public.fiscal_declarations_backup_20260414 from anon, authenticated, public';
  end if;

  if to_regclass('public.fiscal_obligations_backup_20260414') is not null then
    execute 'alter table public.fiscal_obligations_backup_20260414 enable row level security';
    execute 'revoke all on table public.fiscal_obligations_backup_20260414 from anon, authenticated, public';
  end if;

  if to_regclass('public.fiscal_f24_submissions_backup_20260414') is not null then
    execute 'alter table public.fiscal_f24_submissions_backup_20260414 enable row level security';
    execute 'revoke all on table public.fiscal_f24_submissions_backup_20260414 from anon, authenticated, public';
  end if;

  if to_regclass('public.fiscal_f24_payment_lines_backup_20260414') is not null then
    execute 'alter table public.fiscal_f24_payment_lines_backup_20260414 enable row level security';
    execute 'revoke all on table public.fiscal_f24_payment_lines_backup_20260414 from anon, authenticated, public';
  end if;
end $$;
```

Stop condition:

- if implementation requires `DROP`, `DELETE`, `TRUNCATE` or a permissive
  policy, stop and revise the spec.
- if implementation depends on manual remote state beyond the optional presence
  of the target backup tables, stop and revise the spec.

## Review Gate 1 - Plan Review

- [x] Plan references the spec.
- [x] Plan includes RED before GREEN.
- [x] Plan creates a repo controller before the fix.
- [x] Plan includes deterministic commands/queries and expected outputs.
- [x] Plan includes migration-history stop condition.
- [x] Plan does not apply SQL automatically.
- [x] Plan review includes the DeepWiki/RAG gate.
- [x] User confirms/authorizes implementation by continuing the workflow.

## Phase 5 - GREEN: Apply Only After Approval

Allowed only after:

- spec accepted;
- plan accepted;
- migration SQL reviewed;
- migration-history option selected.

If Option A is selected:

```bash
npx supabase db push --dry-run
```

Review expected operations. If only the intended migration is pending and the
history issue is resolved:

```bash
npx supabase db push
```

If Option B is selected:

```bash
migration_file="$(find supabase/migrations -name '*_harden_fiscal_backup_rls.sql' -print | sort | tail -n 1)"
test -n "$migration_file"
npx supabase db query --linked -f "$migration_file"
```

Stop condition:

- if dry-run contains unrelated migrations, stop.
- if `migration_file` is empty or points to more than one plausible file, stop
  and inspect `supabase/migrations/` before applying anything.
- if direct query errors, stop and do not retry with modified SQL without
  another implementation review.

## Review Gate 2 - Implementation Review

Before verification, inspect the applied SQL or migration file:

- [x] only four expected tables are referenced;
- [x] RLS is enabled;
- [x] privileges are revoked from `anon` and `authenticated`;
- [x] privileges are revoked from `PUBLIC`;
- [x] no permissive policy is created;
- [x] no data mutation or destructive statement exists;
- [x] migration is additive and independent;
- [x] docs touched in same work unit.

## Phase 6 - GREEN Verification

Run metadata query again.

Expected GREEN:

- every existing target table has `rls_enabled = true`

Run grant query again.

Expected GREEN:

- zero rows for `anon` and `authenticated`

Run REST anon GET again with `Range: 0-0`.

Expected GREEN:

- no row bodies are returned;
- response is denied or otherwise cannot expose table data/counts.

Stop condition:

- if REST still returns `206` and a positive `Content-Range`, the fix failed.

Run controller again:

```bash
npm run security:check:fiscal-backups
```

Expected GREEN:

- command passes;
- output includes `Fiscal backup RLS check passed`.

Actual GREEN:

- `npm run security:check:fiscal-backups` passes.
- `npm run security:check:fiscal-backups:rest` passes.
- REST anon returns `401` and no `Content-Range` for all four backup tables.

## Phase 7 - Documentation

Update continuity docs in the same change set:

- `docs/architecture.md`: security note for fiscal backup tables.
- `docs/development-continuity-map.md`: record the RLS hardening and migration
  history caution.
- `docs/gestionale-roadmap-generale.md`: mark the immediate RLS risk as
  handled only after GREEN verification.

## Review Gate 3 - Final Review

- [x] RED evidence recorded without leaking row contents.
- [x] GREEN evidence recorded.
- [x] migration-history decision recorded.
- [x] docs updated.
- [x] no unrelated refactor included.

## Final Verification

Commands:

```bash
make typecheck
npm run continuity:check
```

Expected:

- typecheck passes or is explicitly irrelevant because no TS changed;
- continuity check passes with docs included.

Actual:

- `make typecheck` passes.
- `npm run continuity:check` passes.
- `npm run security:check:fiscal-backups` passes.
- `npm run security:check:fiscal-backups:rest` passes.

Stop condition:

- do not commit if continuity check fails for missing docs.
