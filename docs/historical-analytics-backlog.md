# Historical Analytics Backlog

Last updated: 2026-02-28

## Current State

The codebase now contains:

- the historical analytics spec,
- aggregate view definitions,
- dashboard `Annuale | Storico` shells,
- a history model with semantic rules,
- and an AI-ready analytics context builder.

Remote verification on the linked Supabase project is now done at the resource
layer:

- the new `analytics_*` views are present and populated on
  `qvdmzhyzpyaveniirsmo`,
- the observed remote rows match the approved semantic rules,
- the apparent "empty" result with the publishable/anon key was traced to RLS
  on security-invoker views, not to missing data.

The implementation is now functionally closed for v1:

- remote data/runtime verified,
- authenticated browser path verified for the historical dashboard and guided AI
  summary,
- baseline UI tests added for the historical widgets,
- visible dashboard copy translated into plain Italian for non-expert users,
- the AI summary card has basic readability polish applied,
- and the historical AI surface now supports both guided summary and a
  single-turn free question constrained to historical data and already verified
  by authenticated remote smoke.

The next work is optional refinement or future expansion, not a missing core
piece of the shipped flow.

Cross-surface note:

- `Storico` is AI-enabled end-to-end.
- `Annuale` now has a first AI-enabled flow too, but only on the dedicated
  `annual_operations` context.
- `Annuale` is still **not** AI-enabled as a whole page: alert snapshot and
  fiscal simulation remain deliberately outside that context.

## How To Use This Backlog In A New Chat

Ask the new session to:

1. read `docs/historical-analytics-handoff.md`
2. read this file
3. read `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
4. continue from the first unfinished priority without re-opening already closed architecture decisions

## Completed Since Last Update

### Remote historical verification on the linked project

- Verified via remote PostgREST against project `qvdmzhyzpyaveniirsmo`:
  - `analytics_history_meta`
  - `analytics_yearly_competence_revenue`
  - `analytics_yearly_competence_revenue_by_category`
  - `analytics_client_lifetime_competence_revenue`
- Confirmed remote semantics:
  - `2026` is present as `YTD`
  - `YoY` is derived from `2025 vs 2024`
  - top client lifetime revenue is populated
  - category mix contains non-zero historical data
- Important operational note:
  - the publishable/anon key returns empty arrays on the historical views
    because the views use `security_invoker=on` on top of RLS-protected base
    tables
  - this must not be interpreted as a broken migration

### First AI-ready integration entry point

- Added `dataProvider.getHistoricalAnalyticsContext()`
- Added `dataProvider.generateHistoricalAnalyticsSummary()`
- The returned payload now includes:
  - `meta`
  - `metrics`
  - `series`
  - `qualityFlags`
  - `caveats`
- `caveats` convert semantic conditions into human-readable statements such as:
  - competence-vs-cash basis
  - current year as YTD
  - closed-years-only YoY
  - insufficient-data / zero-baseline conditions
  - future-services exclusion

### Explicit scope decision

- FakeRest/demo historical support is not a current priority for this product.
- Keep the existing demo gating as-is unless the scope changes later.

### First end-user AI flow shipped

- Added a manual `Analisi AI` card inside the `Storico` dashboard
- Added Settings dropdown for model selection
- Default model set to `gpt-5.2`
- Deployed edge function:
  - `historical_analytics_summary`
- Remote secrets configured:
  - `OPENAI_API_KEY`
  - `SB_PUBLISHABLE_KEY`
- Authenticated remote smoke test completed on `2026-02-28`:
  - temporary authenticated user created on `qvdmzhyzpyaveniirsmo`
  - authenticated reads to `analytics_history_meta`,
    `analytics_yearly_competence_revenue`, and
    `analytics_yearly_competence_revenue_by_category` succeeded
  - `historical_analytics_summary` returned `200 OK`
  - model resolved to `gpt-5.2`
  - OpenAI summary included the expected YTD / closed-year framing
- Authenticated browser smoke test completed on `2026-02-28`:
  - `Storico` renders the historical KPIs/charts/cards in the real UI
  - the `Analisi AI dello storico` card renders a generated answer in-browser
  - the visible output is coherent with the approved semantics:
    - two closed years: `2024-2025`
    - `2026` framed as `YTD`
    - `YoY` framed as `2025 vs 2024`

### UI test coverage and AI card polish added

- Added UI test infrastructure for React components:
  - `jsdom`
  - `@testing-library/react`
- Added baseline widget/UI tests:
  - `DashboardHistorical.ui.test.tsx`
  - `DashboardHistoricalWidgets.test.tsx`
- Covered states:
  - parent empty state
  - parent error state + retry
  - contextual YoY warning state
  - widget-level error states
  - widget empty states
  - YoY `N/D` rendering
- Polished AI markdown rendering:
  - visible list bullets
  - better paragraph/list spacing inside the AI summary card

### Plain-language translation layer added

- Replaced user-facing jargon in the historical dashboard:
  - `YTD` -> plain wording such as `finora` / `anno in corso fino a oggi`
  - `YoY` -> `crescita rispetto all'anno prima`
  - `competenza` -> explanation centered on `valore del lavoro`, not accounting terms
- Rewrote historical cards and helper copy for a non-expert business owner
- Reworked the OpenAI prompt so the AI explains the numbers in plain Italian,
  translating any unavoidable technical term immediately
- Remote function redeployed after the prompt rewrite

### Historical free-question flow added

- Added provider method:
  - `dataProvider.askHistoricalAnalyticsQuestion()`
- Added separate Edge Function to preserve the already stable summary flow:
  - `historical_analytics_answer`
- Extended the existing AI card with:
  - textarea input
  - suggested question chips
  - guardrail copy explaining that the AI only uses the visible historical data
  - single-turn answer rendering
- Added AI-card component tests covering:
  - guided summary flow still working
  - suggested-question flow
  - disabled submit on empty question
- Deployed `historical_analytics_answer` to
  `qvdmzhyzpyaveniirsmo`
- Authenticated remote smoke test completed on `2026-02-28`:
  - temporary authenticated user created on `qvdmzhyzpyaveniirsmo`
  - authenticated reads to the historical views succeeded
  - `historical_analytics_answer` returned `200 OK`
  - model resolved to `gpt-5.2`
  - output started with `## Risposta breve`
  - output avoided raw `YTD` / `YoY` wording
- Important operational note:
  - the first smoke failed with `Requested function was not found`
  - root cause was missing remote deploy, not broken code
  - redeploy fixed it immediately

### Annual dashboard semantic normalization added

- Removed the annual runtime dependency on `monthly_revenue` for KPI/chart/core
  operational calculations
- Annual operational numbers now derive from `services` directly with one
  consistent basis:
  - fee net of discount
- For the current year:
  - future services later in the year are excluded from operational totals
  - the chart window is the selected-year window up to today, not trailing 12
    months
- The annual UI now explains the meaning of each block more clearly:
  - value of work
  - cash expected
  - pipeline potential
  - fiscal simulation
- `BusinessHealth` metrics now respect the selected year for:
  - quote conversion rate
  - weighted pipeline value
  - DSO
- Added defensive migration:
  - `20260228150000_normalize_monthly_revenue_net_basis.sql`
- Added tests:
  - `dashboardAnnualModel.test.ts`
- Important scope note:
  - this did **not** make `Annuale` AI-ready as a single context
  - it only made the operational core stable enough for a future
    `annual_operations` context

### Annual operations AI flow added

- Added context builder:
  - `buildAnnualOperationsContext()`
- Added provider methods:
  - `getAnnualOperationsAnalyticsContext(year)`
  - `generateAnnualOperationsAnalyticsSummary(year)`
  - `askAnnualOperationsQuestion(year, question)`
- Added Edge Functions:
  - `annual_operations_summary`
  - `annual_operations_answer`
- Added UI consumer:
  - `DashboardAnnualAiSummaryCard`
- Added tests:
  - `buildAnnualOperationsContext.test.ts`
  - `DashboardAnnualAiSummaryCard.test.tsx`
- Added remote deploy + authenticated smoke on `2026-02-28`:
  - year used in smoke: `2025`
  - summary returned `200 OK`
  - answer returned `200 OK`
  - model resolved to `gpt-5.2`
  - output stayed in the operational domain and did not drift into fiscal
    simulation
- Important scope rule preserved:
  - Annuale AI reads only `annual_operations`
  - it does not include the fiscal simulator
  - it does not include current-day alerts

### Annuale hardening applied after real user answers

- Added shared guidance helper:
  - `supabase/functions/_shared/annualOperationsAiGuidance.ts`
- Added internal question reframing before the annual Q&A OpenAI call
- Tightened suggested questions so they reflect:
  - closed year vs current year
- Re-tested remotely on the problematic 2025 question set
- Scope decision:
  - keep only minimal anti-bufala prompt hardening
  - do not keep polishing this temporary UI indefinitely
  - move future effort toward `AI-driving` foundations:
    - semantic layer
    - tool contract
    - drill-down data contracts

## Priority 1

### Optional browser click-test of the Annuale AI flow

Why:

- the new annual AI flow is covered by tests and authenticated remote smoke,
- but in this session it was not manually click-tested in the browser.

Tasks:

- open `Annuale`,
- generate the guided explanation,
- submit one suggested question,
- verify the answer stays in the operational scope.

Acceptance:

- the annual AI flow is verified in the real browser runtime, not only in
  tests/remoto.

## Priority 2

### Optional browser click-test of the free-question path

Why:

- the new Q&A flow is verified by tests and authenticated remote smoke,
- but in this session it was not manually click-tested in the browser.

Tasks:

- open `Storico`,
- type or click a suggested question,
- verify the answer renders correctly in the real browser runtime.

Acceptance:

- the free-question path is verified in the real UI, not only in tests/remoto.

## Priority 3

### Optional prompt / markdown polish of the AI card

Why:

- the browser output is now semantically correct and understandable,
- but product may still want a denser or more opinionated presentation.

Tasks:

- only if useful after UI review, tighten prompt formatting or card typography,
- keep the semantic rules unchanged,
- avoid introducing a multi-turn chat flow at this stage.

Acceptance:

- the generated summary/answer is easier to scan without changing business
  logic.

## Priority 4

### Keep the new UI tests updated if widgets evolve

Why:

- the current v1 is now protected by UI tests,
- so future widget changes should extend those tests instead of silently
  bypassing them.

Tasks:

- when historical widgets change, update the UI tests in the same branch,
- keep coverage for empty/error/YTD/YoY semantics and the AI card actions,
- keep the new annual semantic tests aligned with future changes to `Annuale`.

Acceptance:

- regressions in copy or semantic rendering keep getting caught before shipping.

## Priority 5

### Revisit FakeRest/demo only if scope changes

Why:

- the current product scope does not require historical demo parity.

Tasks:

- only if needed later, either generate synthetic `analytics_*` resources in
  FakeRest,
- or replace environment gating with a resource capability check.

Acceptance:

- demo mode does not expose a broken historical tab if the product scope starts
  caring about demo parity.

## Priority 6

### Expand analytics surface / assistant UX

Only after the base is stable:

- add `incassi` historical views,
- keep `Annuale` AI scoped to `annual_operations` until dedicated contexts are
  designed for alerts/fiscal,
- add `YTD vs same period last year`,
- add client concentration historical KPIs,
- add category trend commentary for the future AI assistant,
- optionally evolve the current single-turn AI card into a multi-turn
  conversational assistant.

## Non-Negotiable Rules

These rules must remain true in all future work:

- `Compensi` and `Incassi` are distinct metrics.
- Current year is `YTD`, not a full year.
- `YoY` means the last two closed years unless another comparison is explicitly named.
- If a metric is not comparable, show `N/D` with a reason.
- The AI must consume semantic context, not raw tables.
