import type {
  FiscalDeclaration,
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";

/**
 * Guardrail: tell apart a REAL fiscal obligation (one that legitimately shows the
 * "Da dichiarazione" badge) from a stale, hand-entered PROJECTION that must never
 * masquerade as certified data from the accountant.
 *
 * An obligation is CERTIFIED iff:
 *  - it has at least one F24 payment line (real money already paid against it), OR
 *  - its backing declaration is FILED, i.e. `declaration_id` is set AND that
 *    declaration has non-zero totals (`total_substitute_tax + total_inps > 0`).
 *
 * Rationale (verified on prod + source):
 *  - `source` does NOT discriminate: real obligations are `manual` too (e.g. the
 *    accountant's reconciled saldo/acconti). The discriminator is the declaration
 *    backing, not the insertion channel.
 *  - `buildObligationsFromDeclaration` only ever emits obligations when the amount
 *    is > 0 and links them to a real declaration, so any LEGITIMATELY generated
 *    obligation is certified by construction. The 2026-04-14 garbage rows bypassed
 *    that builder: they were hand-inserted with `declaration_id` NULL (acconti) or
 *    pointing to the still-unfiled 2025 declaration (totals = 0), with 0 F24 lines,
 *    and were rendered as "Da dichiarazione" — inflating the deadline card to a
 *    false 11.100,60 € instead of the cassa estimate.
 *
 * Pure and deterministic: no fetch, no clock. The data-access layer assembles the
 * three inputs; this function holds the rule so it can be unit-tested in isolation
 * (executable guardrail — remove the filter and the regression test goes red).
 */

export const buildFiledDeclarationIds = (
  declarations: FiscalDeclaration[],
): Set<string> =>
  new Set(
    declarations
      .filter((d) => d.total_substitute_tax + d.total_inps > 0)
      .map((d) => d.id),
  );

export const buildPaidObligationIds = (
  paymentLines: FiscalF24PaymentLineEnriched[],
): Set<string> => new Set(paymentLines.map((line) => line.obligation_id));

export const isCertifiedObligation = (
  obligation: FiscalObligation,
  filedDeclarationIds: Set<string>,
  paidObligationIds: Set<string>,
): boolean =>
  paidObligationIds.has(obligation.id) ||
  (obligation.declaration_id != null &&
    filedDeclarationIds.has(obligation.declaration_id));

/**
 * Keep only the certified obligations. Uncertified projections are dropped before
 * the estimate/reality merge, so they render as "Stimato" (estimate) and never as
 * "Da dichiarazione".
 */
export const selectCertifiedObligations = (
  obligations: FiscalObligation[],
  filedDeclarationIds: Set<string>,
  paidObligationIds: Set<string>,
): FiscalObligation[] =>
  obligations.filter((obligation) =>
    isCertifiedObligation(obligation, filedDeclarationIds, paidObligationIds),
  );
