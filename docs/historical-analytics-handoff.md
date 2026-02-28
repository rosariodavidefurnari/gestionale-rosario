# Historical Analytics Handoff

Last updated: 2026-02-28

## Goal

Prepare the CRM for a historical dashboard and future AI analysis by introducing:

- a semantic analytics layer,
- an operational semantic backbone for CRM fields and shared formulas,
- aggregate Supabase views,
- a dedicated `Storico` dashboard mode,
- a path toward one unified AI experience instead of scattered page-level AI
  surfaces,
- and continuity docs that survive chat/session resets.

## Final Product Goal

The real destination is not "more AI cards".

The real destination is:

- one unified AI chat that can read and eventually operate across the whole
  CRM,
- backed by strong semantic definitions for fields, states, dates, formulas,
  tools, pages, modals, and business actions,
- so the AI can avoid writing in the wrong place, using the wrong workflow, or
  inventing false meanings.

This means the current page-level AI widgets are only temporary bridges.
Current work should keep strengthening semantics, business links, and shared
registries instead of multiplying isolated AI entry points.

## Non-Negotiable Rules

- customer outbound email direction:
  - `Gmail`
- internal high-priority notification direction:
  - `CallMeBot`
- old inbound branch:
  - `Postmark` removed from the repo and must stay removed unless product
    direction changes explicitly
- communication safety rule:
  - if a flow includes services with `is_taxable = false`, automatic customer
    emails must never be sent
- local browser smoke routes:
  - always use hash routing:
    - `http://127.0.0.1:4173/#/...`

## How To Resume In A New Chat

Use a prompt like this:

```text
Leggi docs/historical-analytics-handoff.md, docs/historical-analytics-backlog.md, doc/src/content/docs/developers/historical-analytics-ai-ready.mdx, progress.md e learnings.md.
Considera come obiettivo finale una chat AI unificata su tutto il CRM, ma senza aggiungere nuove AI sparse: prima vanno mantenute solide semantica, workflow e dati.
Non ridefinire l'architettura già approvata.
Continua dal primo punto aperto del backlog.
Se aggiungi o cambi una feature, aggiorna sempre semantic registry, capability registry, eventuale communication layer, test e docs di continuità.
Ricorda i vincoli di prodotto: Gmail per mail cliente, CallMeBot per alert interni urgenti, nessuna mail automatica se ci sono servizi con is_taxable = false.
```

Minimal reading order for a new session:

1. `docs/historical-analytics-handoff.md`
2. `docs/historical-analytics-backlog.md`
3. `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
4. `progress.md`
5. `learnings.md`

## Mandatory Integration Checklist For New Features

If a new feature changes real CRM behavior, it is not considered integrated
until the relevant items below are updated too:

1. database shape / migration / view / function if business data changes
2. shared semantic meaning in `crmSemanticRegistry` if new states, types,
   categories, formulas, dates, or descriptions are introduced
3. shared capability meaning in `crmCapabilityRegistry` if a new page, route,
   modal, tool, or business action appears
4. communication rules/templates if the feature can send customer or internal
   notifications
5. provider entry points if the frontend or future AI needs one stable access
   method
6. tests for the new invariant or user-visible behavior
7. continuity docs:
   - `docs/historical-analytics-handoff.md`
   - `docs/historical-analytics-backlog.md`
   - `progress.md`
   - `learnings.md`

This checklist exists because the future unified AI must know every important
surface and rule of the CRM, not guess them from scattered components.

## Immediate Pareto Next Step

The previous Pareto step is now closed:

- manual quote-status customer email sending now goes through `Gmail SMTP`,
- reusing `quoteStatusEmailTemplates`,
- with one manual preview/send dialog in quote show,
- and still preserving the hard safety rule for `is_taxable = false`.
- runtime verification is now closed too on the linked remote project:
  - `SMTP_*` secrets set on `qvdmzhyzpyaveniirsmo`
  - `quote_status_email_send` deployed remotely
  - authenticated invoke returned `accepted` with SMTP response `250 2.0.0 OK`
  - smoke user and smoke data cleaned after verification

The next Pareto step is now closed too:

- a first unified AI launcher now exists as a small floating button,
- it is available across the CRM from the shared layout,
- it opens one global shell instead of adding a new page in header/nav,
- and it declares the write-safety rule explicitly before invoice ingestion is
  added.

The next Pareto step is now closed too:

- `Impostazioni -> AI` now has a separate invoice-extraction model field
- the default is `gemini-2.5-pro`
- older persisted configs keep working because nested AI defaults now merge
  safely instead of replacing the whole `aiConfig` object

The next Pareto step is now closed too:

- the unified launcher now supports the first real invoice workflow using
  `@google/genai`,
- mixed upload now works for `PDF` digitali + scansioni/foto,
- the chat now returns one structured proposal editable directly in the same
  shell before saving,
- confirmation now writes only into existing CRM resources:
  - `payments`
  - `expenses`
- semantic registry, capability registry, provider entry points, tests, and
  continuity docs were updated in the same pass
- runtime verification is now closed too on the linked remote project:
  - `GEMINI_API_KEY` set on `qvdmzhyzpyaveniirsmo`
  - `invoice_import_extract` deployed remotely
  - authenticated smoke on mixed files (`customer.pdf` + `supplier.png`)
    returned:
    - one `payments` draft
    - one `expenses` draft
  - the corrected proposal was then confirmed into real remote
    `payments` / `expenses`
  - smoke user and smoke CRM data were cleaned after verification

The next high-value step is now:

- make the unified launcher read the core CRM consciously, not only invoices,
- starting from one shared read context over the existing registries and core
  resources (`clients`, `quotes`, `projects`, `payments`, `expenses`),
- so the next AI evolution strengthens the single launcher instead of opening
  new scattered page-level AI surfaces.

Do not open new scattered AI surfaces while doing this. The launcher, the
separate Gemini setting, and the existing semantic/capability foundations are
now the approved entry points for the next AI work too.

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

## Stop Line For This Phase

This phase is not supposed to generate endless slices.

The intended finish line is:

- `Storico` stable on the approved semantic split:
  - `compensi`
  - `incassi`
- `Annuale` AI limited to the already approved `annual_operations` scope
- commercial flow solid on the real cases now needed:
  - `client -> payment`
  - `quote -> payment`
  - `quote -> project -> payment`
- no forced `quote` or `project` when the job is simpler than that

Treat as already sufficient for this phase:

- the current `Storico` AI path
- the current `Storico` non-AI cash-inflow path
- the current `Annuale` AI operational path
- the current client/quote/project/payment links already validated on the real
  UI

Treat as still acceptable in this phase:

- keeping tests aligned with the shipped widgets
- closing at most one more small commercial gap if it improves real data
  quality or guided UX

Treat as `v2`, not as mandatory continuation of this phase:

- full-page AI over all of `Annuale`
- global conversational AI across the CRM
- more dashboard cards without a strong clarity gain
- workflow bureaucracy that creates records no one really needs

## Strategic AI UX Goal

Another fundamental product goal is now explicit:

- remove the AI interfaces currently scattered across individual pages,
- converge toward one unified AI experience,
- preserve the useful capabilities already shipped,
- and do that without regressions in clarity or ease of use.

Practical consequence for new work:

- do not add new AI entry points casually just because a page can host one,
- prefer semantic/context work that can later feed a unified AI shell,
- and treat the current page-level AI cards as transitional surfaces, not as
  the desired end state.

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
- `dataProvider.getHistoricalCashInflowContext()`
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

### Capability registry and quote-status email flow added

New library files:

- `src/lib/semantics/crmCapabilityRegistry.ts`
- `src/lib/semantics/crmCapabilityRegistry.test.ts`
- `src/lib/communications/quoteStatusEmailTemplates.ts`
- `src/lib/communications/quoteStatusEmailTemplates.test.ts`
- `src/lib/communications/quoteStatusEmailContext.ts`
- `src/lib/communications/quoteStatusEmailContext.test.ts`

New UI / function pieces:

- `src/components/atomic-crm/quotes/SendQuoteStatusEmailDialog.tsx`
- `src/components/atomic-crm/quotes/SendQuoteStatusEmailDialog.test.tsx`
- `supabase/functions/quote_status_email_send/index.ts`
- `supabase/functions/_shared/quoteStatusEmailSend.ts`
- `supabase/functions/_shared/quoteStatusEmailSend.test.ts`

Purpose:

- give the future unified AI one explicit catalog of:
  - pages
  - resources
  - dialogs
  - actions
  - route conventions
- avoid making the AI guess what the CRM can or cannot do
- introduce one shared email-template layer for quote status updates instead of
  writing customer emails ad hoc in page components

Current behavior:

- the capability registry now declares:
  - main CRM resources
  - hash-route conventions
  - important dialogs such as:
    - quote create/show/edit
    - send quote-status email
    - create project from quote
    - quick episode
    - quick payment
  - important business actions such as:
    - drag-and-drop quote status change
    - manual quote-status customer email send
    - create payment from quote
    - create payment from client
    - create project from quote
- the quote-status email layer now declares:
  - per-status send policy:
    - `never`
    - `manual`
    - `recommended`
  - shared dynamic sections
  - HTML + plain-text rendering
  - missing-field detection before sending
  - and a hard safety rule:
    - if the flow includes services with `is_taxable = false`, automatic email
      send must stay blocked
- provider entry points now exist for UI or future AI reuse:
  - `dataProvider.getQuoteStatusEmailContext()`
  - `dataProvider.sendQuoteStatusEmail()`
- quote show now exposes one manual `Invia mail cliente` dialog:
  - subject/body preview
  - optional custom message
  - Gmail SMTP send on confirmation only
  - disabled send when required fields are missing
- the shared context now computes customer-facing payment meaning explicitly:
  - `amountPaid` = only linked payments already `ricevuto`
  - `amountDue` = quote amount minus only received linked payments

Outbound provider decision:

- outbound customer-status emails should target `Gmail`, not `Postmark`
- the actual transport is now wired through `Gmail SMTP`
- current UX remains manual only:
  - no automatic send path has been introduced

Important note:

- the old inbound `postmark` branch has now been removed from the repo
- customer-facing outbound communication should go through `Gmail`
- high-priority internal alerts should target `CallMeBot`

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

### Historical cash-inflow semantic entry point added

Migration created:

- `supabase/migrations/20260228193000_add_historical_cash_inflow_view.sql`

Semantic resource introduced:

- `analytics_yearly_cash_inflow`

Supporting frontend/library pieces:

- `src/lib/analytics/buildHistoricalCashInflowContext.ts`
- `src/lib/analytics/buildHistoricalCashInflowContext.test.ts`
- `src/lib/analytics/analyticsDefinitions.ts`
- `src/components/atomic-crm/providers/supabase/dataProvider.ts`

Purpose:

- expose historical `incassi` as a separate semantic basis,
- keep them explicitly distinct from `compensi per competenza`,
- give future AI or UI consumers a safe entry point without reading raw
  `payments`.

Current behavior:

- the view groups only received payments by `payment_date`,
- `rimborso` rows are excluded,
- the current year is still marked as `YTD`,
- the custom provider now exposes
  `dataProvider.getHistoricalCashInflowContext()`,
- and future or current consumers can reuse one shared semantic context without
  reading raw `payments`.

### Operational semantic backbone added

Migration created and pushed remotely on `2026-02-28`:

- `supabase/migrations/20260228220000_add_service_taxability_and_operational_semantics.sql`

New shared semantic pieces:

- `src/lib/semantics/crmSemanticRegistry.ts`
- `src/lib/semantics/crmSemanticRegistry.test.ts`
- `dataProvider.getCrmSemanticRegistry()`

Configuration additions:

- `operationalConfig.defaultKmRate`
- descriptions on configurable `quoteServiceTypes`
- descriptions on configurable `serviceTypeChoices`

Operational rules now centralized:

- fixed dictionaries now carry AI-readable descriptions for:
  - client types
  - acquisition sources
  - project categories / statuses / TV shows
  - quote statuses
  - payment types / methods / statuses
- shared formulas now cover:
  - service net value
  - taxable service net value
  - travel reimbursement
  - date-range interpretation via `all_day`

Behavioral changes:

- `services` now expose `is_taxable`
- service create/edit flows default `is_taxable = true`
- service and expense forms use one configurable km rate default
- quick TV episode creation uses the same km-rate rule and marks services as
  taxable by default
- the fiscal model now treats `is_taxable` as a fiscal-base switch only:
  - fiscal KPIs use taxable service revenue
  - business-health KPIs keep using full operational revenue

Purpose:

- let future AI read domain meanings from one place instead of guessing from
  raw columns,
- support future AI write flows with clearer target fields and rules,
- and prevent drift between UI calculations, fiscal calculations, and AI
  interpretation.

Remote validation completed on `2026-02-28`:

- `npx supabase db push` applied the migration on the linked project
- `service_role` REST query confirmed the new rows existed remotely
- authenticated REST query with a temporary user confirmed the same resource is
  readable on the real frontend auth path too
- observed remote rows:
  - `2025`:
    - closed year
    - `cash_inflow = 22241.64`
    - `payments_count = 11`
  - `2026`:
    - `YTD`
    - `cash_inflow = 1744.00`
    - `payments_count = 1`

### Historical cash-inflow AI consumer added

New frontend/UI pieces:

- `src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowAiCard.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowAiCard.test.tsx`

Provider methods added:

- `dataProvider.generateHistoricalCashInflowSummary()`
- `dataProvider.askHistoricalCashInflowQuestion()`

Edge Functions added:

- `supabase/functions/historical_cash_inflow_summary/index.ts`
- `supabase/functions/historical_cash_inflow_answer/index.ts`

Runtime config updated:

- `supabase/config.toml`
  - `[functions.historical_cash_inflow_summary]`
  - `[functions.historical_cash_inflow_answer]`
  - both with `verify_jwt = false`

Purpose:

- expose a first end-user consumer of historical `incassi`,
- keep it clearly separate from the existing competence-based historical card,
- validate that the new cash-inflow context is usable by the same AI product
  pattern already used elsewhere.

Current behavior:

- `Storico` now renders two separate AI cards:
  - one for `compensi`
  - one for `incassi`
- the new card supports:
  - guided summary
  - single-turn free question
- the new card reuses the existing model selection in Settings,
- but it keeps copy and prompts explicitly centered on received cash only.

Browser validation completed on `2026-02-28`:

- authenticated login on the real local runtime
- open `Storico`
- trigger guided summary on `AI: spiegami gli incassi`
- trigger suggested question:
  - `Qual è stato l'anno con più incassi ricevuti?`
- observed result:
  - guided summary rendered
  - question answer rendered
  - visible output mentioned `2025`
  - console errors observed:
    - `0`
  - page errors observed:
    - `0`

Important operational note:

- the first deploy returned `401 Invalid JWT` in browser,
- root cause was not the prompt or the provider method,
- root cause was missing `verify_jwt = false` entries for the new function
  slugs in `supabase/config.toml`,

### Historical cash-inflow non-AI surface added

New frontend/UI pieces:

- `src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowCard.tsx`
- `src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowCard.test.tsx`

Purpose:

- give `Storico` a first plain visual surface for `incassi` without requiring
  an AI question first,
- reuse the same semantic context already used by the AI card,
- keep received cash explicitly separate from competence-based widgets.

Current behavior:

- `Storico` now renders one dedicated non-AI card for historical `incassi`,
- the card shows:
  - total historical cash received
  - latest closed-year cash received
  - the latest yearly rows with payment/project/client counts
  - the first semantic caveat from the shared context
- the card is full-width and intentionally sits outside:
  - competence KPI/chart blocks
  - AI cards
- no competence KPI/chart label was changed or mixed with cash wording.

Validation completed on `2026-02-28`:

- `npm run typecheck`
- `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowAiCard.test.tsx src/lib/analytics/buildHistoricalCashInflowContext.test.ts`

Observed test coverage:

- ready state
- empty state
- error state + retry
- `Storico` parent render including the new card
- redeploy after adding those entries fixed the browser path.

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

### Commercial backbone slice 3 now implemented

What was added:

- no new migration was needed
- quote show now includes a dedicated `Pagamenti collegati` section
- the section reads linked rows through the existing `payment.quote_id`
  relation
- the section now shows:
  - received total
  - open registered total
  - remaining amount still not linked to payments
  - direct list of linked payments with date/status/type

Important scope decision:

- this is still a lightweight UX slice, not a new invoicing module
- quote and project remain optional domain objects
- no automatic status transition was introduced
- the goal is:
  - make the quote a clearer control point for commercial follow-up
  - without forcing extra workflow on simple jobs

Validation completed on `2026-02-28`:

- `npm run typecheck`
- `npm test -- --run src/components/atomic-crm/quotes/quotePaymentsSummary.test.ts src/components/atomic-crm/quotes/QuotePaymentsSection.test.tsx src/components/atomic-crm/payments/paymentLinking.test.ts src/components/atomic-crm/quotes/quoteProjectLinking.test.ts src/components/atomic-crm/quotes/quoteItems.test.ts`
- authenticated browser smoke on the local Vite runtime:
  - login with a temporary smoke user
  - open the hash route:
    - `http://127.0.0.1:4173/#/quotes/<id>/show`
  - verify the real quote detail renders:
    - `Pagamenti collegati`
    - `Ricevuto`
    - `Da ricevere gia registrato`
    - `Ancora da collegare`
    - linked payment rows `Acconto` and `Saldo`
  - observed browser result:
    - `0` console errors
    - `0` page errors
    - `0` request failures

Covered behavior:

- linked-payment summary by status
- remaining amount vs quote total
- empty state
- non-blocking error state
- real browser render on the authenticated quote show path

### Commercial backbone slice 4 now implemented

What was added:

- no new migration was needed
- client show now includes a direct `Nuovo pagamento` entry point
- the button reuses the existing payment create form with only:
  - `client_id` prefilled
- supporting helpers now exist for the simple path too:
  - `buildPaymentCreateDefaultsFromClient()`
  - `buildPaymentCreatePathFromClient()`

Important scope decision:

- this slice exists exactly for the lightweight cases where a project would be
  unnecessary overhead
- no new dialog or duplicate payment form was introduced
- the goal is:
  - make `client -> payment` as real and explicit as the quote-driven paths
  - while keeping the same payment form and validation logic

Validation completed on `2026-02-28`:

- `npm run typecheck`
- `npm test -- --run src/components/atomic-crm/payments/paymentLinking.test.ts src/components/atomic-crm/quotes/QuotePaymentsSection.test.tsx src/components/atomic-crm/quotes/quotePaymentsSummary.test.ts`
- authenticated browser smoke on the local Vite runtime:
  - login with a temporary smoke user
  - open the hash route:
    - `http://127.0.0.1:4173/#/clients/<id>/show`
  - click:
    - `Nuovo pagamento`
  - verify redirect to:
    - `http://127.0.0.1:4173/#/payments/create?client_id=<id>`
  - verify the real payment form already shows the selected client
  - observed browser result:
    - `0` console errors
    - `0` page errors
    - `0` request failures

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

Validation now completed on the real browser path too:

- authenticated browser click-test completed on `2026-02-28`
- local runtime used:
  - `http://127.0.0.1:4173/`
- automation used:
  - Playwright via `npx`
  - installed Google Chrome binary
- verified UI path:
  - login with temporary authenticated user
  - open `Annuale`
  - trigger the suggested payment/quote question
  - wait for the answer in browser
- observed result:
  - the answer cited `Diego Caltabiano`
  - the answer correctly stated that no open quotes were present in the same
    `2026` perimetro
  - browser console errors:
    - none
  - browser page errors:
    - none

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
- `src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowCard.test.tsx`
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
- historical cash-inflow non-AI card ready/empty/error states,
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

Operational helper now available for future authenticated smokes:

- `node scripts/auth-smoke-user.mjs create`
- `node scripts/auth-smoke-user.mjs cleanup --user-id <id>`

Important local browser note:

- this CRM uses hash routing on the local Vite runtime
- for authenticated browser smokes, open routes in the form:
  - `http://127.0.0.1:4173/#/...`
- example:
  - `http://127.0.0.1:4173/#/quotes/<id>/show`
- do not use:
  - `http://127.0.0.1:4173/quotes/<id>/show`

Purpose:

- stop rebuilding temporary-user auth flows from scratch in every session,
- keep the remote smoke path fast and repeatable,
- centralize the correct sequence:
  - resolve `service_role` via CLI
  - create confirmed user
  - wait for `sales`
  - verify password login
  - cleanup `sales -> auth.users`

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
- the richer `annual_operations` drill-down is now validated on both:
  - the remote answer path
  - the real browser UI path
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

1. Keep the new historical / annual / commercial tests updated whenever the
   current widgets evolve.
2. Re-check whether any real workflow hole is still left after the now-closed
   `client -> payment`, `quote -> payment`, and `quote -> project -> payment`
   paths.
3. If no real gap is left after that review, stop this phase and treat new
   ideas as `v2`.
4. Only later, if useful, polish prompt/copy or markdown presentation further.
5. Only later, if product scope changes, revisit broader AI/chat or FakeRest.

## Quick Resume Checklist

- Read the spec:
  - `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
- Read this handoff:
  - `docs/historical-analytics-handoff.md`
- Read the backlog:
  - `docs/historical-analytics-backlog.md`
- Then continue from:
  - keeping historical, annual and commercial tests aligned with future widget changes
  - checking whether the commercial base is now enough on the three target paths
  - otherwise closing the phase and deferring new ideas to `v2`
