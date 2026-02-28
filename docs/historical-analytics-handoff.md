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

## Parallel Track Started: Commercial Backbone

Besides analytics/AI work, a new foundational track has now started to prepare
the CRM for future `AI-driving` behavior:

- goal:
  - make the commercial chain explicit and reliable before extending AI across
    the whole CRM
- current chain:
  - `Quote -> Project -> Payment`
- principle:
  - reduce clicks and keep the UX guided,
  - but do not introduce forced automations when multiple interpretations are
    possible.

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

### Commercial backbone slice 1 now implemented

What was added:

- new migration:
  - `supabase/migrations/20260228170000_add_quotes_project_link.sql`
- `Quote` now supports `project_id`
- quote form now supports linking to an existing project
- quote show now:
  - displays the linked project,
  - or offers `CreateProjectFromQuoteDialog` when the quote is operational and
    still has no project
- payment form now supports:
  - `quote_id`
  - quote-driven autofill of `client_id`
  - quote-driven autofill of `project_id` when available
  - cleanup of incoherent links if the user changes the client afterward
- quote show now also exposes a quick-payment CTA when the quote is already in
  an operational status
- quick payment pre-fills:
  - linked quote
  - linked client
  - linked project only if it exists already
- payment list/show now display the linked quote too

Important scope decision:

- this is **not** the full quote-builder plan,
- quote and project remain optional domain objects:
  - a simple case may still go through `client -> payment`
  - or `quote -> payment`
  - without forcing `project`
- there are still no:
  - live PDF split editor,
  - automatic status transitions,
- this was the smallest safe slice to strengthen module integration before
  broader AI expansion.

### Commercial backbone slice 2 now implemented

What was added:

- new migration:
  - `supabase/migrations/20260228190000_add_quote_items_json.sql`
- `Quote` now supports optional embedded `quote_items`
- quote create/edit now support repeatable line items
- quote `amount` now auto-derives from line totals when item rows are present
- quote show now renders itemized rows with per-line totals
- quote PDF now renders itemized rows too when the quote is itemized

Important scope decision:

- this is still **not** the full quote-builder plan,
- `quote_items` live inside `quotes`, not in a separate CRUD-heavy module,
- quote and project remain optional domain objects,
- the legacy simple quote path remains valid:
  - description + amount
- itemization only activates when the user actually adds line items.

Runtime issue discovered and fixed during real browser validation:

- quote create used the generic autocomplete fallback `q` on `clients`
- on the real Supabase resource this failed with:
  - `column clients.q does not exist`
- fix applied:
  - added shared name lookup helper:
    - `src/components/atomic-crm/misc/referenceSearch.ts`
  - moved client/project lookups that need name search to explicit
    `name@ilike`
  - applied in:
    - `QuoteInputs`
    - `QuoteList`
    - `TaskFormContent`

### Annual operations drill-down now implemented

What was added:

- `annual_operations` now includes semantic drill-down payloads for:
  - pending payments
  - open quotes
- the drill-down lives in the shared model/context layer, not in the UI card
- no edge-function deploy was required:
  - the existing annual AI functions already accept the richer JSON context
    generated client-side

Pending payments drill-down now carries:

- `paymentId`
- `clientId`
- `clientName`
- optional `projectId` / `projectName`
- optional `quoteId`
- `amount`
- `status`
- optional `paymentDate`

Open quotes drill-down now carries:

- `quoteId`
- `clientId`
- `clientName`
- optional `projectId` / `projectName`
- `description`
- `amount`
- `status` + `statusLabel`
- optional `sentDate`
- `hasProject`
- `hasItemizedLines`
- `quoteItemsCount`

Important scope rule:

- this is still **not** the alert snapshot,
- pending payments remain `cash expected`,
- open quotes remain `pipeline potential`,
- the goal is to let the AI cite concrete entities without collapsing
  operational totals, alert urgency, and fiscal simulation into one blob.

Validation now completed on the real answer path too:

- authenticated remote smoke completed on `2026-02-28`
- temporary authenticated user created and cleaned automatically
- local code built the real `annual_operations` context and invoked
  `annual_operations_answer`
- selected year in the smoke:
  - `2026`
- observed drill-down during the run:
  - `2` pending payments
  - `0` open quotes
- the AI answer cited the concrete client present in the drill-down:
  - `Diego Caltabiano`
- and it correctly said that no open quotes were present in that same
  perimetro
- no extra code change or edge-function deploy was needed after the context
  rollout

### Browser click-tests now completed on both active tracks

What was verified in the real authenticated UI on `2026-02-28`:

- commercial backbone:
  - opened a quote without `project_id`
  - created a project from `CreateProjectFromQuoteDialog`
  - verified the quote now exposes the linked project CTA
  - opened payment create
  - selected the linked quote
  - verified autofill/alignment of:
    - `client_id`
    - `project_id`
  - saved a payment and verified payment show renders links to:
    - the project
    - the quote
  - opened a `wedding` quote with no linked project
  - used the quick-payment CTA directly from the quote
  - verified payment create was prefilled with quote/client while leaving
    project empty
  - saved the payment successfully without creating a project
  - created an itemized quote from the real UI
  - verified the amount was auto-derived from line items
  - verified quote show renders the itemized rows in the real authenticated app
- annual AI track:
  - opened `Annuale`
  - generated the guided explanation
  - submitted one suggested question
  - verified the answer stayed in the operational scope and did not drift into:
    - fiscal simulation
    - alert snapshot wording
- historical AI follow-up:
  - opened `Storico`
  - typed a free question manually instead of using only suggested prompts
  - verified the answer rendered in-browser with model `gpt-5.2`
  - verified the wording stayed in plain Italian and remained grounded in the
    visible historical data
  - no browser console errors were observed during the free-question path

Runtime issues discovered and fixed during the browser smoke:

- `CreateProjectFromQuoteDialog` assumed `useCreate(..., { returnPromise: true })`
  always returned `{ data }`
- in the real runtime it resolved to the record directly, so quote linking
  failed on `createdProject.data.id`
- fix applied:
  - normalize the mutation result before reading the created project id
  - added regression test:
    - `src/components/atomic-crm/quotes/CreateProjectFromQuoteDialog.test.tsx`
- `PaymentInputs` used the generic autocomplete `q` search for quotes
- on the Supabase `quotes` resource this did not reliably find the quote by
  description during the real browser flow
- fix applied:
  - added a quote-specific `filterToQuery` on `description@ilike`
  - added regression coverage in:
    - `src/components/atomic-crm/payments/paymentLinking.test.ts`
- quote create used the generic autocomplete fallback `q` on `clients`
- on the Supabase `clients` resource this failed with:
  - `column clients.q does not exist`
- fix applied:
  - added shared `name@ilike` lookup helper for name-based references
  - wired it into quote/task/client lookups that search by name

### Tests added

- `src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx`
- `src/components/atomic-crm/dashboard/dashboardAnnualModel.test.ts`
- `src/lib/analytics/buildAnnualOperationsContext.test.ts`
- `src/components/atomic-crm/dashboard/DashboardAnnualAiSummaryCard.test.tsx`
- `src/components/atomic-crm/quotes/quoteProjectLinking.test.ts`
- `src/components/atomic-crm/payments/paymentLinking.test.ts`
- `src/components/atomic-crm/quotes/CreateProjectFromQuoteDialog.test.tsx`
- `src/components/atomic-crm/quotes/quoteItems.test.ts`
- `src/components/atomic-crm/misc/referenceSearch.test.ts`

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
- annual AI context drill-down serialization for pending payments/open quotes,
- annual AI card summary/question triggers.
- quote -> project linking from direct `useCreate` mutation result.
- quote autocomplete search in the payment form by description.
- quote item row sanitization, total computation and create/edit payload
  transform.
- explicit name-based lookup filters for reference inputs that search on `name`.

## Validation Done

Successful commands:

- `npm run typecheck`
- `npm test -- --run src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/dashboardAnnualModel.test.ts src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/dashboard/dashboardAnnualModel.test.ts src/lib/analytics/buildAnnualOperationsContext.test.ts src/components/atomic-crm/dashboard/DashboardAnnualAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalAiSummaryCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalWidgets.test.tsx src/components/atomic-crm/dashboard/dashboardHistoryModel.test.ts`
- `npm test -- --run src/components/atomic-crm/quotes/quoteItems.test.ts src/components/atomic-crm/misc/referenceSearch.test.ts src/components/atomic-crm/payments/paymentLinking.test.ts src/components/atomic-crm/quotes/CreateProjectFromQuoteDialog.test.tsx src/components/atomic-crm/quotes/quoteProjectLinking.test.ts`
- `npx supabase db push`
- `curl` verification against remote PostgREST with the linked project `service_role`
  key
- `npx supabase secrets set OPENAI_API_KEY ... SB_PUBLISHABLE_KEY ... --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy historical_analytics_summary --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy historical_analytics_answer --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy annual_operations_summary --project-ref qvdmzhyzpyaveniirsmo`
- `npx supabase functions deploy annual_operations_answer --project-ref qvdmzhyzpyaveniirsmo`
- authenticated browser smoke on the local Vite runtime against the linked
  Supabase project for:
  - `Quote -> Project -> Payment`
  - `Annuale` AI card
  - `Storico` free-question path
  - itemized quote create/show flow

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
- the new free-question flow is now also verified on the real authenticated
  browser path with a typed question, not only by remote smoke.
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
- a later authenticated browser smoke on `2026-02-28` also verified both live
  click-paths end-to-end with temporary records/users and cleanup after the run:
  - commercial chain `Quote -> Project -> Payment`
  - annual AI guided summary + one suggested question

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
- `Annuale` is still not AI-ready as a whole page:
  - only `annual_operations` has a dedicated AI context today
  - alerts and fiscal simulation remain outside that context
- the richer `annual_operations` drill-down is now validated on the remote
  answer path, but still deserves one narrow browser click-test on the same
  payment/quote question set.
- The browser output is now understandable for non-expert users, but markdown
  readability may still deserve further polish only if product wants a denser
  or more scannable layout.
- Temporary remote auth smoke users created via admin APIs require cleanup in
  this order on the linked project:
  - delete the dependent `sales` row first
  - then delete the auth user
  - otherwise `sales_user_id_fkey` blocks the auth-user deletion

## Recommended Next Session Order

Stable rollback note:

- after this session is pushed, treat that commit as the known-good fallback for
  the historical AI flow,
- if a future change breaks the runtime or semantics, return to that pushed
  commit before investigating forward again.

1. Browser-validate Annuale AI on questions about:
   - pending payments
   - open quotes
   so the same drill-down evidence is also confirmed on the real UI path.
2. Keep the new historical / annual / commercial tests updated whenever the
   widgets evolve.
3. Only if useful after review, polish prompt/copy or markdown presentation of
   the historical or annual AI cards further.
4. Only later, if useful, evolve the current single-turn cards into a
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
  - browser-validating Annuale AI on payment / open-quote questions
  - keeping historical, annual and commercial tests aligned with future widget changes
  - optional AI card readability polish
