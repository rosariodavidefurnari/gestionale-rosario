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

### Annual dashboard normalization completed before any AI rollout there

Important constraint discovered after the historical flow shipped:

- `Annuale` was not semantically safe enough for AI as-is,
- it mixed operational revenue, pending cash collection, quote pipeline,
  current alerts, and fiscal simulation in one screen,
- and some parts did not even share the same revenue basis or selected-year
  filter.

Fixes now applied in code:

- annual operational revenue is derived directly from `services`, not from the
  aggregated `monthly_revenue` view,
- the same net-of-discount basis is now used consistently for:
  - annual KPI totals,
  - annual chart,
  - category mix,
  - top clients,
- the current year is now read as `finora`:
  - future services later in the same year are excluded from the operational
    totals,
  - and the annual chart now shows the selected-year window only, not a
    trailing-12-month mix,
- the fiscal/business-health block now filters correctly on the selected year
  for:
  - quote conversion rate,
  - weighted pipeline value,
  - DSO,
- the fiscal UI copy now explicitly frames that section as simulation, not
  definitive accounting truth,
- a defensive migration was added:
  - `supabase/migrations/20260228150000_normalize_monthly_revenue_net_basis.sql`
  - this normalizes `monthly_revenue` to the same net-of-discount basis for any
    future consumer that still queries the view.
- operational note:
  - the current annual runtime no longer depends on that view,
  - so this migration was committed for schema continuity but was not required
    for the client-side runtime validation in this session.

What this means for future AI work:

- `Annuale` is still not a single AI-ready blob,
- but the operational core is now much safer to expose as a dedicated
  `annual_operations` context,
- while `alerts` and `fiscal_simulation` should remain separate contexts.

### Annual operations AI flow now implemented

What was added:

- context builder:
  - `src/lib/analytics/buildAnnualOperationsContext.ts`
- annual AI response types:
  - `src/lib/analytics/annualAnalysis.ts`
- provider methods:
  - `getAnnualOperationsAnalyticsContext(year)`
  - `generateAnnualOperationsAnalyticsSummary(year)`
  - `askAnnualOperationsQuestion(year, question)`
- UI card:
  - `src/components/atomic-crm/dashboard/DashboardAnnualAiSummaryCard.tsx`
- server-side OpenAI functions:
  - `supabase/functions/annual_operations_summary/index.ts`
  - `supabase/functions/annual_operations_answer/index.ts`

Scope decision locked in code:

- the Annuale AI card reads only the operational yearly context,
- it does **not** include:
  - fiscal simulation,
  - current-day alerts,
- and it resets its local AI state when the selected year changes, so old
  summaries do not bleed into another year view.

### Annuale Q&A hardening after real user transcripts

After the first real user transcripts on `2025`, one important correction was
applied:

- the issue was no longer raw data correctness,
- the issue was interpretive drift:
  - treating `0` as an automatic anomaly,
  - speaking too absolutely about a single client,
  - and using wording like `quest'anno` / `futuro` even when the selected year
    was already closed.

Fixes now applied:

- added shared guidance builder:
  - `supabase/functions/_shared/annualOperationsAiGuidance.ts`
- added server-side question reframing for ambiguous prompts:
  - a vague user question is internally restated in a safer form before the
    OpenAI call
- tightened annual suggested questions in the UI so they depend on:
  - selected `year`
  - `isCurrentYear`
- the annual guardrail copy now states more explicitly that:
  - non-demonstrable claims must be called out,
  - and a zero value is not an automatic problem.

Decision:

- stop investing heavily in prompt polish for this temporary UI,
- keep only the minimum anti-bufala hardening,
- move the main effort toward the future `AI-driving` architecture:
  - semantic layer,
  - tool contract,
  - module-by-module drill-down.

### Tests added

- `src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx`
- `src/components/atomic-crm/dashboard/dashboardAnnualModel.test.ts`
- `src/lib/analytics/buildAnnualOperationsContext.test.ts`
- `src/components/atomic-crm/dashboard/DashboardAnnualAiSummaryCard.test.tsx`

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
- suggested-question trigger/render for the historical AI card,
- annual current-year YTD exclusion of future services,
- annual net-of-discount basis consistency,
- annual fiscal/business-health selected-year filtering,
- annual AI context caveats and metric serialization,
- annual AI card summary/question triggers.

## Validation Done

Successful commands:

- `npm run typecheck`
- `npm test -- --run src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/dashboardAnnualModel.test.ts src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/dashboardAnnualModel.test.ts src/lib/analytics/buildAnnualOperationsContext.test.ts src/components/atomic-crm/dashboard/DashboardAnnualAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npx supabase db push`
- `curl` verification against remote PostgREST with the linked project `service_role`
  key
- `npx supabase secrets set OPENAI_API_KEY ... SB_PUBLISHABLE_KEY ... --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy historical_analytics_summary --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy historical_analytics_answer --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy annual_operations_summary --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy annual_operations_answer --project-ref qvdmzhyzpyaveniirsmo`

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
- a later authenticated remote smoke also verified the new annual AI flow on
  the same linked project for year `2025`:
  - `annual_operations_summary` returned `200 OK`,
  - `annual_operations_answer` returned `200 OK`,
  - both used model `gpt-5.2`,
  - the summary started with `## In breve`,
  - the answer started with `## Risposta breve`,
  - and the answer did not drift into fiscal simulation wording.

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

Additional runtime note for the annual flow:

- the first smoke invocation of `annual_operations_summary` failed with
  `404 Requested function was not found`,
- root cause: although the CLI initially printed a deploy-looking output, the
  function did not actually appear in `supabase functions list`,
- fix applied:
  - verify active remote functions with
    `npx supabase functions list --project-ref qvdmzhyzpyaveniirsmo`
  - redeploy `annual_operations_summary`
- re-test immediately after the second deploy returned `200 OK`.

## Environment Blockers

### Supabase migration state

- Remote state:

- the linked remote project `qvdmzhyzpyaveniirsmo` now has both relevant
  analytics migrations applied:
  - `project_ref: qvdmzhyzpyaveniirsmo`
  - applied migrations:
    - `20260228133000_historical_analytics_views.sql`
    - `20260228150000_normalize_monthly_revenue_net_basis.sql`

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
- `Annuale` still needs a dedicated AI context builder before any OpenAI
  consumer is added there; this is now done only for `annual_operations`, not
  for alerts/fiscal.
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

1. Manually click-test the new Annuale AI card in the browser and collect
   evidence.
2. Only if useful after review, manually click-test the new free-question path
   in the Storico browser flow and collect evidence.
3. Only if useful after review, polish prompt/copy or markdown presentation of
   the historical or annual AI cards further.
4. Keep the new historical and annual semantic tests updated whenever the
   widgets evolve.
5. Only later, if useful, evolve the current single-turn cards into a
   conversational assistant flow.
6. Only later, if the product scope changes, revisit FakeRest/demo historical
   support.

## Quick Resume Checklist

- Read the spec:
  - `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
- Read this handoff:
  - `docs/historical-analytics-handoff.md`
- Read the backlog:
  - `docs/historical-analytics-backlog.md`
- Then continue from:
  - browser click-test of the Annuale AI card
  - optional browser click-test of the free-question path
  - optional AI card readability polish
  - keeping historical and annual semantic tests aligned with future widget changes
