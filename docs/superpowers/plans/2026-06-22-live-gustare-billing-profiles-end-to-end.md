# LIVE Gustare Billing Profiles Persistent Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the LIVE SRLS / Gustare Sicilia case end-to-end without
duplicating clients, projects or contacts.

**Architecture:** Keep `clients` as the operational account and introduce
`client_billing_profiles` as the fiscal recipient catalog under each client.
Link issued documents through nullable `financial_documents.billing_profile_id`,
then deliberately propagate the contract to invoice draft, emission, XML, PDF,
import/backfill and UI surfaces.

**Tech Stack:** Supabase/PostgreSQL migrations and views, Supabase Edge
Functions, React 19, ra-core data provider, Vitest, Playwright, local Qdrant
code-RAG, repo governance maps.

## Global Constraints

- User-facing communication is Italian.
- Code, comments, identifiers and commit messages are English.
- Do not create LIVE SRLS as an operational `clients` row.
- Do not duplicate Gustare projects or contacts.
- Do not introduce `projects_clients` unless a later reviewed spec proves it is
  necessary.
- Do not change `payments.amount`, `payments.status`, `payments.payment_date` or
  `payments.payment_type` for the 2026 backfill.
- Backend migration must be additive, replayable from zero and compatible with
  existing data.
- Every spec, plan and implementation step requires multidimensional review
  before the next gate.
- Use code-RAG before cross-file/fiscal implementation and verify every RAG
  result on source.
- Use `docs/cli/COMMAND_MAP.md`, `docs/variables/VARIABLE_MAP.md`,
  `docs/workflows/WORKFLOW_MAP.md` and `docs/artifacts/ARTIFACT_MAP.md` before
  commands, variables, workflows or artifact decisions covered by governance.
- UI/UX work must use `impeccable`, declare `IMPECCABLE_PREFLIGHT`, and pass
  real browser desktop plus real browser mobile verification with console
  checked.
- Progress by sensible commits: one reviewed unit per commit, with related code
  and docs together.

---

## Source Evidence

- Active spec:
  `docs/superpowers/specs/2026-06-22-client-billing-profiles-design.md`
- Backend slice plan:
  `docs/superpowers/plans/2026-06-22-client-billing-profiles-backend.md`
- Cantiere:
  `docs/CANTIERE.md`
- Current invoice view migrations:
  `supabase/migrations/20260302010500_financial_documents_foundation.sql`,
  `supabase/migrations/20260308010000_update_financial_documents_summary_supplier.sql`,
  `supabase/migrations/20260331194623_fix_timezone_in_financial_documents_summary.sql`,
  `supabase/migrations/20260413202155_fix_security_invoker_on_views.sql`
- Invoice emission:
  `supabase/functions/_shared/invoiceEmit.ts`,
  `supabase/functions/invoice_emit/index.ts`,
  `src/components/atomic-crm/invoicing/useEmitInvoice.ts`,
  `src/components/atomic-crm/invoicing/InvoiceDraftDialog.tsx`,
  `src/components/atomic-crm/invoicing/invoiceDraftXml.ts`,
  `src/components/atomic-crm/invoicing/invoiceDraftPdf.tsx`
- Client UI:
  `src/components/atomic-crm/clients/ClientShow.tsx`,
  `src/components/atomic-crm/clients/ClientCreate.tsx`,
  `src/components/atomic-crm/clients/ClientEdit.tsx`,
  `src/components/atomic-crm/clients/ClientInputs.tsx`
- Invoice list/show:
  `src/components/atomic-crm/invoices/FinancialDocumentListContent.tsx`,
  `src/components/atomic-crm/invoices/FinancialDocumentShow.tsx`
- Import/AI surfaces:
  `src/lib/ai/invoiceImport.ts`,
  `src/lib/ai/invoiceImportProvider.ts`,
  `supabase/functions/_shared/invoiceImportConfirm.ts`,
  `src/lib/semantics/crmSemanticRegistry.ts`,
  `src/lib/semantics/crmCapabilityRegistry.ts`

## Review Dimensions

Each review records `PASS`, `FLAG` or `BLOCK` in this file or
`docs/CANTIERE.md`.

- Domain: Gustare operational account, LIVE fiscal recipient, Diego referent.
- DB/RLS: additive migration, FK behavior, RLS policy, security invoker view.
- Money/fiscal: cash semantics remain payment-led; no payment cash fields
  change during backfill.
- Propagation: all consumer surfaces are either updated or explicitly out of
  scope for the current commit.
- Desktop/mobile: every UI change has mobile parity.
- AI/semantics: registry and product AI are updated only if billing profiles are
  exposed to the chat.
- Tests: RED/GREEN or deterministic guard exists before risky code.
- Governance/RAG: code-RAG used and source-verified; maps checked.
- Operations: dry-run, rollback and remote/local split are clear.
- Commit scope: one coherent unit, no unrelated files.

---

## Task 0: Persistent Plan and Grounding

**Files:**
- Create: `docs/superpowers/plans/2026-06-22-live-gustare-billing-profiles-end-to-end.md`
- Modify: `docs/CANTIERE.md`

**Interfaces:**
- Produces the persistent execution plan for the active goal.
- Produces the Cantiere pointer used by future sessions.

- [x] **Step 1: Save this persistent plan**

Create this file with the full backend-to-UI sequence.

- [x] **Step 2: Link from Cantiere**

Add the plan path under `Obiettivo Persistente Da Perseguire`.

- [x] **Step 3: Verify plan references**

Run:

```bash
rg -n "live-gustare-billing-profiles-end-to-end|client_billing_profiles|billing_profile_id" docs/CANTIERE.md docs/superpowers/plans/2026-06-22-live-gustare-billing-profiles-end-to-end.md
git diff --check
```

Expected: both commands pass; Cantiere links this plan.

## Task 1: Backend Contract

**Files:**
- Create: `supabase/migrations/20260622200209_client_billing_profiles.sql`
- Modify: `src/components/atomic-crm/types.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/development-continuity-map.md`
- Modify: `docs/CANTIERE.md`

**Interfaces:**
- Produces table `client_billing_profiles`.
- Produces nullable `financial_documents.billing_profile_id`.
- Produces `billing_profile_*` read fields on `financial_documents_summary`.
- Produces TypeScript type `ClientBillingProfile`.

- [x] **Step 1: Write migration**

The migration must:

- create `public.client_billing_profiles`;
- enable RLS with authenticated full access;
- add one-default-per-client partial unique index;
- add nullable FK `financial_documents.billing_profile_id`;
- recreate `financial_documents_summary` with client, supplier and billing
  profile fields;
- set `security_invoker = on` on the recreated view.

- [x] **Step 2: Update TypeScript domain types**

Add `ClientBillingProfile`, `billing_profile_id` on `FinancialDocument`, and
`billing_profile_*` fields on `FinancialDocumentSummary`.

- [x] **Step 3: Backend review**

Review dimensions: DB/RLS, migration replayability, summary view compatibility,
money/fiscal invariants, downstream consumers.

Result 2026-06-22 retroactive gate:

- Domain: PASS. LIVE is represented as Gustare billing profile, not as an
  operational client.
- DB/RLS: PASS after correcting the stale local domain seed from the remote
  dump.
- Money/fiscal: PASS. Payment cash fields were not changed.
- Propagation: FLAG. UI/emission/import/mobile remain deferred to later reviewed
  tranches.
- Process: FLAG. Review and commit gates were late; UI work is blocked until
  backend commits exist.

- [x] **Step 4: Backend gates**

Run:

```bash
npm run typecheck
git diff --check
```

Expected: PASS.

- [ ] **Step 5: Commit backend contract**

Commit message:

```bash
feat: add client billing profiles backend contract
```

## Task 2: Financial Health and 2026 Backfill Guard

**Files:**
- Modify: `scripts/check-prod-financial-health.mjs`
- Create: `scripts/backfill-2026-invoices-with-billing-profiles.sql`
- Modify: `docs/CANTIERE.md`

**Interfaces:**
- Produces production health coverage for LIVE as Gustare billing profile.
- Produces C1/APPLY/C3 SQL for 2026 documents.

- [x] **Step 1: Add health guard**

The guard must tolerate a pending pre-backfill state, then fail if LIVE-targeted
documents exist under Gustare without a LIVE billing profile.

- [x] **Step 2: Create C1 read-only section**

C1 verifies exactly one Gustare client, no required LIVE client, zero or one LIVE
profile under Gustare, target document ambiguity, target payment linkage and
cash checksum.

- [x] **Step 3: Create APPLY section**

APPLY inserts/reuses LIVE profile, inserts 2026 documents from XML-backed
constants, links expected payments by exact safe match, and checks cash checksum
before/after.

- [x] **Step 4: Create C3 section**

C3 verifies profile existence, document links, payment links and unchanged cash
columns.

- [x] **Step 5: Review and gates**

Run:

```bash
npm run health:financial
git diff --check
```

Expected: PASS before remote apply, with pending 2026 state accepted.

- [ ] **Step 6: Commit health/backfill guard**

Commit message:

```bash
feat: guard live gustare invoice backfill
```

## Task 3: Controlled Backfill Execution

**Files:**
- Modify: `docs/CANTIERE.md`

**Interfaces:**
- Consumes `scripts/backfill-2026-invoices-with-billing-profiles.sql`.
- Produces remote or local execution evidence.

- [x] **Step 1: Run C1 read-only**

Expected: `OK_TO_APPLY` or an explicit blocking verdict with row counts.

- [x] **Step 2: Run APPLY inside transaction rollback**

Expected: no persisted writes, post-rollback C1 remains unchanged.

- [x] **Step 3: Apply only if C1 and dry-run are green**

Expected: apply returns inserted/reused profile and linked document counts.

- [x] **Step 4: Run C3 and health**

Expected: C3 `OK`, `npm run health:financial` PASS, cash checksum stable.

- [ ] **Step 5: Commit backfill evidence docs**

Commit message:

```bash
docs: record live gustare backfill evidence
```

## Task 4: UI/UX Shape and Preflight

**Files:**
- Read: `PRODUCT.md`
- Read: `DESIGN.md` if present
- Modify: `docs/superpowers/specs/2026-06-22-client-billing-profiles-design.md`
- Create or modify: UI integration plan under `docs/superpowers/plans/`

**Interfaces:**
- Produces confirmed UI/UX direction before UI code.

- [ ] **Step 1: Load Impeccable context**

Run:

```bash
node .agents/skills/impeccable/scripts/load-context.mjs
```

Expected: PRODUCT context exists. If PRODUCT is missing or placeholder, follow
the skill's `teach` requirement before UI mutation.

- [ ] **Step 2: Declare preflight**

Record:

```text
IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=skipped:existing-product-admin-ui mutation=open
```

- [ ] **Step 3: UI review**

Review dimensions: information architecture, cognitive load, mobile parity,
visual hierarchy, existing CRM patterns, no modal-first overreach.

## Task 5: Client Billing Profile Management UI

**Files:**
- Modify: `src/components/atomic-crm/clients/ClientShow.tsx`
- Modify: `src/components/atomic-crm/clients/ClientEdit.tsx`
- Modify: `src/components/atomic-crm/clients/ClientCreate.tsx` only if default
  profile creation is needed
- Modify: `src/components/atomic-crm/root/i18nProvider.tsx`
- Add focused tests beside changed components/helpers.

**Interfaces:**
- Produces a way to view and manage billing profiles from the operational
  client.

- [ ] **Step 1: Add data reads**

Use ra-core hooks against `client_billing_profiles`, filtered by `client_id`.

- [ ] **Step 2: Add create/edit UX**

Use existing admin form components from `@/components/admin/` and shadcn UI
components from `@/components/ui/`.

- [ ] **Step 3: Mobile parity**

Use compact layout patterns already present in client show surfaces.

- [ ] **Step 4: Tests and review**

Run focused component/unit tests plus typecheck.

## Task 6: Invoice Draft, Emit, XML and PDF Integration

**Files:**
- Modify: `src/components/atomic-crm/invoicing/invoiceDraftTypes.ts`
- Modify: `src/components/atomic-crm/invoicing/InvoiceDraftDialog.tsx`
- Modify: `src/components/atomic-crm/invoicing/useEmitInvoice.ts`
- Modify: `src/components/atomic-crm/invoicing/invoiceDraftXml.ts`
- Modify: `src/components/atomic-crm/invoicing/invoiceDraftPdf.tsx`
- Modify: `src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.ts`
- Modify: `supabase/functions/_shared/invoiceEmit.ts`
- Modify: `supabase/functions/invoice_emit/index.ts`
- Add/update focused tests for each changed helper.

**Interfaces:**
- Consumes selected `ClientBillingProfile`.
- Produces emitted documents with `billing_profile_id`.
- Produces XML/PDF recipient data from selected billing profile.

- [ ] **Step 1: Extend draft model**

Invoice drafts carry optional selected billing profile and available profile
choices.

- [ ] **Step 2: Add selection UX**

If a client has one profile, select it by default. If multiple profiles exist,
show a clear selector in the draft dialog.

- [ ] **Step 3: Update emit request**

Pass optional `billingProfileId` to provider and Edge Function.

- [ ] **Step 4: Update Edge Function insert**

Persist `billing_profile_id` on `financial_documents`.

- [ ] **Step 5: Update XML and PDF**

Recipient name, fiscal code, VAT, address, SDI and PEC come from selected
billing profile when present, otherwise from `client`.

- [ ] **Step 6: Tests and review**

Run focused tests for billing validation, XML, PDF, provider, hook and Edge
Function helper.

## Task 7: Invoice List/Show, Import and AI Boundaries

**Files:**
- Modify: `src/components/atomic-crm/invoices/FinancialDocumentListContent.tsx`
- Modify: `src/components/atomic-crm/invoices/FinancialDocumentShow.tsx`
- Modify: `src/lib/ai/invoiceImport.ts` if profile matching is exposed in AI
  import.
- Modify: `src/lib/ai/invoiceImportProvider.ts` if profile matching is exposed
  in AI import.
- Modify: `supabase/functions/_shared/invoiceImportConfirm.ts` if confirmed
  imports write `billing_profile_id`.
- Modify: semantic/capability registry only if product AI exposes billing
  profiles.

**Interfaces:**
- Produces clear distinction between operational client and fiscal recipient on
  invoice surfaces.
- Produces profile-aware import only where real XML recipient data is available.

- [ ] **Step 1: Update invoice read surfaces**

Show billing profile fields where they clarify the document without changing KPI
math.

- [ ] **Step 2: Update import matching if needed**

Match XML recipient to client billing profiles before creating new clients.

- [ ] **Step 3: Update AI/semantic registry only if exposed**

Do not expose billing profiles to product AI unless UI/import needs it.

- [ ] **Step 4: Tests and review**

Run focused tests for list/show and import decision helpers.

## Task 8: Browser Verification and Final Gates

**Files:**
- Modify: `docs/CANTIERE.md`
- Modify: continuity docs required by pre-commit.

**Interfaces:**
- Produces desktop and mobile browser evidence.
- Produces final green gate set.

- [ ] **Step 1: Start local stack**

Run:

```bash
make start
```

Expected: local Supabase and Vite are reachable.

- [ ] **Step 2: Browser desktop verification**

Use real browser at desktop viewport. Verify client billing profile UI, invoice
draft selection, XML/PDF trigger path, and invoice list/show display.

- [ ] **Step 3: Browser mobile verification**

Use real browser at mobile viewport. Verify parity for the same essential
actions and fields.

- [ ] **Step 4: Final deterministic gates**

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run health:financial
npm run smoke:ef-reminder-parity
npm run continuity:check
npm run governance:precommit
git diff --check
```

Expected: PASS.

- [ ] **Step 5: Final review and commit**

Review all dimensions, then commit any remaining coherent unit with an English
message.

- [ ] **Step 6: Push/deploy**

Push frontend changes to `main` only after local gates and reviews are green.
Deploy Supabase Edge Functions separately if `supabase/functions/**` changed.
