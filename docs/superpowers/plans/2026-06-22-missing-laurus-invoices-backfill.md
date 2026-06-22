# Missing LAURUS Invoices Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backfill the three historical LAURUS invoices that have real XML in the repo, then link the existing received payments to those new documents without changing cash.

**Architecture:** Keep the mutation as one fail-closed SQL script with a read-only RED gate, an explicit dry-run rollback gate, an atomic apply block, and a GREEN verification query. Mirror SQL branch logic in a pure TypeScript decider so ambiguous/no-source/idempotency paths are testable without relying on prod rows.

**Tech Stack:** PostgreSQL/Supabase SQL, Vitest, Node/tsx, Supabase CLI for read-only/apply execution, existing `npm run health:financial` and `npm run smoke:ef-reminder-parity`.

**Execution Status:** Applied on prod on 2026-06-22 for the three historical
LAURUS targets only. The 2026 targets remain blocked until real XML files are
available.

## Global Constraints

- Source of truth for the three document rows is the real XML under `Fatture/2023/` and `Fatture/2024/`.
- Do not create any 2026 document until the real XML files are present in `Fatture/2026/`.
- Do not change `payments.amount`, `payments.status`, `payments.payment_date`, or `payments.payment_type`.
- Insert only outbound `customer_invoice` rows for LAURUS and link only exact 1:1 `ricevuto` payments by `(client_id, trim(invoice_ref) = trim(document_number))`.
- Use `<DataScadenzaPagamento>` as `due_date` when present, otherwise `issue_date`.
- No production write may run before the RED and dry-run gates match the expected counts.

---

## Files

- Modify: `docs/superpowers/specs/2026-06-20-missing-invoices-backfill-design.md`
- Create: `docs/superpowers/plans/2026-06-22-missing-laurus-invoices-backfill.md`
- Create: `scripts/backfillMissingInvoicesDecider.ts`
- Create: `scripts/backfillMissingInvoicesDecider.test.ts`
- Create: `scripts/backfill-missing-laurus-invoices.sql`
- Modify: `scripts/check-prod-financial-health.mjs`
- Modify: `docs/CANTIERE.md`
- Modify as required by governance registries if checks report drift: `docs/cli/COMMAND_MAP.md`, `docs/cli/COMMAND_REGISTRY.json`, `docs/workflows/WORKFLOW_MAP.md`, `docs/workflows/WORKFLOW_REGISTRY.json`, `docs/artifacts/ARTIFACT_MAP.md`, `docs/artifacts/ARTIFACT_REGISTRY.json`

## Task 1: Pure Fail-Closed Decider

**Files:**
- Create: `scripts/backfillMissingInvoicesDecider.ts`
- Test: `scripts/backfillMissingInvoicesDecider.test.ts`

**Interfaces:**
- Produces: `decideMissingInvoiceBackfill(payment, docs): MissingInvoiceBackfillDecision`
- Consumes: nothing from later tasks.

- [x] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";

import {
  decideMissingInvoiceBackfill,
  type BackfillDocumentCandidate,
  type BackfillPaymentCandidate,
} from "./backfillMissingInvoicesDecider";

const pay = (
  over: Partial<BackfillPaymentCandidate> = {},
): BackfillPaymentCandidate => ({
  id: "p1",
  client_id: "laurus",
  invoice_ref: "FPR 1/23",
  status: "ricevuto",
  financial_document_id: null,
  ...over,
});

const doc = (
  over: Partial<BackfillDocumentCandidate> = {},
): BackfillDocumentCandidate => ({
  client_id: "laurus",
  document_number: "FPR 1/23",
  direction: "outbound",
  document_type: "customer_invoice",
  source_path: "Fatture/2023/IT01879020517A2023_bhiYr.xml",
  ...over,
});

describe("decideMissingInvoiceBackfill", () => {
  it("creates and links when a received unlinked payment has exactly one XML-derived document candidate", () => {
    expect(decideMissingInvoiceBackfill(pay(), [doc()])).toEqual({
      action: "create_and_link",
      sourcePath: "Fatture/2023/IT01879020517A2023_bhiYr.xml",
    });
  });

  it("trims invoice_ref and document_number before matching", () => {
    expect(
      decideMissingInvoiceBackfill(
        pay({ invoice_ref: " FPR 1/23 " }),
        [doc({ document_number: "FPR 1/23  " })],
      ),
    ).toEqual({
      action: "create_and_link",
      sourcePath: "Fatture/2023/IT01879020517A2023_bhiYr.xml",
    });
  });

  it("skips non-ricevuto payments", () => {
    expect(
      decideMissingInvoiceBackfill(pay({ status: "scaduto" }), [doc()]),
    ).toEqual({ action: "skip", reason: "not_ricevuto:scaduto" });
  });

  it("skips payments already linked to a financial document", () => {
    expect(
      decideMissingInvoiceBackfill(
        pay({ financial_document_id: "existing-doc" }),
        [doc()],
      ),
    ).toEqual({ action: "skip", reason: "already_linked" });
  });

  it("skips empty invoice_ref", () => {
    expect(decideMissingInvoiceBackfill(pay({ invoice_ref: null }), [doc()]))
      .toEqual({ action: "skip", reason: "empty_invoice_ref" });
    expect(decideMissingInvoiceBackfill(pay({ invoice_ref: "" }), [doc()]))
      .toEqual({ action: "skip", reason: "empty_invoice_ref" });
  });

  it("skips when the XML-derived candidate is missing", () => {
    expect(decideMissingInvoiceBackfill(pay(), [])).toEqual({
      action: "skip",
      reason: "no_xml_candidate",
    });
  });

  it("skips when more than one XML-derived candidate matches", () => {
    expect(
      decideMissingInvoiceBackfill(pay(), [
        doc({ source_path: "a.xml" }),
        doc({ source_path: "b.xml" }),
      ]),
    ).toEqual({ action: "skip", reason: "ambiguous_xml_candidate" });
  });

  it("skips inbound or non-customer candidate documents", () => {
    expect(
      decideMissingInvoiceBackfill(pay(), [
        doc({ direction: "inbound", document_type: "supplier_invoice" }),
      ]),
    ).toEqual({ action: "skip", reason: "no_xml_candidate" });
    expect(
      decideMissingInvoiceBackfill(pay(), [
        doc({ document_type: "customer_credit_note" }),
      ]),
    ).toEqual({ action: "skip", reason: "no_xml_candidate" });
  });
});
```

- [x] **Step 2: Run RED**

Run: `npx vitest run scripts/backfillMissingInvoicesDecider.test.ts`

Expected: FAIL because `scripts/backfillMissingInvoicesDecider.ts` does not exist.

- [x] **Step 3: Implement minimal decider**

Create `scripts/backfillMissingInvoicesDecider.ts`:

```ts
export type BackfillPaymentCandidate = {
  id: string;
  client_id: string;
  invoice_ref: string | null;
  status: string;
  financial_document_id: string | null;
};

export type BackfillDocumentCandidate = {
  client_id: string;
  document_number: string | null;
  direction: string;
  document_type: string;
  source_path: string;
};

export type MissingInvoiceBackfillDecision =
  | { action: "create_and_link"; sourcePath: string }
  | { action: "skip"; reason: string };

const norm = (value: string | null): string => (value ?? "").trim();

export function decideMissingInvoiceBackfill(
  payment: BackfillPaymentCandidate,
  candidates: BackfillDocumentCandidate[],
): MissingInvoiceBackfillDecision {
  if (payment.financial_document_id != null) {
    return { action: "skip", reason: "already_linked" };
  }
  if (payment.status !== "ricevuto") {
    return { action: "skip", reason: `not_ricevuto:${payment.status}` };
  }
  if (norm(payment.invoice_ref) === "") {
    return { action: "skip", reason: "empty_invoice_ref" };
  }

  const matches = candidates.filter(
    (candidate) =>
      candidate.client_id === payment.client_id &&
      candidate.direction === "outbound" &&
      candidate.document_type === "customer_invoice" &&
      norm(candidate.document_number) === norm(payment.invoice_ref),
  );

  if (matches.length === 0) {
    return { action: "skip", reason: "no_xml_candidate" };
  }
  if (matches.length > 1) {
    return { action: "skip", reason: "ambiguous_xml_candidate" };
  }
  return { action: "create_and_link", sourcePath: matches[0].source_path };
}
```

- [x] **Step 4: Run GREEN**

Run: `npx vitest run scripts/backfillMissingInvoicesDecider.test.ts`

Expected: PASS.

## Task 2: SQL Backfill Script

**Files:**
- Create: `scripts/backfill-missing-laurus-invoices.sql`

**Interfaces:**
- Consumes: exact LAURUS XML-derived constants from the spec.
- Produces: separate SQL sections `[C1]`, `[DRY-RUN]`, `[APPLY]`, `[C3]` for Supabase SQL execution.

- [x] **Step 1: Add SQL script with read-only gates and atomic apply**

Create `scripts/backfill-missing-laurus-invoices.sql` with:

The full SQL lives in `scripts/backfill-missing-laurus-invoices.sql` and contains
three concrete sections:

- `[C1]` read-only RED gate
- `[APPLY]` atomic insert + FK link with checksum guard
- `[C3]` read-only GREEN gate

Executed commands:

```bash
SQL=$(sed -n '20,123p' scripts/backfill-missing-laurus-invoices.sql)
npx supabase db query --linked -o json -- "$SQL"

SQL=$(printf 'begin;\n'; sed -n '128,357p' scripts/backfill-missing-laurus-invoices.sql; printf '\nrollback;')
npx supabase db query --linked -o json -- "$SQL"

SQL=$(sed -n '128,357p' scripts/backfill-missing-laurus-invoices.sql)
npx supabase db query --linked -o json -- "$SQL"

SQL=$(sed -n '362,432p' scripts/backfill-missing-laurus-invoices.sql)
npx supabase db query --linked -o json -- "$SQL"
```

Observed prod results:

- C1: `missing_docs=3`, `existing_docs=0`, `unlinked_payments=3`, `target_cash_sum=6120.08`, `verdict=OK_TO_APPLY`
- dry-run: apply block executed inside transaction and rolled back; C1 stayed unchanged
- C3 after apply: `docs_present=3`, `linked_payments=3`, `remaining_targets=0`, `docs_multi_payment=0`, `verdict=OK`

## Task 3: Recurring Health Guard

**Files:**
- Modify: `scripts/check-prod-financial-health.mjs`

**Interfaces:**
- Consumes: current remote `payments` and `financial_documents`.
- Produces: health output that fails if the three LAURUS targets are missing after apply.

- [x] **Step 1: Add a post-apply guard**

After the BR2 checks, `scripts/check-prod-financial-health.mjs` counts the
three LAURUS XML-backed targets and verifies both document shape and payment FK.
Current verified output: `LAURUS no-doc backfill missing/link gaps: 0`.

## Task 4: Verification And Documentation

**Files:**
- Modify: `docs/CANTIERE.md`
- Regenerate governance maps only if checks require it.

**Checks:**
- `npx vitest run scripts/backfillMissingInvoicesDecider.test.ts`
- `npm run typecheck`
- `npm run health:financial`
- `npm run smoke:ef-reminder-parity`
- `npm run continuity:check`
- `npm run governance:precommit`

**Stop Conditions:**
- Stop if remote C1 does not report exactly 3 missing LAURUS docs and 3 unlinked payments.
- Stop if XML-derived totals differ from payment amounts for these three saldo rows.
- Stop if dry-run does not abort before writes.
- Stop if apply count is not exactly 3 document inserts and 3 payment links.
- Stop if any cash checksum changes.
