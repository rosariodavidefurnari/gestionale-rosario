# Historical Analytics Handoff

Last updated: 2026-02-28

## Goal

Prepare the CRM for a historical dashboard and future AI analysis by introducing:

- a semantic analytics layer,
- aggregate Supabase views,
- a dedicated `Storico` dashboard mode,
- and continuity docs that survive chat/session resets.

## How To Resume In A New Chat

Use a prompt like this:

```text
Leggi docs/historical-analytics-handoff.md, docs/historical-analytics-backlog.md e doc/src/content/docs/developers/historical-analytics-ai-ready.mdx.
Poi continua dal primo punto aperto del backlog, senza ridefinire l'architettura già approvata.
Se fai cambi strutturali, aggiorna anche i file di handoff/backlog/learnings/progress.
```

Minimal reading order for a new session:

1. `docs/historical-analytics-handoff.md`
2. `docs/historical-analytics-backlog.md`
3. `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
4. `progress.md`
5. `learnings.md`

## What Was Completed

### Product and semantic rules locked in code/docs

- Historical analytics basis v1 is `compensi per competenza`, not `incassi`.
- Current year is always treated as `YTD`.
- `YoY` is computed only on the last two closed years.
- `YoY` returns `N/D` when:
  - there are fewer than two closed years,
  - or the comparison baseline is `0`.

Reference spec:

- `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`

### Supabase aggregate views added

Migration created:

- `supabase/migrations/20260228133000_historical_analytics_views.sql`

Views introduced:

- `analytics_business_clock`
- `analytics_history_meta`
- `analytics_yearly_competence_revenue`
- `analytics_yearly_competence_revenue_by_category`
- `analytics_client_lifetime_competence_revenue`

### Frontend implementation added

New dashboard modules:

- `src/components/atomic-crm/dashboard/DashboardAnnual.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistorical.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalKpis.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalRevenueChart.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalCategoryMixChart.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalTopClientsCard.tsx`
- `src/components/atomic-crm/dashboard/useHistoricalDashboardData.ts`
- `src/components/atomic-crm/dashboard/dashboardHistoryModel.ts`

Existing shells updated:

- `src/components/atomic-crm/dashboard/Dashboard.tsx`
- `src/components/atomic-crm/dashboard/MobileDashboard.tsx`

Provider update:

- `src/components/atomic-crm/providers/supabase/dataProvider.ts`

### AI-ready semantic layer added

New library files:

- `src/lib/analytics/analyticsDefinitions.ts`
- `src/lib/analytics/buildAnalyticsContext.ts`

Provider entry point added:

- `dataProvider.getHistoricalAnalyticsContext()`
- `dataProvider.generateHistoricalAnalyticsSummary()`

First end-user consumer added:

- `src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.tsx`

OpenAI server-side integration added:

- edge function: `supabase/functions/historical_analytics_summary/index.ts`
- settings section: `src/components/atomic-crm/settings/AISettingsSection.tsx`

Purpose:

- centralize metric definitions,
- expose a structured context object for future AI analysis,
- prevent the AI from inferring business semantics from raw tables.

Current behavior:

- the AI context now includes `meta`, `metrics`, `series`, `qualityFlags`, and
  human-readable `caveats`,
- the first delivery surface is the custom data-provider method above,
- the historical dashboard now has a manual `Analisi AI` card that calls the
  edge function only on user action,
- the chosen model is configured in Settings and defaults to `gpt-5.2`,
- there is still no conversational assistant/chat flow in the UI.

### Tests added

- `src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`

Covered today:

- current year treated as YTD,
- YoY based on last two closed years,
- zero-baseline YoY returns `N/D`,
- analytics context serialization.

## Validation Done

Successful commands:

- `npm run typecheck`
- `npm test -- --run src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npx supabase db push`
- `curl` verification against remote PostgREST with the linked project `service_role`
  key
- `npx supabase secrets set OPENAI_API_KEY ... SB_PUBLISHABLE_KEY ... --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy historical_analytics_summary --project-ref qvdmzhyzpyaveniirsmo`

### Remote verification completed on linked project

Verified on `2026-02-28` against project `qvdmzhyzpyaveniirsmo`:

- `analytics_history_meta` returns:
  - `as_of_date: 2026-02-28`
  - `first_year_with_data: 2024`
  - `last_year_with_data: 2025`
  - `current_year: 2026`
  - `has_current_year_data: false`
- `analytics_yearly_competence_revenue` returns:
  - `2024 => €3,118`
  - `2025 => €20,582`
  - `2026 YTD => €0`
- `analytics_yearly_competence_revenue_by_category` returns non-zero historical
  values for:
  - `produzione_tv`
  - `spot`
- `analytics_client_lifetime_competence_revenue` returns:
  - `Diego Caltabiano => €23,700`

Derived historical KPI check from the remote rows:

- `best_closed_year = 2025`
- `latest_closed_year_revenue = €20,582`
- `YoY closed years = 2025 vs 2024 = +560%`

Important nuance:

- the same queries executed with the publishable/anon key return empty arrays,
- this is expected because the historical views use `security_invoker=on` and
  the underlying `clients/projects/services` tables are protected by RLS for
  anonymous users,
- therefore, empty anon responses are not evidence that the migration failed.

Inference from the repository policies:

- authenticated users should see the historical rows in the real app runtime,
  because `public.clients`, `public.projects`, and `public.services` all have
  `Authenticated full access` policies in
  `supabase/migrations/20260225180000_gestionale_schema.sql`,
- this session also verified the first OpenAI flow end-to-end with a temporary
  authenticated remote user:
  - authenticated reads to the historical views succeeded,
  - `historical_analytics_summary` returned `200 OK`,
  - the selected model resolved to `gpt-5.2`,
  - and the generated markdown summary correctly framed `2026` as `YTD` and
    `2025 vs 2024` as the closed-year comparison,
- this session still did not run a full browser UI smoke test in this
  environment.

### Remote AI runtime note

The first remote invocation of `historical_analytics_summary` failed with:

- `401 Error: supabaseKey is required.` after deploy, because the shared auth
  middleware expected `SB_PUBLISHABLE_KEY` and the project only had the default
  Supabase secrets,
- then `500 OPENAI_API_KEY non configurata nelle Edge Functions`, because the
  OpenAI secret was not actually present on the linked project even though the
  local `.env` files contained it.

Fix actually applied:

- `_shared/authentication.ts` now falls back to `SUPABASE_ANON_KEY` when
  `SB_PUBLISHABLE_KEY` is absent,
- remote secrets were explicitly set for:
  - `SB_PUBLISHABLE_KEY`
  - `OPENAI_API_KEY`
- the function was redeployed after the auth fix,
- and the remote smoke test passed afterwards.

## Environment Blockers

### Supabase migration state

- Remote state:

- the historical analytics migration was pushed successfully to the linked remote project:
  - `project_ref: qvdmzhyzpyaveniirsmo`
  - applied migration:
    - `20260228133000_historical_analytics_views.sql`

- Local state:

- there is still no local database available in this environment,
- `npx supabase status` failed with `Cannot connect to the Docker daemon`.

Impact:

- the remote database now contains the new `analytics_*` views,
- frontend/runtime verification should target the remote environment until a local DB exists.

Next command only if a local DB is introduced later:

```bash
npx supabase migration up
```

### Docs site build not verified end-to-end

Reason:

- `doc/` environment is missing the local `astro` binary in this workspace snapshot.

Impact:

- the MDX spec file was written and formatted,
- but the docs site build itself was not verified in this session.

## Known Risks / Open Edges

- Browser-level smoke for the `Storico` tab was not executed in this
  environment, even though the remote analytics resources and the AI function
  were verified.
- FakeRest/demo historical resources remain unimplemented, but this is now
  explicitly de-prioritized for the current product scope.
- The OpenAI summary flow is deployed, but it was not exercised end-to-end from
  an authenticated browser session in this environment.
- The assistant-ready payload exists, but no conversational chat flow exists
  yet.
- Component-level UI tests for the new history widgets are still missing.

## Recommended Next Session Order

Stable rollback note:

- after this session is pushed, treat that commit as the known-good fallback for
  the historical AI flow,
- if a future change breaks the runtime or semantics, return to that pushed
  commit before investigating forward again.

1. Execute an authenticated browser smoke test of `Storico -> Analisi AI` and
   refine prompt/copy only if the rendered output looks weak in the real UI.
2. Add UI tests for empty/error/historical rendering states.
3. Only later, if useful, evolve the summary card into a conversational
   assistant flow.
4. Only later, if the product scope changes, revisit FakeRest/demo historical
   support.

## Quick Resume Checklist

- Read the spec:
  - `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
- Read this handoff:
  - `docs/historical-analytics-handoff.md`
- Read the backlog:
  - `docs/historical-analytics-backlog.md`
- Then continue from:
  - browser click-test of `Storico -> Analisi AI`
  - UI tests for historical widgets
