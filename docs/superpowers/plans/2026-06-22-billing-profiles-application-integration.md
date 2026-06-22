# Billing Profiles Application Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the CRM select, emit, render, show and import invoices with a
client billing profile while keeping the operational client unchanged.

**Architecture:** Add a pure `InvoiceBillingRecipient` adapter that converts
either a `Client` or a `ClientBillingProfile` into the fiscal recipient used by
validation, XML, PDF and UI. Thread only `billingProfileId` through the emit
payload and Edge Function, while the operational `clientId` remains the owner of
projects, services, payments and documents.

**Tech Stack:** React 19, ra-core dataProvider, shadcn/ui, Vitest, Supabase Edge
Functions, Kysely, existing browser verification workflow.

## Global Constraints

- `clients` remains the operational account.
- `client_billing_profiles` is only the invoice-recipient catalog.
- Do not change `payments.amount`, `payments.status`, `payment_date` or
  `payment_type`.
- Default selection is the main client unless a profile has `is_default=true`.
- LIVE must never be auto-created as a client.
- UI work must satisfy `PRODUCT.md` and Impeccable product-register rules.
- Desktop and mobile browser verification are mandatory before final commit.
- `supabase/functions/invoice_emit/**` changes require manual Supabase deploy
  after commit/push.

---

## File Structure

- Create `src/components/atomic-crm/invoicing/invoiceBillingRecipient.ts`
  - Single responsibility: convert client/profile into display, validation and
    XML/PDF recipient fields.
- Create `src/components/atomic-crm/invoicing/invoiceBillingRecipient.test.ts`
  - Covers main-client and LIVE-profile recipient.
- Modify `src/components/atomic-crm/invoicing/invoiceDraftTypes.ts`
  - Add optional `billingProfile?: ClientBillingProfile | null`.
- Modify `src/components/atomic-crm/invoicing/invoiceBillingValidation.ts`
  - Validate `InvoiceBillingRecipient`, not raw `Client`.
- Modify `src/components/atomic-crm/invoicing/invoiceDraftXml.ts`
  - Build `CessionarioCommittente` from recipient.
- Modify `src/components/atomic-crm/invoicing/invoiceDraftPdf.tsx`
  - Display the same recipient used by XML.
- Modify `src/components/atomic-crm/invoicing/useEmitInvoice.ts`
  - Pass `billingProfileId` to provider when draft has a profile.
- Modify `src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.ts`
  - Add optional `billingProfileId`.
- Modify `supabase/functions/_shared/db.ts`
  - Add `billing_profile_id` to `FinancialDocumentsTable`.
- Modify `supabase/functions/_shared/invoiceEmit.ts`
  - Validate optional `billingProfileId` and write `billing_profile_id`.
- Modify `supabase/functions/_shared/invoiceEmit.test.ts`
  - Assert profile id is written and absent remains null/undefined.
- Modify `src/components/atomic-crm/invoicing/InvoiceDraftDialog.tsx`
  - Fetch profiles for the draft client, render the recipient selector and pass
    selected profile into emit/XML/PDF.
- Create `src/components/atomic-crm/clients/ClientBillingProfileInputs.tsx`
  - Form fields for profile create/edit.
- Create `src/components/atomic-crm/clients/ClientBillingProfilesSection.tsx`
  - Show profiles and provide create/edit sheets.
- Modify `src/components/atomic-crm/clients/ClientShow.tsx`
  - Mount the profiles section under current Fatturazione details.
- Modify `src/components/atomic-crm/invoices/FinancialDocumentListContent.tsx`
  - Show billing profile label/name when present.
- Modify `src/components/atomic-crm/invoices/FinancialDocumentShow.tsx`
  - Show operational client and fiscal recipient when profile exists.
- Modify `src/lib/ai/invoiceImport.ts`
  - Add workspace profiles and matching logic for LIVE-like fiscal recipients.
- Modify `src/components/atomic-crm/ai/InvoiceImportDraftBillingSection.tsx`
  - Display the matched billing profile in the existing fiscal-anagraphic
    section without turning it into a new client.
- Modify `src/components/atomic-crm/providers/supabase/dataProviderInvoiceImport.ts`
  - Include `client_billing_profiles` in import workspace.
- Modify `supabase/functions/_shared/invoiceImportConfirm.ts`
  - Normalize and validate optional `billingProfileId`.
- Modify `supabase/functions/_shared/invoiceImportConfirm.test.ts`
  - Prove profile/client mismatch is rejected.
- Modify `supabase/functions/invoice_import_confirm/index.ts`
  - Load profile ids in the confirm workspace.
- Modify continuity docs and `docs/CANTIERE.md`.

## Task 1: Recipient Adapter

**Files:**
- Create: `src/components/atomic-crm/invoicing/invoiceBillingRecipient.ts`
- Create: `src/components/atomic-crm/invoicing/invoiceBillingRecipient.test.ts`
- Modify: `src/components/atomic-crm/invoicing/invoiceDraftTypes.ts`

**Interfaces:**
- Consumes: `Client`, `ClientBillingProfile`.
- Produces:
  - `InvoiceBillingRecipient`
  - `getInvoiceBillingRecipient(draft: Pick<InvoiceDraftInput, "client" | "billingProfile">): InvoiceBillingRecipient`
  - `formatInvoiceBillingRecipientAddress(recipient)`
  - `getInvoiceBillingRecipientIdentityLines(recipient)`

- [x] **Step 1: Write RED tests**

Test main client fallback and LIVE profile override:

```bash
npm run test -- src/components/atomic-crm/invoicing/invoiceBillingRecipient.test.ts
```

Expected: FAIL because the file does not exist.

- [x] **Step 2: Implement adapter**

Use the existing `clientBilling.ts` normalization style. A profile recipient must
return:

- display name: `billing_profile.billing_name`;
- vat/fiscal fields from profile;
- address fields from profile;
- `profileId` set to profile id;
- `operationalClientId` set to draft client id.

- [x] **Step 3: GREEN**

Run:

```bash
npm run test -- src/components/atomic-crm/invoicing/invoiceBillingRecipient.test.ts
npm run typecheck
```

Expected: PASS.

- [x] **Step 4: Review**

Review dimensions: domain, XML/PDF consistency, TypeScript shape, no UI yet.

- [x] **Step 5: Commit**

```bash
git add src/components/atomic-crm/invoicing/invoiceBillingRecipient.ts \
  src/components/atomic-crm/invoicing/invoiceBillingRecipient.test.ts \
  src/components/atomic-crm/invoicing/invoiceDraftTypes.ts
git commit -m "feat: add invoice billing recipient adapter"
```

## Task 2: XML, PDF and Billing Validation

**Files:**
- Modify: `src/components/atomic-crm/invoicing/invoiceBillingValidation.ts`
- Modify: `src/components/atomic-crm/invoicing/invoiceBillingValidation.test.ts`
- Modify: `src/components/atomic-crm/invoicing/invoiceDraftXml.ts`
- Modify: `src/components/atomic-crm/invoicing/invoiceDraftXml.test.ts`
- Modify: `src/components/atomic-crm/invoicing/invoiceDraftPdf.tsx`

**Interfaces:**
- Consumes: `getInvoiceBillingRecipient`.
- Produces: XML/PDF/validation based on the same recipient.

- [x] **Step 1: RED XML test**

Add a LIVE profile fixture to `invoiceDraftXml.test.ts` and assert:

- `<Denominazione>` under `CessionarioCommittente` is LIVE;
- `<IdCodice>` is `06256710879`;
- `<CodiceFiscale>` is `06256710879`;
- `<Indirizzo>` is `VIA 4 NOVEMBRE`;
- `<CodiceDestinatario>` is `KRRH6B9`.

Run:

```bash
npm run test -- src/components/atomic-crm/invoicing/invoiceDraftXml.test.ts
```

Expected: FAIL before implementation.

- [x] **Step 2: Update implementation**

`invoiceDraftXml.ts` must call `getInvoiceBillingRecipient({ client:
draft.client, billingProfile: draft.billingProfile ?? null })` once and use the
result for transmission code, anagrafica and sede.

- [x] **Step 3: PDF parity**

Update `invoiceDraftPdf.tsx` to display recipient name/address/identity lines
from the same helper. Keep visual structure unchanged.

- [x] **Step 4: Validation parity**

Update validation tests so a client missing fiscal fields can pass when the
selected billing profile is complete.

- [x] **Step 5: GREEN**

Run:

```bash
npm run test -- src/components/atomic-crm/invoicing/invoiceDraftXml.test.ts \
  src/components/atomic-crm/invoicing/invoiceBillingValidation.test.ts
npm run typecheck
```

Expected: PASS.

- [x] **Step 6: Review and commit**

Review dimensions: fiscal XML, PDF parity, no cash mutation, no visual redesign.

```bash
git add src/components/atomic-crm/invoicing/invoiceBillingValidation.ts \
  src/components/atomic-crm/invoicing/invoiceBillingValidation.test.ts \
  src/components/atomic-crm/invoicing/invoiceDraftXml.ts \
  src/components/atomic-crm/invoicing/invoiceDraftXml.test.ts \
  src/components/atomic-crm/invoicing/invoiceDraftPdf.tsx
git commit -m "feat: render invoice drafts with billing recipients"
```

## Task 3: Emit Payload and Edge Function Persistence

**Files:**
- Modify: `src/components/atomic-crm/invoicing/useEmitInvoice.ts`
- Modify: `src/components/atomic-crm/invoicing/useEmitInvoice.test.ts`
- Modify: `src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.ts`
- Modify: `src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.test.ts`
- Modify: `supabase/functions/_shared/db.ts`
- Modify: `supabase/functions/_shared/invoiceEmit.ts`
- Modify: `supabase/functions/_shared/invoiceEmit.test.ts`

**Interfaces:**
- Consumes: `draft.billingProfile?.id`.
- Produces: `billingProfileId?: string | null` in emit payload and
  `financial_documents.billing_profile_id` insert value.

- [x] **Step 1: RED tests**

Add tests:

- `runEmitInvoice` sends `billingProfileId` when draft has profile;
- `buildFinancialDocumentInsert` writes `billing_profile_id`;
- validation accepts absent/null profile id and rejects blank string.
- `buildInvoiceEmitProviderMethods` posts the optional `billingProfileId` to
  `invoice_emit`.

Run:

```bash
npm run test -- src/components/atomic-crm/invoicing/useEmitInvoice.test.ts \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.test.ts \
  supabase/functions/_shared/invoiceEmit.test.ts
```

Expected: FAIL before implementation.

- [x] **Step 2: Implement minimal thread**

Add `billingProfileId?: string | null` to provider and Edge types. In
`buildFinancialDocumentInsert`, include `billing_profile_id:
req.billingProfileId ?? null`.

- [x] **Step 3: GREEN**

Run:

```bash
npm run test -- src/components/atomic-crm/invoicing/useEmitInvoice.test.ts \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.test.ts \
  supabase/functions/_shared/invoiceEmit.test.ts
npm run typecheck
```

Expected: PASS.

- [x] **Step 4: Review and commit**

Review dimensions: Edge payload, DB insert, idempotency, cash invariants,
Supabase deploy requirement.

```bash
git add src/components/atomic-crm/invoicing/useEmitInvoice.ts \
  src/components/atomic-crm/invoicing/useEmitInvoice.test.ts \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.ts \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.test.ts \
  supabase/functions/_shared/db.ts \
  supabase/functions/_shared/invoiceEmit.ts \
  supabase/functions/_shared/invoiceEmit.test.ts
git commit -m "feat: persist billing profile on invoice emit"
```

## Task 4: Invoice Draft Recipient Selector

**Files:**
- Modify: `src/components/atomic-crm/invoicing/InvoiceDraftDialog.tsx`
- Test: focused component/unit test if existing harness permits; otherwise
  browser gate is mandatory evidence.

**Interfaces:**
- Consumes: `client_billing_profiles` via `useGetList<ClientBillingProfile>`.
- Produces: `draftWithBillingProfile` used by validation, emit, PDF and XML.

- [x] **Step 1: Add UI state**

Fetch profiles with filter `{ "client_id@eq": String(draft.client.id) }` and
sort by `is_default DESC, label ASC`. Compute initial selected id:

- default profile id if present;
- `"__client__"` otherwise.

- [x] **Step 2: Add selector**

Render only when profiles exist. Use existing shadcn `Select` components:

- label: `Intestatario fattura`;
- option 1: `Cliente principale`;
- profile options: `profile.label` + `profile.billing_name`.

- [x] **Step 3: Use selected draft**

All calls in the dialog must use the selected draft:

- billing validation;
- `emit`;
- `downloadInvoiceDraftXml`;
- `downloadInvoiceDraftPdf`.

- [x] **Step 4: Review and commit**

Review dimensions: Impeccable product UI, mobile layout, fiscal clarity, no
auto-select LIVE unless default.

```bash
git add src/components/atomic-crm/invoicing/InvoiceDraftDialog.tsx
git commit -m "feat: select billing recipient in invoice draft"
```

## Task 5: Client Billing Profiles Section

**Files:**
- Create: `src/components/atomic-crm/clients/ClientBillingProfileInputs.tsx`
- Create: `src/components/atomic-crm/clients/ClientBillingProfilesSection.tsx`
- Modify: `src/components/atomic-crm/clients/ClientShow.tsx`

**Interfaces:**
- Consumes: `client_billing_profiles` resource through existing dataProvider.
- Produces: list/create/edit UI scoped to current client.

- [ ] **Step 1: Inputs**

Use existing admin form inputs from their concrete paths:

- `TextInput` from `@/components/admin/text-input` for label, billing name,
  VAT, CF, address, SDI, PEC, notes;
- `BooleanInput` from `@/components/admin/boolean-input` for `is_default`;
- hidden/default `client_id` from current record.

- [ ] **Step 2: Section**

Use `useGetList<ClientBillingProfile>` filtered by current client. Display
compact rows with label, billing name, VAT/CF, address, SDI/PEC. Use
`CreateSheet` and `EditSheet` for mobile-compatible create/edit.

- [ ] **Step 3: Mount in ClientShow**

Place the section inside the Fatturazione card area, after base fiscal fields.
Keep repeated cards shallow; do not nest a card inside a card.

- [ ] **Step 4: Review and commit**

Review dimensions: mobile sheet ergonomics, fiscal clarity, RLS/provider path,
no client duplication.

```bash
git add src/components/atomic-crm/clients/ClientBillingProfileInputs.tsx \
  src/components/atomic-crm/clients/ClientBillingProfilesSection.tsx \
  src/components/atomic-crm/clients/ClientShow.tsx
git commit -m "feat: manage client billing profiles"
```

## Task 6: Fatture Surfaces

**Files:**
- Modify: `src/components/atomic-crm/invoices/FinancialDocumentListContent.tsx`
- Modify: `src/components/atomic-crm/invoices/FinancialDocumentListContent.test.tsx`
- Modify: `src/components/atomic-crm/invoices/FinancialDocumentShow.tsx`

**Interfaces:**
- Consumes: `FinancialDocumentSummary.billing_profile_*`.
- Produces: visible fiscal recipient when profile exists.

- [ ] **Step 1: RED list test**

Add a document fixture with `client_name=ASSOCIAZIONE CULTURALE GUSTARE
SICILIA` and `billing_profile_name=LIVE - SOCIETA' A RESPONSABILITA' LIMITATA
SEMPLIFICATA`. Assert the list renders both operational client and profile
recipient.

- [ ] **Step 2: Implement display**

Use concise copy:

- primary counterpart remains operational client/supplier;
- secondary line only when profile exists: `Intestatario: LIVE SRLS` or billing
  profile name.

- [ ] **Step 3: Show page**

Add the same distinction to `FinancialDocumentShow`.

- [ ] **Step 4: GREEN and commit**

Run:

```bash
npm run test -- src/components/atomic-crm/invoices/FinancialDocumentListContent.test.tsx
npm run typecheck
```

Expected: PASS.

```bash
git add src/components/atomic-crm/invoices/FinancialDocumentListContent.tsx \
  src/components/atomic-crm/invoices/FinancialDocumentListContent.test.tsx \
  src/components/atomic-crm/invoices/FinancialDocumentShow.tsx
git commit -m "feat: show fiscal recipient on invoices"
```

## Task 7: Invoice Import Profile Matching

**Files:**
- Modify: `src/lib/ai/invoiceImport.ts`
- Modify: `src/lib/ai/invoiceImport.test.ts`
- Modify: `src/components/atomic-crm/ai/InvoiceImportDraftBillingSection.tsx`
- Modify: `src/components/atomic-crm/providers/supabase/dataProviderInvoiceImport.ts`
- Create: `src/components/atomic-crm/providers/supabase/dataProviderInvoiceImport.test.ts`
- Modify: `supabase/functions/_shared/invoiceImportConfirm.ts`
- Modify: `supabase/functions/_shared/invoiceImportConfirm.test.ts`
- Modify: `supabase/functions/invoice_import_confirm/index.ts`

**Interfaces:**
- Consumes: `client_billing_profiles` in invoice import workspace.
- Produces: `billingProfileId` on import draft records when fiscal identifiers
  match a profile. The id is used for client/profile validation and audit only;
  it is not persisted on `payments`, because that table has no billing profile
  column.

- [ ] **Step 1: RED test**

Add a test where record billing name/VAT/CF match LIVE profile while
counterparty or project context points to Gustare. Expected:

- `clientId === "client-gs"`;
- `billingProfileId === "profile-live"`;
- no create-client fallback.

Add a server confirm test where `billingProfileId="profile-live"` with
`clientId="client-other"` returns validation error `profilo fatturazione
coerente`.

Add a provider test proving `getInvoiceImportWorkspace()` fetches
`client_billing_profiles` and includes them in the workspace.

- [ ] **Step 2: Implement workspace profiles**

Extend workspace with profiles:

```ts
billingProfiles: Array<Pick<ClientBillingProfile, "id" | "client_id" | "label" | "billing_name" | "vat_number" | "fiscal_code">>
```

Resolve profile before contact-name fallback creates a new client.

Extend `InvoiceImportConfirmRecord` with `billingProfileId?: string | null`.
Extend confirm workspace with `billingProfiles: Array<{ id: string;
client_id: string }>` and reject a present profile id when it does not belong
to `record.clientId`.

In `InvoiceImportDraftBillingSection`, show a compact read-only line for the
matched profile label/name when `billingProfileId` is present. Keep existing
fiscal fields editable.

- [ ] **Step 3: GREEN and commit**

Run:

```bash
npm run test -- src/lib/ai/invoiceImport.test.ts \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceImport.test.ts \
  supabase/functions/_shared/invoiceImportConfirm.test.ts
npm run typecheck
```

Expected: PASS.

```bash
git add src/lib/ai/invoiceImport.ts \
  src/lib/ai/invoiceImport.test.ts \
  src/components/atomic-crm/ai/InvoiceImportDraftBillingSection.tsx \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceImport.ts \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceImport.test.ts \
  supabase/functions/_shared/invoiceImportConfirm.ts \
  supabase/functions/_shared/invoiceImportConfirm.test.ts \
  supabase/functions/invoice_import_confirm/index.ts
git commit -m "feat: match invoice imports to billing profiles"
```

## Task 8: Docs, Browser Verification and Deploy

**Files:**
- Modify: `docs/CANTIERE.md`
- Modify: `docs/architecture.md`
- Modify: `docs/development-continuity-map.md`

**Interfaces:**
- Consumes: all previous commits.
- Produces: final recorded gate evidence and deploy note.

- [ ] **Step 1: Run full gates**

Run:

```bash
npm run typecheck
npm run lint
npm run health:financial
npm run test -- src/components/atomic-crm/invoicing/invoiceBillingRecipient.test.ts \
  src/components/atomic-crm/invoicing/invoiceDraftXml.test.ts \
  src/components/atomic-crm/invoicing/invoiceBillingValidation.test.ts \
  src/components/atomic-crm/invoicing/useEmitInvoice.test.ts \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceEmit.test.ts \
  supabase/functions/_shared/invoiceEmit.test.ts \
  src/components/atomic-crm/invoices/FinancialDocumentListContent.test.tsx \
  src/lib/ai/invoiceImport.test.ts \
  src/components/atomic-crm/providers/supabase/dataProviderInvoiceImport.test.ts \
  supabase/functions/_shared/invoiceImportConfirm.test.ts
```

Expected: PASS.

- [ ] **Step 2: Browser desktop**

Start the app with the repo workflow. Verify:

- Gustare client show displays LIVE profile;
- invoice draft shows `Intestatario fattura`;
- selecting LIVE changes recipient summary;
- Fatture list/show display LIVE recipient for FPR 1/26 and FPR 2/26;
- console has no errors.

- [ ] **Step 3: Browser mobile**

Repeat the same checks in a mobile viewport. Verify no overlapping labels,
horizontal overflow or hidden critical recipient state.

- [ ] **Step 4: Deploy Edge Function**

Because `supabase/functions/invoice_emit/**` and
`supabase/functions/invoice_import_confirm/**` changed, deploy manually after
commit/push:

```bash
npx supabase functions deploy invoice_emit
npx supabase functions deploy invoice_import_confirm
```

Expected: deploy succeeds on the linked project.

- [ ] **Step 5: Final review and commit docs**

Review dimensions: domain, DB, fiscal, desktop/mobile, AI import, security,
tests, governance, deploy. Then commit docs if they changed after evidence:

```bash
git add docs/CANTIERE.md docs/architecture.md docs/development-continuity-map.md
git commit -m "docs: record billing profile integration gates"
```

## Plan Review

- Spec coverage: PASS. Every acceptance criterion maps to a task.
- Placeholder scan: PASS. No task relies on an unspecified later decision.
- Type consistency: PASS. `billingProfile`, `billingProfileId` and
  `billing_profile_id` are intentionally distinct by layer.
- SOLID: PASS. Recipient adapter centralizes fiscal recipient logic instead of
  duplicating client/profile branches in XML, PDF and UI.
- Plan review second pass 2026-06-22: FLAG fixed. RAG found
  `dataProviderInvoiceEmit.test.ts`; Task 3 now includes it. The same pass found
  no existing provider test for invoice import, so Task 7 now creates
  `dataProviderInvoiceImport.test.ts`.
- Risk: FLAG. Client profile create/edit UI is the broadest visual surface and
  must not proceed without browser desktop/mobile evidence.
