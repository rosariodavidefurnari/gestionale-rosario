# Historical Analytics Backlog

Last updated: 2026-03-01

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
- the simple `client -> payment` path now has a direct UI entry point too,
- the quote-driven quick-payment path is now browser-validated too, including
  the case with no linked project,
- the `quote_items` foundation is now implemented inside `quotes` without
  introducing a separate CRUD module,
- quote show now also exposes a first non-invasive visibility layer for linked
  payments,
- that quote-side payment visibility layer is now browser-validated too on the
  real authenticated quote show path,
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
  - with authenticated remote verification already closed,
- and that same `incassi` layer now has a first separate end-user AI consumer:
  - `DashboardHistoricalCashInflowAiCard`
  - `historical_cash_inflow_summary`
  - `historical_cash_inflow_answer`
  - browser-validated on the real authenticated UI path,
- and that same `incassi` layer now also has a first separate non-AI surface:
  - `DashboardHistoricalCashInflowCard`
  - test-validated on the real `Storico` render path.
- and a first operational semantic backbone now exists too:
  - `crmSemanticRegistry`
  - `operationalConfig.defaultKmRate`
  - `services.is_taxable`
  - shared km/service formulas reused by UI, fiscal model, and future AI
    consumers.
- and a first product-capability / communication foundation now exists too:
  - `crmCapabilityRegistry`
  - `quoteStatusEmailTemplates`
  - `quoteStatusEmailContext`
  - `dataProvider.getQuoteStatusEmailContext()`
  - `dataProvider.sendQuoteStatusEmail()`
  - `quote_status_email_send`
  - `SendQuoteStatusEmailDialog`
  - manual Gmail SMTP send path from quote show
  - `CallMeBot` declared as the planned internal high-priority notification
    channel

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

Strategic product note:

- the long-term goal is **not** to keep shipping isolated AI widgets in many
  pages,
- but to unify the useful AI capabilities into one clearer AI experience
  without losing what already works.
- the current page-level AI cards should therefore be treated as transitional,
  not as the final UX architecture.
- the approved execution path is now explicit too:
  - first a general `read-only` CRM chat
  - only later assisted writes with explicit confirmation
  - no free autonomous CRM writes

## First Open Priority

The manual quote-status email step is now closed.
It is also runtime-verified on the linked remote project:

- `SMTP_*` secrets set on `qvdmzhyzpyaveniirsmo`
- `quote_status_email_send` deployed remotely
- authenticated invoke returned `accepted` with SMTP response `250 2.0.0 OK`
- smoke user and smoke quote/client cleaned after verification

The floating launcher step is now closed too:

- one unified AI launcher now exists as a small whole-site floating button
- it opens the same shell everywhere from shared layout
- it does not add a new AI page in the main navigation
- it is now declared in the capability registry as the unified AI entry point

The separate settings step is now closed too:

- `Impostazioni -> AI` now exposes a dedicated invoice-extraction model field
- default:
  - `gemini-2.5-pro`
- old persisted configs now keep the new nested AI default safely

The invoice vertical-slice step is now closed too:

- the unified launcher now supports mixed invoice ingestion with
  `@google/genai`
- upload accepts:
  - `PDF` digitali
  - scansioni/foto con layout variabili
- the assistant now returns one structured proposal editable directly in the
  same chat shell before saving
- explicit confirmation now writes only into existing CRM resources:
  - `payments`
  - `expenses`
- provider entry points now exist for:
  - workspace read
  - temp file upload
  - draft extraction
  - confirmed write
- runtime verification is now closed too on `qvdmzhyzpyaveniirsmo`:
  - `GEMINI_API_KEY` aligned
  - `invoice_import_extract` deployed
  - authenticated smoke with `customer.pdf` + `supplier.png` returned one
    `payments` draft and one `expenses` draft
  - the corrected proposal was then written into remote `payments` /
    `expenses`
  - smoke data cleaned after verification

The read-context step is now closed too:

- one stable provider entry point now exists:
  - `getUnifiedCrmReadContext()`
- the launcher now renders a read-only CRM snapshot in the same shell
- the snapshot reuses semantic + capability registries instead of rebuilding
  meanings inside the component
- the snapshot now covers:
  - `clients`
  - `quotes`
  - `projects`
  - `payments`
  - `expenses`
- no new AI page or page-level AI widget was added to deliver this step

The general CRM answer step is now closed too:

- the unified launcher now supports the first read-only AI answer flow on top
  of the shared CRM-wide snapshot
- the flow uses:
  - the same launcher shell
  - the same snapshot the user sees
  - the existing text-model setting already used by Storico/Annuale
- no new AI page or page-level AI widget was added
- runtime verification is now closed too on `qvdmzhyzpyaveniirsmo`:
  - `unified_crm_answer` deployed
  - authenticated smoke question returned HTTP `200`
  - answer markdown came back grounded on the real snapshot and repeated the
    read-only/write-confirmation boundary
  - smoke user cleaned after verification

The guided route-handoff step is now closed too:

- unified launcher answers now include structured `suggestedActions`
- the handoff targets stay on existing approved CRM surfaces:
  - record show routes
  - resource list routes
  - dashboard
- routes are built deterministically from the shared snapshot + hash route
  prefix, not generated free-form by the model
- runtime verification is now closed too on `qvdmzhyzpyaveniirsmo`:
  - `unified_crm_answer` redeployed
  - authenticated smoke question `Chi mi deve ancora pagare?` returned HTTP
    `200`
  - response included one grounded answer plus handoff actions for:
    - `payments show`
    - `payments list`
    - `clients show`
  - smoke user cleaned after verification

The first action-oriented commercial handoff step is now closed too:

- unified launcher answers now include both generic route handoff and approved
  commercial handoff
- the approved commercial targets currently include:
  - `quote_create_payment`
  - `client_create_payment`
  - `project_quick_payment`
- `suggestedActions` remain deterministic:
  - routes and query params come from the shared snapshot
  - the model does not invent commercial URLs
- runtime verification is now closed too on `qvdmzhyzpyaveniirsmo`:
  - `unified_crm_answer` redeployed
  - authenticated smoke question `Chi mi deve ancora pagare?` returned HTTP
    `200`
  - response included one grounded answer plus handoff actions for:
    - `payments show`
    - `quote_create_payment`
    - `project_quick_payment`
  - smoke user cleaned after verification

The next open priority is:

- make the handoff more guided on top of approved commercial surfaces, still
  inside the same floating shell
- improve intent/context mapping so the launcher picks the most coherent
  approved entry point before any future write-execution discussion
- keep the general CRM chat without direct write execution

That guided commercial handoff step is now closed too:

- `suggestedActions` can now carry one explicit primary recommendation
- payment-oriented questions that already ask to register/add a payment now
  prioritize the approved action handoff instead of a generic show route
- the recommendation metadata stays deterministic:
  - `recommended`
  - `recommendationReason`
- runtime verification is now closed too on `qvdmzhyzpyaveniirsmo`:
  - `unified_crm_answer` redeployed
  - authenticated smoke question
    `Da dove posso registrare un pagamento sul preventivo aperto?` returned
    HTTP `200`
  - response included:
    - first action `quote_create_payment`
    - `recommended = true`
    - deterministic reason text
  - smoke user cleaned after verification

The next open priority is:

- keep the general launcher inside approved commercial surfaces, but deepen the
  landing quality on those surfaces
- hand off the user to the destination that already exists with the strongest
  usable prefill/context, before any future chat-side write draft
- still do not give the general CRM chat direct write execution

That richer landing step is now closed too:

- approved handoffs now carry deterministic launcher context into existing CRM
  surfaces
- `payments/create` handoffs can now transport:
  - `quote_id`
  - `client_id`
  - `project_id`
  - explicit `payment_type` when inferable from the question
  - launcher metadata for UI copy
- `project_quick_payment` handoffs now land on project show with:
  - `open_dialog=quick_payment`
  - optional `payment_type`
  - launcher metadata for banner/copy
- the landing surfaces stay inside already approved UI:
  - `PaymentCreate` banner + supported prefills
  - `ProjectShow` banner
  - `QuickPaymentDialog` auto-open with supported defaults only
- runtime verification is now closed too on `qvdmzhyzpyaveniirsmo`:
  - `unified_crm_answer` redeployed
  - authenticated smoke question
    `Come posso registrare il saldo del progetto attivo?` returned HTTP `200`
  - response included first action `project_quick_payment` with:
    - `recommended = true`
    - launcher search params
    - `payment_type=saldo`
  - smoke user cleaned after verification

The next open priority is:

- keep the launcher on approved commercial surfaces, but close the last manual
  gaps that still appear after landing
- prioritize missing prefills or missing approved destination variants before
  any future general write-draft discussion
- still do not give the general CRM chat direct write execution

That landing-gap step is now closed too for the quote-driven payment path:

- `payments/create` now reads the linked quote context more deeply on the
  destination surface
- the form now surfaces:
  - quote amount
  - already linked total
  - remaining still-unlinked amount
- for standard payment types, the form can suggest a deterministic amount equal
  to the residual not yet linked to payments
- the suggestion remains local to the destination surface:
  - not model-generated
  - not auto-confirmed
  - always editable by the user
- `rimborso` / `rimborso_spese` do not receive the same automatic amount
  suggestion here
- this slice did not require a function redeploy:
  - local validation closed with `npm run typecheck`
  - targeted Vitest passed on payment linking + registries

The next open priority is now closed too:

- the launcher can now prepare a first narrow `payment` write-draft on top of
  the quote-driven commercial path
- the draft is deliberately constrained:
  - it only appears when the question clearly asks to prepare/register/create a
    payment
  - it only targets open quotes with eligible status and positive residual
  - it only proposes `acconto` / `saldo` / `parziale`
- the response contract now includes a structured `paymentDraft` payload that:
  - stays editable in the launcher
  - never writes from chat
  - deep-links into the already approved `payments/create` route with supported
    query params
- runtime verification is now closed too on `qvdmzhyzpyaveniirsmo`:
  - `unified_crm_answer` redeployed
  - authenticated smoke question
    `Preparami una bozza saldo dal preventivo aperto.`
  - response returned:
    - `paymentDraft.paymentType = saldo`
    - `paymentDraft.amount = 450`
    - `paymentDraft.status = in_attesa`
    - approved `/#/payments/create?...&draft_kind=payment_create` href
  - smoke user cleaned after verification

The next open priority is now closed too:

- the first confirmation-on-surface workflow upgrade around the payment draft is
  now implemented on `payments/create`
- the approved destination form now preserves an explicit amount edited in the
  launcher draft instead of silently replacing it with the local residual
  suggestion
- the form now also exposes both layers when relevant:
  - imported AI draft amount
  - current deterministic residual from the linked quote
- the user can still switch manually to the local residual suggestion, but that
  choice is explicit on the approved surface
- this slice stayed local:
  - no function changes needed
  - no chat-side write added
  - validation closed with `npm run typecheck` plus targeted Vitest

The next open priority is now closed too:

- the first payment draft hardening pass now also scopes draft preservation to
  the same quote context that originated the draft
- when the destination form changes quote, the old launcher draft amount is no
  longer privileged over the deterministic local suggestion of the new quote
- this avoids a misleading continuity bug on the approved form:
  - preserve imported edits only while the business context is still the same
  - stop treating them as active when the quote changes
- this slice stayed local and deterministic:
  - no edge-function change
  - no new write capability
  - validation closed with `npm run typecheck` plus targeted Vitest

The next open priority is now closed too:

- the payment draft hardening pass now also makes draft-context invalidation
  explicit on the approved destination form
- when the user changes quote after landing on `payments/create`:
  - the old launcher draft is no longer applied
  - the UI now states clearly that the AI draft belonged to another quote
  - the surface reverts to the local semantics of the quote currently selected
- this closes another ambiguity inside the already approved corridor without
  widening the AI perimeter:
  - no edge-function change
  - no new write capability
  - validation closed with `npm run typecheck` plus targeted Vitest

The next open priority is now closed too:

- the payment draft hardening pass now also protects manual amount editing on
  the approved destination form
- once the user starts editing `amount` on `payments/create`:
  - the automatic residual suggestion no longer reclaims the field
  - the suggestion remains available only as an explicit CTA
  - transient empty states while typing no longer trigger an unwanted refill
- this removes another instability from the already approved corridor without
  widening the AI perimeter:
  - no edge-function change
  - no new write capability
  - validation closed with `npm run typecheck` plus targeted Vitest

The next open priority is now closed too:

- the launcher now supports a second narrow payment write-draft on the
  approved `project_quick_payment` surface
- the CRM read snapshot now exposes deterministic active-project financials
  derived from services, expenses and received payments
- the project quick-payment dialog can now consume a launcher draft carrying:
  - `payment_type`
  - `amount`
  - `status`
- this still does not give the general CRM chat direct write execution:
  - chat only prepares the draft
  - confirmation still happens inside the approved project dialog

Default line after this:

- do not open another write-assisted case by default
- only resume expansion if a new real workflow gap appears or the next scope is
  made explicit

Tactical UX slice closed out of sequence:

- the launcher shell was simplified before opening the next milestone:
  - `Chat AI` now opens as the default view
  - `Snapshot CRM` and `Importa fatture e ricevute` moved behind a `+` menu
  - the chat view remains mounted while switching views, so state is preserved
  - the chat panel now keeps answers above and the composer at the bottom
  - the `+` control now sits to the left of the composer input instead of near
    the close `X`
- this did not widen the AI capability perimeter:
  - no new routes
  - no new edge functions
  - no new write power
- validation closed with:
  - `npm run typecheck`
  - `npm test -- --run src/components/atomic-crm/ai/UnifiedAiLauncher.test.tsx`

Deferred note from real usage, not current priority:

- importing an older customer invoice can legitimately find a real client that
  is still absent from the CRM
- the launcher does not yet support creating that missing client from the
  invoice workflow
- the current client model also lacks some billing-specific fields needed for a
  solid invoice-born customer draft
- this must be handled later as an explicit slice:
  - define the missing billing anagraphic fields first
  - then allow AI-assisted client creation only with explicit confirmation

That deferred note is now promoted to the next explicit slice, and the
analysis is now closed:

- evidence inspected:
  - current `clients` table and UI
  - current invoice-import draft / extract contract
  - real outgoing invoices under `Fatture/2023`, `Fatture/2024`,
    `Fatture/2025`
  - current `expenses` linkage
- the current gap is structural, not just UX:
  - `clients` still stores only one freeform `address`
  - `clients` still merges `Partita IVA / Codice Fiscale` into one `tax_id`
  - invoice import still has nowhere structured to keep billing anagraphic
    fields even when Gemini sees them
- recurring customer billing fields observed in real XML invoices:
  - `Denominazione`
  - `IdPaese`
  - `IdCodice`
  - `CodiceFiscale`
  - `Indirizzo`
  - `NumeroCivico`
  - `CAP`
  - `Comune`
  - `Provincia`
  - `Nazione`
  - `CodiceDestinatario`
- the next slice must therefore proceed in this order:
  - first define the client billing-profile fields in schema, types and UI
  - then extend invoice extraction + draft payload so the launcher can carry
    those fields coherently
  - only after that consider AI-assisted client creation, always with explicit
    confirmation
- keep the supplier/vendor problem as a separate later slice:
  - `expenses` still links counterparties through `client_id`
  - there is still no dedicated supplier resource/page
  - do not mix supplier-resource design into the customer billing-profile
    migration unless a hard blocker appears

Why this comes next:

- the launcher now has the base layers it needed:
  - a real invoice workflow
  - a real CRM-wide read snapshot
  - a real CRM-wide read-only answer flow
  - a first practical route handoff from grounded answer to existing CRM
    surfaces
  - a first approved commercial handoff toward real payment-oriented surfaces
- a first deterministic primary recommendation on top of those approved actions
- a first richer landing on those approved commercial surfaces with supported
  prefills and launcher context
- a first deterministic destination-side amount suggestion on the quote payment
  path
- the next Pareto gain is therefore not another raw Q&A surface, but closing
  the last manual context gaps on top of those approved landings
- the semantic/capability backbone is already strong enough for this next step

Not the next step by default:

- a new AI page in the main navigation
- more page-level AI cards
- more dashboard widgets
- broader automation after the manual path is already stable
- direct write execution from the general CRM Q&A flow
- automatic invoice writes without explicit confirmation
- letting the model invent raw URLs or unsupported routes

## Stop Line For This Phase

This work must not grow forever. For this phase, `enough` means:

- `Storico` stays reliable on its current semantic split:
  - `compensi`
  - `incassi`
- `Annuale` stays AI-enabled only on the approved `annual_operations` context,
  without trying to absorb fiscal simulation or alert logic into the same AI
  payload.
- the commercial backbone stays solid on the real cases that matter now:
  - `client -> payment`
  - `quote -> payment`
  - `quote -> project -> payment`
- `quote` and `project` remain optional:
  - do not force them on simple jobs such as lightweight wedding work.

What is already enough today:

- the current `Storico` AI and non-AI foundations,
- the current `Annuale` AI operational flow,
- the current client/quote/project/payment links already validated in the real
  UI.

What is still legitimate work in this phase:

- keeping tests and semantic rules aligned when these existing widgets change,
- at most one more small commercial slice if it closes a real workflow gap,
- importing more real historical data only when it becomes product-useful.

What is **not** part of this phase by default:

- turning `Annuale` into a full-page AI assistant,
- opening a multi-turn global AI chat across the whole CRM,
- adding more dashboard cards unless one replaces confusion with clarity,
- inventing workflow steps that create bureaucracy without better data.
- adding more scattered AI interfaces unless they are clearly temporary and
  compatible with later unification.
- re-spreading business meanings across forms instead of reusing the semantic
  registry and shared formulas.
- shipping customer-facing status emails from page-level copy instead of one
  shared template layer with explicit send policy.
- leaving dead communication branches like `Postmark` in the repo after the
  product direction has already moved elsewhere.

Stop condition:

- if the current UI already supports the three commercial paths above without
  forcing fake structure,
- and `Storico` / `Annuale` keep producing coherent outputs on the current
  validated paths,
- this phase is complete enough and new ideas belong to `v2`, not to endless
  slice expansion.

## How To Use This Backlog In A New Chat

Ask the new session to:

1. read `docs/historical-analytics-handoff.md`
2. read this file
3. read `doc/src/content/docs/developers/historical-analytics-ai-ready.mdx`
4. continue from the first unfinished priority without re-opening already closed architecture decisions
5. if a feature changes CRM behavior, update the semantic registry, capability
   registry, tests, and continuity docs in the same pass

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

### Operational semantic backbone for AI-safe read/write

- Added shared semantic registry:
  - `src/lib/semantics/crmSemanticRegistry.ts`
- Added provider access:
  - `dataProvider.getCrmSemanticRegistry()`
- Added configurable operational rule:
  - `operationalConfig.defaultKmRate`
- Added service fiscal flag:
  - `services.is_taxable`
- Added semantic descriptions to fixed dictionaries:
  - client types
  - acquisition sources
  - project categories / statuses / TV shows
  - quote statuses
  - payment types / methods / statuses
- Reused the same formulas in the real app:
  - service net value
  - taxable service net value
  - travel reimbursement
- Aligned real UI paths:
  - service create/show/list
  - expense create/show/list
  - quick TV episode creation
  - fiscal model
- Validation completed on `2026-02-28`:
  - `npm run typecheck`
  - `npm test -- --run src/lib/semantics/crmSemanticRegistry.test.ts src/components/atomic-crm/dashboard/fiscalModel.test.ts src/components/atomic-crm/dashboard/dashboardAnnualModel.test.ts src/lib/analytics/buildAnnualOperationsContext.test.ts`
  - `npx supabase db push`

### Capability registry and quote-status email templates

- Added a first capability catalog for the future unified AI:
  - `src/lib/semantics/crmCapabilityRegistry.ts`
- It now declares:
  - main resources
  - main pages
  - critical dialogs/modals
  - important business actions
  - route mode (`hash`)
  - a mandatory integration checklist for future features
- Added a first communication template layer:
  - `src/lib/communications/quoteStatusEmailTemplates.ts`
- It now supports:
  - quote-status specific send policies
  - dynamic HTML/text output
  - required-field checks before sending
  - shared sections instead of hardcoded page copy
  - hard safety rule:
    - services with `is_taxable = false` must never trigger automatic emails
- Product direction locked:
  - outbound mail target is `Gmail`
  - the current template layer stays provider-agnostic until credentials and
    transport are wired
  - internal urgent notifications target `CallMeBot`
- Cleanup completed:
  - the old inbound `postmark` function and related profile UI/config were
    removed from the repo
- Validation completed on `2026-02-28`:
  - `npm run typecheck`
  - `npm test -- --run src/lib/communications/quoteStatusEmailTemplates.test.ts src/lib/semantics/crmCapabilityRegistry.test.ts src/lib/semantics/crmSemanticRegistry.test.ts`

### Manual quote-status email sending via Gmail SMTP

- Added shared context builder:
  - `src/lib/communications/quoteStatusEmailContext.ts`
- Added provider entry points:
  - `dataProvider.getQuoteStatusEmailContext()`
  - `dataProvider.sendQuoteStatusEmail()`
- Added real UI entry point:
  - `src/components/atomic-crm/quotes/SendQuoteStatusEmailDialog.tsx`
- Added real transport:
  - `supabase/functions/quote_status_email_send/index.ts`
- Added current user-facing behavior:
  - quote show now exposes `Invia mail cliente`
  - the dialog previews subject/body before sending
  - the send remains manual only
  - the dialog reuses `quoteStatusEmailTemplates`
  - the send is disabled when required fields are missing
- Added semantic/capability continuity:
  - capability registry now declares the manual send action and Gmail SMTP env
  - semantic registry now declares the customer-facing residual formula:
    - quote amount minus linked payments already `ricevuto`
- Hard rule preserved:
  - if linked services include `is_taxable = false`, automatic send remains
    blocked
  - no automatic customer send path was introduced in this slice
- FakeRest continuity:
  - the same provider entry points now exist in FakeRest too
  - send stays mocked there, with no real email delivery
- Validation completed on `2026-02-28`:
  - `npm run typecheck`
  - `npm test -- --run src/lib/communications/quoteStatusEmailTemplates.test.ts src/lib/communications/quoteStatusEmailContext.test.ts src/lib/semantics/crmCapabilityRegistry.test.ts src/lib/semantics/crmSemanticRegistry.test.ts src/components/atomic-crm/quotes/SendQuoteStatusEmailDialog.test.tsx supabase/functions/_shared/quoteStatusEmailSend.test.ts`

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

### Quote payment visibility slice completed

- Added quote-side payment summary helper:
  - `quotePaymentsSummary.ts`
- Added quote-side UI section:
  - `QuotePaymentsSection.tsx`
- Added product behavior:
  - quote show now exposes linked-payment visibility without leaving the quote
  - the user can read:
    - already received
    - already registered but still open
    - remaining amount not yet linked to payments
    - individual linked payment rows
- Scope rule preserved:
  - no new mandatory object was introduced
  - no automatic status transition was introduced
  - the feature strengthens the current `quote -> payment` link instead of
    inventing a heavier workflow
- Validation on `2026-02-28`:
  - `npm run typecheck`
  - `npm test -- --run src/components/atomic-crm/quotes/quotePaymentsSummary.test.ts src/components/atomic-crm/quotes/QuotePaymentsSection.test.tsx src/components/atomic-crm/payments/paymentLinking.test.ts src/components/atomic-crm/quotes/quoteProjectLinking.test.ts src/components/atomic-crm/quotes/quoteItems.test.ts`

### Client direct-payment slice completed

- Added client-side quick path helpers:
  - `buildPaymentCreateDefaultsFromClient()`
  - `buildPaymentCreatePathFromClient()`
- Added product behavior:
  - client show now exposes `Nuovo pagamento`
  - the button opens the existing payment create form with `client_id`
    already set
- Scope rule preserved:
  - no new mandatory object was introduced
  - no project is forced for the simple case
  - no duplicate payment form/dialog was introduced
- Validation on `2026-02-28`:
  - `npm run typecheck`
  - `npm test -- --run src/components/atomic-crm/payments/paymentLinking.test.ts src/components/atomic-crm/quotes/QuotePaymentsSection.test.tsx src/components/atomic-crm/quotes/quotePaymentsSummary.test.ts`
  - authenticated browser smoke:
    - `client show -> Nuovo pagamento -> payment create with client prefilled`

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
  - do not mix `incassi` into the existing competence widgets
  - keep `compensi` and `incassi` as separate semantic bases

### Historical `incassi` AI consumer added

- Added dedicated UI card:
  - `DashboardHistoricalCashInflowAiCard`
- Added provider methods:
  - `generateHistoricalCashInflowSummary()`
  - `askHistoricalCashInflowQuestion()`
- Added Edge Functions:
  - `historical_cash_inflow_summary`
  - `historical_cash_inflow_answer`
- Added browser/UI tests:
  - `DashboardHistoricalCashInflowAiCard.test.tsx`
- Added runtime config continuity:
  - `supabase/config.toml`
  - `[functions.historical_cash_inflow_summary] verify_jwt = false`
  - `[functions.historical_cash_inflow_answer] verify_jwt = false`
- Added browser validation on `2026-02-28`:
  - authenticated login on the real local runtime
  - guided summary rendered
  - suggested-question answer rendered
  - no console errors
  - no page errors
- Scope rule preserved:
  - the new card stays separate from the existing `Storico` KPI/chart widgets
  - `compensi` and `incassi` are still never mixed in one widget

### Historical `incassi` non-AI surface added

- Added dedicated UI card:
  - `DashboardHistoricalCashInflowCard`
- Added browser/UI tests:
  - `DashboardHistoricalCashInflowCard.test.tsx`
  - `DashboardHistorical.ui.test.tsx`
- Added product behavior:
  - `Storico` now shows a small non-AI card for received cash
  - the card reuses `dataProvider.getHistoricalCashInflowContext()`
  - the card keeps totals/yearly rows/caveat wording centered on `incassi`
- Scope rule preserved:
  - the card is separate from competence KPIs/charts
  - the card does not rename or reinterpret any `compensi` widget
- Validation on `2026-02-28`:
  - `npm run typecheck`
  - `npm test -- --run src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowCard.test.tsx src/components/atomic-crm/dashboard/DashboardHistorical.ui.test.tsx src/components/atomic-crm/dashboard/DashboardHistoricalCashInflowAiCard.test.tsx src/lib/analytics/buildHistoricalCashInflowContext.test.ts`

## Priority 1

### Keep the new historical / annual / commercial tests updated if widgets evolve

Why:

- the current baseline is now protected by tests across:
  - historical widgets,
  - annual operations AI,
  - commercial backbone helpers,
  - quote itemization helpers,
  - and the new historical cash-inflow AI card.

Tasks:

- when historical/annual/commercial widgets change, update the tests in the
  same branch,
- keep coverage for empty/error/YTD/YoY semantics and AI card actions,
- keep `quote_items` and lookup-helper tests aligned with any future form
  refactor,
- for authenticated smoke on the linked Supabase project, reuse
  `scripts/auth-smoke-user.mjs` instead of rebuilding temp-user auth manually,
- for authenticated browser smoke on the local Vite runtime, always use
  hash-based routes:
  - `http://127.0.0.1:4173/#/...`
  - example: `http://127.0.0.1:4173/#/quotes/<id>/show`
- keep `supabase/config.toml` aligned when new UI-invoked functions are added.

Acceptance:

- regressions in semantic rendering, function wiring, or cross-module linking
  keep getting caught before shipping.

## Priority 2

### Commercial base review before stopping the phase

Why:

- the target paths for this phase are now all represented in the UI:
  - `client -> payment`
  - `quote -> payment`
  - `quote -> project -> payment`
- so the right next move may now be to stop, not to invent more slices.

Tasks:

- verify whether a concrete workflow hole still exists in one of the three
  target paths,
- if no such gap exists, stop this phase,
- if a gap does exist, only then justify one further small slice.

Acceptance:

- either:
  - the phase is declared complete enough on the commercial side,
  - or one last small slice is justified by a real gap instead of by momentum.

## Priority 3

### Future AI interface unification

Why:

- a fundamental product goal is to stop keeping AI features scattered across
  many pages,
- while preserving the already useful capabilities and avoiding regressions.

Tasks:

- only after the current foundations are considered stable, map the existing
  AI entry points and converge them into one clearer experience,
- keep the semantic rules unchanged,
- preserve the capabilities already validated in `Storico` and `Annuale`,
- do not remove page-level utility until the unified replacement is at least as
  usable.

Acceptance:

- AI functionality becomes easier to use from one place,
- without losing the current validated question/answer capabilities,
- and without creating regressions in simple day-to-day use.

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

## Priority 5

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
