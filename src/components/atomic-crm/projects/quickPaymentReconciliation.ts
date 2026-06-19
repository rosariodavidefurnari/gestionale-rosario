import type { Identifier } from "ra-core";

export type ExpectedPaymentCandidate = {
  id: Identifier;
  amount: number;
  status: string;
  financial_document_id: Identifier | null;
};

export type QuickPaymentDecision =
  | { action: "settle"; paymentId: Identifier }
  | { action: "create" }
  | { action: "ambiguous"; candidates: ExpectedPaymentCandidate[] };

/**
 * Absorbable payment types for reconciliation. MUST stay symmetric with FIX-4's
 * `ABSORBABLE_TYPES` in `supabase/functions/_shared/invoiceEmit.ts` (different
 * runtime, no shared import → kept in sync by convention, see B1). A `rimborso*`
 * must NEVER settle an emit-linked `saldo` expected payment: it would corrupt
 * both the invoice amount and the cash basis.
 */
const ABSORBABLE_PAYMENT_TYPES = new Set(["saldo", "acconto", "parziale"]);

/**
 * Decide whether a quick payment should SETTLE the emit-linked expected payment
 * (in_attesa + financial_document_id) instead of creating a duplicate.
 *
 * - settle only when recording a real collection (`ricevuto`) with an absorbable
 *   `payment_type` and exactly ONE linked expected payment;
 * - ambiguous (>1 linked) → the UI asks which invoice (no guessing);
 * - create in every other case (no linked candidate, non-collection, or a
 *   non-absorbable type such as `rimborso_spese`).
 */
export const decideQuickPaymentTarget = (
  candidates: ExpectedPaymentCandidate[],
  draft: { status: string; payment_type: string },
): QuickPaymentDecision => {
  if (draft.status !== "ricevuto") return { action: "create" };
  if (!ABSORBABLE_PAYMENT_TYPES.has(draft.payment_type)) {
    return { action: "create" };
  }
  const linked = candidates.filter(
    (c) => c.status === "in_attesa" && c.financial_document_id != null,
  );
  if (linked.length === 0) return { action: "create" };
  if (linked.length === 1) return { action: "settle", paymentId: linked[0].id };
  return { action: "ambiguous", candidates: linked };
};

/**
 * True when recording a collection here would ORPHAN an emit-linked expected
 * payment — i.e. the decider would `settle` or `ambiguous` rather than `create`.
 * Used by surfaces OTHER than QuickPaymentDialog (e.g. /payments/create) to WARN
 * the user instead of silently creating a duplicate. Delegates entirely to
 * `decideQuickPaymentTarget` (no second source of truth for the gates).
 */
export const wouldOrphanExpectedPayment = (
  candidates: ExpectedPaymentCandidate[],
  draft: { status: string; payment_type: string },
): boolean => decideQuickPaymentTarget(candidates, draft).action !== "create";
