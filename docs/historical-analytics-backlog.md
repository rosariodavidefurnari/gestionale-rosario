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

The next unfinished work is browser-level QA and UX hardening of the new AI
summary flow.

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

## Priority 1

### Browser smoke test the AI summary card

Why:

- the server-side runtime path is now verified end-to-end,
- but the final browser click-path still has not been exercised in this
  environment.

Tasks:

- open `Storico` in the authenticated app,
- click `Genera analisi`,
- verify the loading / success / error states of the card,
- verify the model selected in Settings is respected,
- refine prompt/copy only if the live output is weak or ambiguous.

Acceptance:

- the card works from the real authenticated browser app,
- the output stays aligned with historical semantics,
- no key is exposed client-side.

## Priority 2

### Add UI tests for historical widgets

Why:

- current tests lock semantic calculations,
- but not visual behavior, empty states, or local widget error states.

Tasks:

- test empty historical state,
- test widget-level error rendering,
- test contextual subtitles,
- test YoY `N/D` rendering.

Acceptance:

- regressions in copy or semantic rendering get caught before shipping.

## Priority 3

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

## Priority 4

### Expand analytics surface / assistant UX

Only after the base is stable:

- add `incassi` historical views,
- add `YTD vs same period last year`,
- add client concentration historical KPIs,
- add category trend commentary for the future AI assistant,
- optionally evolve the current summary card into a conversational assistant.

## Non-Negotiable Rules

These rules must remain true in all future work:

- `Compensi` and `Incassi` are distinct metrics.
- Current year is `YTD`, not a full year.
- `YoY` means the last two closed years unless another comparison is explicitly named.
- If a metric is not comparable, show `N/D` with a reason.
- The AI must consume semantic context, not raw tables.
