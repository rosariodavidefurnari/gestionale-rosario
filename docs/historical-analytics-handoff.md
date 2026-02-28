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
- `dataProvider.askHistoricalAnalyticsQuestion()`

First end-user consumer added:

- `src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.tsx`

OpenAI server-side integration added:

- edge function: `supabase/functions/historical_analytics_summary/index.ts`
- edge function: `supabase/functions/historical_analytics_answer/index.ts`
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
- the same card now supports both:
  - a guided summary flow,
  - and a single-turn free question flow constrained to historical data only,
- the chosen model is configured in Settings and defaults to `gpt-5.2`,
- the visible dashboard copy is now translated into plain Italian for a
  non-expert business owner,
- the AI prompt now explicitly avoids jargon and explains terms like `YTD`,
  `YoY`, and `competenza` in simpler language,
- the AI card now renders markdown lists with clearer bullets and spacing,
- the Q&A flow includes suggested questions, a `300` character limit, and no
  memory between turns,
- there is still no multi-turn conversational assistant/chat flow in the UI.

### Tests added

- `src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx`

Covered today:

- current year treated as YTD,
- YoY based on last two closed years,
- zero-baseline YoY returns `N/D`,
- analytics context serialization,
- parent historical empty state,
- parent historical error state with retry,
- contextual YoY warning rendering,
- widget-level error states,
- widget-level empty states,
- YoY `N/D` UI rendering,
- guided summary trigger/render,
- suggested-question trigger/render for the historical AI card.

## Validation Done

Successful commands:

- `npm run typecheck`
- `npm test -- --run src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npx supabase db push`
- `curl` verification against remote PostgREST with the linked project `service_role`
  key
- `npx supabase secrets set OPENAI_API_KEY ... SB_PUBLISHABLE_KEY ... --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy historical_analytics_summary --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy historical_analytics_answer --project-ref qvdmzhyzpyaveniirsmo`

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
- this session also verified the new single-turn Q&A flow end-to-end with a
  temporary authenticated remote user:
  - authenticated reads to the historical views succeeded,
  - `historical_analytics_answer` returned `200 OK`,
  - the selected model resolved to `gpt-5.2`,
  - an example question `Perché il 2025 è andato meglio del 2024?` returned the
    expected sections:
    - `## Risposta breve`
    - `## Perché lo dico`
    - `## Cosa controllare adesso`
  - the generated answer avoided raw `YTD` / `YoY` jargon and instead used
    plain wording such as `valore del lavoro attribuito a quell'anno` and
    `crescita rispetto all'anno prima`,
- browser evidence collected on `2026-02-28` also confirms the real
  authenticated UI path:
  - the `Storico` dashboard renders KPIs, charts, top clients, and context
    cards correctly,
  - the `Analisi AI dello storico` card renders a generated answer in-browser,
  - the visible answer remains aligned with the approved semantics,
- therefore the guided historical AI summary flow is now verified both at
  remote runtime level and at browser click-path level,
- the new free-question flow is verified at remote runtime level, but in this
  session it was not click-tested manually in the browser.
- after the plain-language prompt rewrite, the remote function was redeployed
  and returned a simpler answer starting with:
  - `## In breve`
  - plain wording like `valore del lavoro`, `anno in corso fino a oggi`, and
    `crescita rispetto all'anno prima`

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

Additional runtime note for the Q&A flow:

- the first authenticated smoke invocation of `historical_analytics_answer`
  returned `404 Requested function was not found`,
- the root cause was simple: the new function existed locally but had not yet
  been deployed to the linked Supabase project,
- fix applied:
  - `npx supabase functions deploy historical_analytics_answer --project-ref qvdmzhyzpyaveniirsmo`
- re-test immediately after deploy returned `200 OK`.

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

- FakeRest/demo historical resources remain unimplemented, but this is now
  explicitly de-prioritized for the current product scope.
- The assistant-ready payload exists, and a single-turn historical Q&A flow now
  exists, but no multi-turn conversational chat flow exists yet.
- The browser output is now understandable for non-expert users, but markdown
  readability may still deserve further polish only if product wants a denser
  or more scannable layout.
- The free-question path was smoke-tested remotely but not manually click-tested
  in the browser during this session.

## Recommended Next Session Order

Stable rollback note:

- after this session is pushed, treat that commit as the known-good fallback for
  the historical AI flow,
- if a future change breaks the runtime or semantics, return to that pushed
  commit before investigating forward again.

1. Only if useful after review, manually click-test the new free-question path
   in the browser and collect evidence.
2. Only if useful after review, polish prompt/copy or markdown presentation of
   the AI card further.
3. Keep the new historical UI tests updated whenever the widgets evolve.
4. Only later, if useful, evolve the current single-turn card into a
   conversational assistant flow.
5. Only later, if the product scope changes, revisit FakeRest/demo historical
   support.

## Quick Resume Checklist

- Read the spec:
  - `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
- Read this handoff:
  - `docs/historical-analytics-handoff.md`
- Read the backlog:
  - `docs/historical-analytics-backlog.md`
- Then continue from:
  - optional browser click-test of the free-question path
  - optional AI card readability polish
  - keeping historical UI tests aligned with future widget changes
