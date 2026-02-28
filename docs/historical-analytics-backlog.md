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
  by authenticated remote smoke and real browser click-test.
- the commercial backbone slice `Quote -> Project -> Payment` is now
  browser-validated too,
- the quote-driven quick-payment path is now browser-validated too, including
  the case with no linked project,
- the `quote_items` foundation is now implemented inside `quotes` without
  introducing a separate CRUD module,
- itemized quotes now auto-derive `amount` from line items, keep the classic
  quote path backward-compatible, and are browser-validated on real create/show
  flows,
- `annual_operations` now exposes a first AI-safe drill-down for
  `pagamenti da ricevere` and `preventivi aperti`,
- the Annuale AI answer path is now remotely validated on a real question about
  payments/open quotes using that richer drill-down,
- the `Annuale` AI card is now browser-validated on the real authenticated
  UI path also on the specific payment/open-quote question set,
- and a first historical `incassi` semantic resource now exists too:
  - `analytics_yearly_cash_inflow`
  - `buildHistoricalCashInflowContext()`
  - `dataProvider.getHistoricalCashInflowContext()`
  - with authenticated remote verification already closed.

The next work is now future expansion on top of a stable shipped core, not a
missing foundation piece.

Cross-surface note:

- `Storico` is AI-enabled end-to-end.
- `Annuale` now has a first AI-enabled flow too, but only on the dedicated
  `annual_operations` context.
- `Annuale` is still **not** AI-enabled as a whole page: alert snapshot and
  fiscal simulation remain deliberately outside that context.
- a parallel non-AI track has now started too:
  - commercial backbone hardening for `Quote -> Project -> Payment`
  - because global AI on weak cross-module links would stay fragile

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

### Commercial backbone slice 1 added

- Added migration:
  - `20260228170000_add_quotes_project_link.sql`
- Added quote/project linking in the UI
- Added `CreateProjectFromQuoteDialog`
- Added payment form support for `quote_id` with coherent autofill/cleanup
- Added payment list/show visibility for linked quotes
- Important scope note:
  - this is only the first integration slice
  - `quote_items` and full quote-builder automation are still open future work

### Browser click-test of the commercial flow completed

- Real authenticated browser smoke completed on `2026-02-28`
- Verified end-to-end path:
  - quote without `project_id`
  - project creation from quote
  - linked project visible back on the quote
  - payment creation with quote-driven alignment of client/project
  - payment show visibility for both linked project and linked quote
- Runtime fixes discovered and applied during the smoke:
  - `CreateProjectFromQuoteDialog` now supports direct mutation records, not
    only `{ data }`
  - quote autocomplete in `PaymentInputs` now searches explicitly on
    `description@ilike`
- Added regression coverage:
  - `CreateProjectFromQuoteDialog.test.tsx`
  - `paymentLinking.test.ts`

### Browser click-test of the Annuale AI flow completed

- Real authenticated browser smoke completed on `2026-02-28`
- Verified path:
  - open `Annuale`
  - generate the guided explanation
  - submit one suggested question
  - confirm the answer stays inside the operational context
    without drifting into fiscal simulation or alert wording

### Browser click-test of the Storico free-question flow completed

- Real authenticated browser click-test completed on `2026-02-28`
- Verified path:
  - open `Storico`
  - type a manual free question in the textarea
  - submit the request from the real UI
  - verify the answer renders correctly in the browser runtime
- Evidence collected:
  - answer returned on model `gpt-5.2`
- wording stayed in plain Italian and grounded itself in visible historical
  year/category data
- no browser console errors were observed during the Q&A path

### Quote quick-payment slice completed

- Added a direct `Registra pagamento` CTA on the quote show page
- The CTA opens `/payments/create` with prefilled:
  - `quote_id`
  - `client_id`
  - `project_id` only when a linked project already exists
- Scope rule kept explicit:
  - quote is useful but not mandatory
  - project is useful but not mandatory
  - the quick-payment path must still work for simple cases like `wedding`
    without forcing project creation
- Real authenticated browser smoke completed on `2026-02-28`
- Verified path:
  - open a `wedding` quote with no linked project
  - use `Registra pagamento`
  - verify payment create opens with linked quote and client already aligned
  - verify project remains empty instead of being forced
  - save the payment successfully from the real UI
- Added helper coverage for:
  - quick-payment eligibility by quote status
  - prefilled payment-create defaults from quote
  - parsing defaults back from the create URL search params

### Quote items foundation completed

- Added migration:
  - `20260228190000_add_quote_items_json.sql`
- Scope decision locked in code:
  - `quote_items` live inside `quotes.quote_items` as a JSONB array payload,
    not as a separate CRUD-heavy resource
  - the classic quote path stays valid:
    - `description + amount` still works
  - when `quote_items` exist:
    - `amount` is derived automatically from the line totals
- Added quote-items helper module:
  - `quoteItems.ts`
  - sanitize rows
  - compute totals
  - transform create/edit payloads safely
- Added form/UI support:
  - repeatable `Voci preventivo` in create/edit
  - auto-locked total when the quote is itemized
  - quote show renders the item list with per-line totals
  - quote PDF renders itemized rows when present
- Runtime fix discovered during real browser validation:
  - generic autocomplete search `q` is not safe on the Supabase `clients`
    resource
  - real browser flow failed with `column clients.q does not exist`
  - fix applied:
    - added shared `name@ilike` helper for client/project reference lookups
    - wired it into quote create/list and task client selection
- Validation completed on `2026-02-28`:
  - `npm run typecheck`
  - `npm test -- --run src/components/atomic-crm/quotes/quoteItems.test.ts src/components/atomic-crm/misc/referenceSearch.test.ts src/components/atomic-crm/payments/paymentLinking.test.ts src/components/atomic-crm/quotes/CreateProjectFromQuoteDialog.test.tsx src/components/atomic-crm/quotes/quoteProjectLinking.test.ts`
  - `npx supabase db push`
  - authenticated browser smoke:
    - created a quote with line items from the real UI
    - verified computed amount in the form/runtime
    - verified itemized rendering in quote show on the real authenticated app
    - no browser console errors after the explicit `name@ilike` fix

### Annual operations drill-down completed

- Added semantic drill-down payload inside `annual_operations`:
  - `drilldowns.pendingPayments`
  - `drilldowns.openQuotes`
- Scope rule kept explicit:
  - this is not the alert snapshot
  - pending payments stay `cash expected`
  - open quotes stay `pipeline potential`
  - the AI now receives concrete entities without mixing them with fiscal or
    day-based alert logic
- Pending payments drill-down now includes:
  - `paymentId`
  - `clientId`
  - `clientName`
  - optional `projectId` / `projectName`
  - optional `quoteId`
  - `amount`
  - `status`
  - optional `paymentDate`
- Open quotes drill-down now includes:
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
- Important bridge with the commercial backbone:
  - quote/project remain optional,
  - but the AI now sees whether an open quote is already linked to a project
    and whether it is itemized.
- Validation completed:
  - `npm run typecheck`
  - `npm test -- --run src/components/atomic-crm/dashboard/dashboardAnnualModel.test.ts src/lib/analytics/buildAnnualOperationsContext.test.ts supabase/functions/_shared/annualOperationsAiGuidance.test.ts`
  - no edge-function deploy required:
    - existing annual functions already accept the richer JSON context from the
      client/provider

### Annuale AI validation on payment/quote questions completed

- Authenticated remote smoke completed on `2026-02-28`
- Validation setup:
  - temporary authenticated user created via admin API on
    `qvdmzhyzpyaveniirsmo`
  - cleanup completed automatically after the run
  - local code built the real `annual_operations` context and sent it to the
    existing `annual_operations_answer` function
- Observed result:
  - chosen year in the smoke: `2026`
  - drill-down contained:
    - `2` pending payments
    - `0` open quotes
  - the answer cited the concrete client present in the drill-down:
    - `Diego Caltabiano`
  - the answer also correctly stated that no open quotes were present in that
    perimetro
- Outcome:
  - the richer context is not only serialized correctly,
  - it is also actually used by the real AI answer path without additional
    code changes or new deploys.

### Annuale browser click-test on payment/quote questions completed

- Real authenticated browser click-test completed on `2026-02-28`
- Validation setup:
  - temporary authenticated user created on `qvdmzhyzpyaveniirsmo`
  - local Vite runtime on `127.0.0.1:4173`
  - real browser automation executed with Playwright using the installed
    Google Chrome binary
- Verified path:
  - open login page
  - sign in with the temporary user
  - land on the real `Annuale` dashboard
  - trigger the suggested question:
    - `Cosa raccontano pagamenti e preventivi del 2026?`
  - wait for the in-browser answer to render
- Observed result:
  - the answer cited `Diego Caltabiano`
  - the answer stated correctly that no open quotes were present in the same
    `2026` perimetro
  - browser console errors observed during the path:
    - `0`
  - browser page errors observed during the path:
    - `0`
- Outcome:
  - the Annuale AI payment/open-quote question set is now closed both:
    - on the remote answer path
    - and on the real browser UI path

### Historical `incassi` semantic entry point added

- Added migration:
  - `20260228193000_add_historical_cash_inflow_view.sql`
- Added semantic resource:
  - `analytics_yearly_cash_inflow`
- Added provider method:
  - `dataProvider.getHistoricalCashInflowContext()`
- Added semantic builder:
  - `buildHistoricalCashInflowContext()`
- Added metric definitions:
  - `historical_total_cash_inflow`
  - `latest_closed_year_cash_inflow`
- Added tests:
  - `buildHistoricalCashInflowContext.test.ts`
- Added remote verification on `2026-02-28`:
  - `service_role` REST query showed:
    - `2025` closed year
    - `2026` as `YTD`
  - authenticated REST query with a temporary user showed the same rows
- Scope rule preserved:
  - do not merge `incassi` into the existing `Storico` UI yet
  - keep `compensi` and `incassi` as separate semantic bases

## Priority 1

### Add the first AI-safe consumer of historical `incassi`

Why:

- the historical `incassi` resource now exists and is already verified,
- but no end-user or AI consumer reads it yet,
- the next durable gain is to expose that resource without collapsing it into
  the existing `compensi` UI.

Tasks:

- define one dedicated consumer for the new context:
  - AI-only helper
  - or separate card/surface clearly labeled as `incassi`
- keep the rule explicit:
  - `compensi` != `incassi`
- avoid mutating the current `Storico` widgets into mixed-basis widgets
- keep labels and caveats as plain Italian, not accounting shorthand

Acceptance:

- the repo exposes one safe consumer of historical `incassi` that cannot be
  confused with historical `compensi`.

## Priority 2

### Keep the new UI and semantic tests updated if widgets evolve

Why:

- the current baseline is now protected by tests across:
  - historical widgets,
  - annual operations AI,
  - commercial backbone helpers,
  - quote itemization helpers.

Tasks:

- when historical/annual/commercial widgets change, update the tests in the
  same branch,
- keep coverage for empty/error/YTD/YoY semantics and AI card actions,
- keep `quote_items` and lookup-helper tests aligned with any future form
  refactor.

Acceptance:

- regressions in semantic rendering or cross-module linking keep getting caught
  before shipping.

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
