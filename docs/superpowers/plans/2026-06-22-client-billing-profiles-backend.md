# Client Billing Profiles Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backend-only billing profile model so Gustare can have LIVE as an invoice recipient without duplicating clients, projects, contacts or dashboard logic.

**Architecture:** Create `client_billing_profiles`, link `financial_documents` to it with nullable `billing_profile_id`, expose read fields through `financial_documents_summary`, and update backend health/backfill scripts. UI, invoice emit, PDF/XML generation, dashboard, AI and fiscal model are out of scope only for this backend tranche; the complete product work will need a later integration phase that touches the required surfaces deliberately.

**Tech Stack:** Supabase/PostgreSQL migrations and views, Node health scripts, TypeScript type definitions, existing financial/fiscal smoke gates.

## Global Constraints

- Backend-only v1 stabilizes the data contract first.
- Do not touch UI, `invoice_emit`, `invoice_void`, `InvoiceDraftDialog`, `invoiceDraftXml.ts`, `invoiceDraftPdf.tsx`, dashboard, AI, fiscal model, projects, services or contacts in this backend tranche.
- A later UI/emission integration tranche must touch the needed surfaces with a dedicated spec, plan, review and browser verification.
- `clients` remains the operational account.
- `client_billing_profiles` is the invoice-recipient catalog under one client.
- `financial_documents.billing_profile_id` is nullable and additive.
- No payment amount, payment status, payment date or payment type may change.
- No remote apply without C1, dry-run and explicit user confirmation.
- Every spec, plan and implementation step requires multidimensional review
  before the next gate.
- Use code-RAG for cross-file/fiscal impact checks and verify every RAG claim on
  the real source before implementation or review closure.
- Use governance maps before commands, variables, workflows and artifacts.
- Progress by sensible commits: one reviewed task per commit, with related docs
  and code together, and no unrelated files.
- The future UI/UX phase is separate from this backend v1 and must use
  `impeccable`, real browser desktop verification, real browser mobile
  verification and console checks.

---

## Files

- Create: `supabase/migrations/20260622200209_client_billing_profiles.sql`
- Modify: `src/components/atomic-crm/types.ts`
- Modify: `scripts/check-prod-financial-health.mjs`
- Create: `scripts/backfill-2026-invoices-with-billing-profiles.sql`
- Modify: `docs/architecture.md`
- Modify: `docs/development-continuity-map.md`
- Modify: `docs/CANTIERE.md`

Deferred from backend v1, but expected in a later integration phase where needed:

- `supabase/functions/_shared/invoiceEmit.ts`
- `supabase/functions/invoice_emit/index.ts`
- `src/components/atomic-crm/invoicing/**`
- `src/components/atomic-crm/dashboard/**`
- `src/lib/ai/**`
- `src/lib/semantics/**`

## Required Reviews and Commit Strategy

Reviews are gates, not summaries. Each gate must record PASS, FLAG or BLOCK in
the task notes or `docs/CANTIERE.md`.

- Spec review dimensions: domain, DB/RLS, money/fiscal, propagation, tests,
  governance/RAG, operations and rollback.
- Plan review dimensions: file scope, task ordering, RED/GREEN coverage,
  forbidden surfaces, dry-run/apply safety, governance commands and commit
  boundaries.
- Implementation review dimensions: diff scope, schema compatibility, runtime
  consumers, health guards, test quality, forbidden surfaces and docs.
- UI/UX review dimensions, only in a later phase: `impeccable` preflight,
  responsive behavior, desktop browser, mobile browser, accessibility, console
  errors and visual regressions.

Commit boundaries:

- Commit 1: migration, type definitions and matching docs.
- Commit 2: financial health guard and tests/checks.
- Commit 3: 2026 backfill script with C1/dry-run/C3 gates.
- Commit 4: final continuity/governance documentation updates if not already
  included with the task that required them.

Do not commit any task until its local gates and review gate are green. Do not
commit UI/UX work in backend v1.

## Later Integration Tranche

This backend plan is not the full product finish. After the backend contract is
reviewed and green, create a separate UI/emission integration spec and plan.

Expected surfaces for that later tranche:

- Client UI for billing profile management.
- Invoice draft UI for selecting a billing profile.
- `invoice_emit` payload selection and validation.
- XML and PDF generation from the selected billing profile.
- Import/backfill profile matching for XML recipients.
- Invoice list/show display where operational client and fiscal recipient need
  to be distinguishable.
- Mobile parity for the same essential actions and fields.
- Dashboard only if recipient display is required; KPI math remains payment-led.
- AI/semantic registry only if billing profiles are exposed to product AI.

That tranche must use `impeccable`, declare `IMPECCABLE_PREFLIGHT`, and pass real
browser desktop plus real browser mobile verification before closure.

## Task 1: Migration and Types

**Files:**
- Create: `supabase/migrations/20260622200209_client_billing_profiles.sql`
- Modify: `src/components/atomic-crm/types.ts`

**Interfaces:**
- Produces table `client_billing_profiles`.
- Produces nullable `financial_documents.billing_profile_id`.
- Produces view fields on `financial_documents_summary`.
- Produces TS type `ClientBillingProfile` and optional fields on `FinancialDocumentSummary`.

- [ ] **Step 1: Create migration**

Migration content:

```sql
create table if not exists public.client_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  label text not null,
  billing_name text not null,
  vat_number text,
  fiscal_code text,
  billing_address_street text,
  billing_address_number text,
  billing_postal_code text,
  billing_city text,
  billing_province text,
  billing_country text default 'IT',
  billing_sdi_code text,
  billing_pec text,
  is_default boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add indexes and RLS:

```sql
create index if not exists client_billing_profiles_client_id_idx
  on public.client_billing_profiles(client_id);
create index if not exists client_billing_profiles_vat_number_idx
  on public.client_billing_profiles(vat_number)
  where vat_number is not null and vat_number <> '';
create index if not exists client_billing_profiles_fiscal_code_idx
  on public.client_billing_profiles(fiscal_code)
  where fiscal_code is not null and fiscal_code <> '';
create unique index if not exists client_billing_profiles_one_default_per_client_idx
  on public.client_billing_profiles(client_id)
  where is_default;

alter table public.client_billing_profiles enable row level security;
drop policy if exists "Authenticated full access" on public.client_billing_profiles;
create policy "Authenticated full access" on public.client_billing_profiles
  for all using ((select auth.uid()) is not null);

drop trigger if exists trg_client_billing_profiles_updated_at
  on public.client_billing_profiles;
create trigger trg_client_billing_profiles_updated_at
  before update on public.client_billing_profiles
  for each row execute function public.set_updated_at();
```

Add document FK:

```sql
alter table public.financial_documents
  add column if not exists billing_profile_id uuid
  references public.client_billing_profiles(id);

create index if not exists financial_documents_billing_profile_id_idx
  on public.financial_documents(billing_profile_id)
  where billing_profile_id is not null;
```

Recreate `financial_documents_summary` with left join to
`client_billing_profiles` and selected profile fields.

- [ ] **Step 2: Update TS types**

Add:

```ts
export type ClientBillingProfile = {
  client_id: Identifier;
  label: string;
  billing_name: string;
  vat_number?: string | null;
  fiscal_code?: string | null;
  billing_address_street?: string | null;
  billing_address_number?: string | null;
  billing_postal_code?: string | null;
  billing_city?: string | null;
  billing_province?: string | null;
  billing_country?: string | null;
  billing_sdi_code?: string | null;
  billing_pec?: string | null;
  is_default: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;
```

Add optional fields to `FinancialDocument` and `FinancialDocumentSummary`:

```ts
billing_profile_id?: Identifier | null;
billing_profile_label?: string | null;
billing_profile_name?: string | null;
billing_profile_vat_number?: string | null;
billing_profile_fiscal_code?: string | null;
billing_profile_sdi_code?: string | null;
```

- [ ] **Step 3: Deferred-surface guard**

Run:

```bash
git diff --name-only | rg 'invoice_emit|invoiceEmit|src/components/atomic-crm/invoicing|src/components/atomic-crm/dashboard|src/lib/ai|src/lib/semantics' && exit 1 || true
```

Expected: no backend-v1 deferred files listed.

## Task 2: Backend Health Guard

**Files:**
- Modify: `scripts/check-prod-financial-health.mjs`

**Interfaces:**
- Produces a check that LIVE is represented as billing profile of Gustare, not as required client.

- [ ] **Step 1: Add pending-aware health check**

Before 2026 backfill, the health check must allow the profile to be absent.
After profile/backfill, it must fail if `FPR 1/26` or `FPR 2/26` is linked to a
document under Gustare without a LIVE billing profile.

Expected profile identity:

```text
billing_name = LIVE - SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA
vat_number = 06256710879
fiscal_code = 06256710879
billing_sdi_code = KRRH6B9
```

- [ ] **Step 2: Run health**

Run:

```bash
npm run health:financial
```

Expected: PASS before apply, with any 2026 state reported as pending.

## Task 3: 2026 Backfill Script

**Files:**
- Create: `scripts/backfill-2026-invoices-with-billing-profiles.sql`
- Modify: `docs/CANTIERE.md`

**Interfaces:**
- Consumes `client_billing_profiles`.
- Creates/reuses LIVE profile under Gustare.
- Inserts/links 2026 documents without changing cash.

- [ ] **Step 1: Create C1 gate**

C1 read-only verifies:

- exactly one Gustare client;
- zero LIVE client required;
- zero or one LIVE billing profile under Gustare;
- target docs do not already exist ambiguously;
- target payments match 1:1 where linking is expected.

- [ ] **Step 2: Create APPLY block**

APPLY:

- inserts LIVE billing profile under Gustare if missing;
- inserts documents from XML constants;
- sets `billing_profile_id` for LIVE-targeted documents;
- updates only `payments.financial_document_id` for exact matches;
- checks cash checksum before/after.

- [ ] **Step 3: Create C3 gate**

C3 verifies:

- profile LIVE exists under Gustare;
- `FPR 1/26` and `FPR 2/26` documents point to that profile;
- linked payments point to correct docs;
- payment cash columns unchanged.

- [ ] **Step 4: Dry-run only**

Run APPLY in transaction with rollback. Do not remote-apply without explicit
confirmation after reporting C1/dry-run.

## Task 4: Verification and Docs

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/development-continuity-map.md`
- Modify: `docs/CANTIERE.md`

**Interfaces:**
- Documents backend-only billing profiles and UI stop point.

- [ ] **Step 1: Run broad gates**

Run:

```bash
npm run typecheck
npm run lint
npm run health:financial
npm run smoke:ef-reminder-parity
npm run continuity:check
npm run governance:precommit
git diff --check
```

Expected: PASS.

- [ ] **Step 2: Verify deferred surfaces**

Run:

```bash
git diff --name-only | rg 'invoice_emit|invoiceEmit|src/components/atomic-crm/invoicing|src/components/atomic-crm/dashboard|src/lib/ai|src/lib/semantics' && exit 1 || true
```

Expected: no backend-v1 deferred files listed.

- [ ] **Step 3: Update docs**

Document:

- `clients` = operational account;
- `client_billing_profiles` = invoice recipient profiles;
- `financial_documents.billing_profile_id` = document profile link;
- UI/emission are a separate later phase.

## Self-Review

- Spec coverage: backend model, health guard, backfill and docs are covered.
- Propagation control: explicit deferred-surface checks block accidental
  UI/emission drift inside backend v1.
- Type consistency: `client_billing_profiles`, `billing_profile_id` and
  `billing_profile_*` names are consistent.
- Retroactive implementation review 2026-06-22: PASS with one corrected BLOCK.
  The real BLOCK was stale local replay data after the remote migration/backfill;
  `supabase/seed_domain_data.sql` must include the remote
  `client_billing_profiles` row and the 2026 documents before any backend commit.
- Process review 2026-06-22: FLAG. Implementation ran ahead of documented review
  and commit gates. The correction is to stop UI work, run gates, and split the
  already-reviewed backend/backfill into coherent commits before continuing.
