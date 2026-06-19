/**
 * Deno mirror of `src/components/atomic-crm/dashboard/selectCertifiedObligations.ts`.
 * Keep the rule IN SYNC with the client helper (the client unit test
 * `selectCertifiedObligations.test.ts` is the canonical controllore).
 *
 * Tells a REAL fiscal obligation from a stale hand-entered PROJECTION so the
 * reminder/notification system never acts on uncertified forecasts (e.g. the
 * 2026-04-14 garbage rows that inflated the deadline card to a false 11.100,60 €).
 *
 * CERTIFIED iff: has an F24 payment line, OR backed by a FILED declaration
 * (`declaration_id` set AND that declaration has non-zero totals).
 */

export type CertifiableObligation = {
  id: string;
  declaration_id: string | null;
};

export type CertifiableDeclaration = {
  id: string;
  total_substitute_tax: number | string;
  total_inps: number | string;
};

export type CertifiablePaymentLine = {
  obligation_id: string;
};

export const buildFiledDeclarationIds = (
  declarations: CertifiableDeclaration[],
): Set<string> =>
  new Set(
    declarations
      .filter((d) => Number(d.total_substitute_tax) + Number(d.total_inps) > 0)
      .map((d) => d.id),
  );

export const buildPaidObligationIds = (
  paymentLines: CertifiablePaymentLine[],
): Set<string> => new Set(paymentLines.map((line) => line.obligation_id));

export const isCertifiedObligation = (
  obligation: CertifiableObligation,
  filedDeclarationIds: Set<string>,
  paidObligationIds: Set<string>,
): boolean =>
  paidObligationIds.has(obligation.id) ||
  (obligation.declaration_id != null &&
    filedDeclarationIds.has(obligation.declaration_id));

export const selectCertifiedObligations = <T extends CertifiableObligation>(
  obligations: T[],
  filedDeclarationIds: Set<string>,
  paidObligationIds: Set<string>,
): T[] =>
  obligations.filter((obligation) =>
    isCertifiedObligation(obligation, filedDeclarationIds, paidObligationIds),
  );
