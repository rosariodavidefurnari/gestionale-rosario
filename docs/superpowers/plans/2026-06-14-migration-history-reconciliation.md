# Migration History Reconciliation Implementation Plan

Status: completed
Date: 2026-06-14

**Goal:** reconcile Supabase migration history after the fiscal backup RLS hardening without changing product schema or data.

**Architecture:** Metadata reconciliation only. No `db push`, no `db reset`, no new schema changes.

**Execution Note:** The original CLI repair path was blocked by Supabase CLI password/circuit-breaker behavior. The final implementation used the official Supabase MCP server `supabase-gestionale` for verification and a targeted metadata insert for the already-applied RLS migration.

---

## Final State

- Remote migration history contains:
  - `20260414192200_fiscal_interests_and_compensation`
  - `20260614150557_harden_fiscal_backup_rls`
- Local migration directory contains:
  - `supabase/migrations/20260414192200_fiscal_interests_and_compensation.sql`
  - `supabase/migrations/20260614150557_harden_fiscal_backup_rls.sql`
- Local phantom timestamp removed:
  - `supabase/migrations/20260414211500_fiscal_interests_and_compensation.sql`

## Completed Tasks

- [x] Confirmed fiscal schema effects existed on the remote database before metadata reconciliation:
  - `fiscal_f24_submissions.compensation_credit`
  - `fiscal_f24_payment_lines_enriched.compensation_credit`
  - `fiscal_obligations_component_check` includes `interessi_erario`
  - `fiscal_obligations_component_check` includes `interessi_inps`
  - fiscal backup RLS guard is green
- [x] Configured clean Supabase MCP:
  - server name: `supabase-gestionale`
  - project ref: `qvdmzhyzpyaveniirsmo`
  - features: `database,docs,debugging,development,functions`
- [x] Verified MCP with native tool call:
  - `mcp__supabase_gestionale.execute_sql`
  - `select current_setting('server_version')` -> PostgreSQL `17.6`
- [x] Verified remote migration history with native MCP:
  - `mcp__supabase_gestionale.list_migrations`
- [x] Recreated local `20260414192200_fiscal_interests_and_compensation.sql` from the SQL stored in remote migration history.
- [x] Removed local phantom `20260414211500_fiscal_interests_and_compensation.sql`.
- [x] Registered remote metadata for already-applied `20260614150557_harden_fiscal_backup_rls`.
- [x] Verified local/remote migration versions have no known divergence.
- [x] Re-ran RLS metadata guard:
  - `npm run security:check:fiscal-backups`
- [x] Re-ran REST anon guard:
  - `npm run security:check:fiscal-backups:rest`
- [x] Re-ran continuity check:
  - `npm run continuity:check`
- [x] Re-ran typecheck:
  - `make typecheck`

## Verification Results

- `npm run security:check:fiscal-backups`: pass
- `npm run security:check:fiscal-backups:rest`: pass
  - all four fiscal backup tables return `401`
  - no `Content-Range`
- `npm run continuity:check`: pass
- `make typecheck`: pass
- Supabase MCP migration history: pass

## Important Decisions

- Do not resurrect `20260414211500`; the canonical migration timestamp is now `20260414192200`.
- Do not use `db push` to solve history drift.
- Do not use `apply_migration` for this already-applied schema state.
- For this repo, the canonical MCP server is `supabase-gestionale`, not a generic `supabase` server.

## Residual Notes

- `.vscode/mcp.json` is local/ignored in this repo; it was aligned on disk for operator ergonomics, but it will not be part of the commit unless tracking rules change.
- The Supabase CLI still warns that v2.106.0 is available while v2.90.0 is installed. This did not block the completed MCP path.
