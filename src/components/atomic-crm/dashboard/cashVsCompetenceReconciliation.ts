import {
  getSignedPaymentAmount,
  isPaymentExcludedByTaxabilityDefaults,
} from "./fiscalModel";
import { getBusinessYear } from "@/lib/dateTimezone";
import type { FiscalConfig, Payment, Project } from "../types";

/**
 * Read-only reconciliation between the CASH basis (legal/operative, `payment_date`)
 * and the INVOICE-DATE COMPETENCE basis (the commercialista's method, `issue_date`).
 *
 * It does NOT change the fiscal estimate: it reuses the EXACT same "signed taxable
 * payment" definition as `buildFiscalYearEstimate` (same signing + same taxability
 * exclusions) and only re-buckets each received payment by the issue-date year of
 * its linked financial document (fallback: cash year when unlinked/unresolved).
 *
 * Output amounts are RAW (not rounded) so the conservation invariant
 * `Σ cashTaxable === Σ competenceTaxable` holds; round only at display time.
 */

export type CashVsCompetenceYearRow = {
  year: number;
  /** Σ signed taxable payments received in this calendar year (cash basis). */
  cashTaxable: number;
  /** Σ signed taxable payments attributed to this year by invoice issue-date. */
  competenceTaxable: number;
  /** Received-taxable payments of this cash-year that have a resolved invoice date. */
  linkedCount: number;
  /** All received-taxable payments of this cash-year. */
  totalCount: number;
  linkedAmount: number;
  totalAmount: number;
  /** linkedAmount / totalAmount on the cash axis; null when totalAmount === 0. */
  coverageRatio: number | null;
};

export type CashVsCompetenceBridgeRow = {
  paymentId: Payment["id"];
  amount: number;
  documentId: NonNullable<Payment["financial_document_id"]>;
  cashYear: number;
  competenceYear: number;
};

export type CashVsCompetenceReconciliation = {
  byYear: CashVsCompetenceYearRow[];
  bridge: CashVsCompetenceBridgeRow[];
};

type YearAccumulator = {
  cashTaxable: number;
  competenceTaxable: number;
  linkedCount: number;
  totalCount: number;
  linkedAmount: number;
  totalAmount: number;
};

const emptyAccumulator = (): YearAccumulator => ({
  cashTaxable: 0,
  competenceTaxable: 0,
  linkedCount: 0,
  totalCount: 0,
  linkedAmount: 0,
  totalAmount: 0,
});

export const buildCashVsCompetenceReconciliation = ({
  payments,
  projects,
  issueDateByDocId,
  fiscalConfig,
}: {
  payments: Payment[];
  projects: Project[];
  /** financial_document_id -> issue_date (built from financial_documents_summary). */
  issueDateByDocId: Map<string, string>;
  fiscalConfig: FiscalConfig;
}): CashVsCompetenceReconciliation => {
  const projectById = new Map(
    projects.map((project) => [String(project.id), project]),
  );
  const taxDefaults = fiscalConfig.taxabilityDefaults;

  const yearAcc = new Map<number, YearAccumulator>();
  const ensure = (year: number): YearAccumulator => {
    let acc = yearAcc.get(year);
    if (!acc) {
      acc = emptyAccumulator();
      yearAcc.set(year, acc);
    }
    return acc;
  };
  const bridge: CashVsCompetenceBridgeRow[] = [];

  for (const payment of payments) {
    if (payment.status !== "ricevuto") continue;
    if (!payment.payment_date) continue;

    // SAME sequence as buildFiscalYearEstimate (fiscalModel.ts:232-244):
    // signing FIRST, taxability exclusion AFTER.
    const amount = getSignedPaymentAmount(payment);
    if (
      isPaymentExcludedByTaxabilityDefaults({
        payment,
        projectById,
        taxDefaults,
      })
    ) {
      continue;
    }

    const cashYear = getBusinessYear(payment.payment_date);
    if (cashYear == null) continue;

    const docId = payment.financial_document_id;
    const issueDate =
      docId != null ? issueDateByDocId.get(String(docId)) : undefined;
    const resolved = issueDate != null;
    const competenceYear = resolved
      ? (getBusinessYear(issueDate) ?? cashYear)
      : cashYear;

    const cashAcc = ensure(cashYear);
    cashAcc.cashTaxable += amount;
    cashAcc.totalCount += 1;
    cashAcc.totalAmount += amount;
    if (resolved) {
      cashAcc.linkedCount += 1;
      cashAcc.linkedAmount += amount;
    }

    ensure(competenceYear).competenceTaxable += amount;

    if (resolved && competenceYear !== cashYear) {
      bridge.push({
        paymentId: payment.id,
        amount,
        documentId: docId,
        cashYear,
        competenceYear,
      });
    }
  }

  const byYear: CashVsCompetenceYearRow[] = [...yearAcc.entries()]
    .map(([year, acc]) => ({
      year,
      cashTaxable: acc.cashTaxable,
      competenceTaxable: acc.competenceTaxable,
      linkedCount: acc.linkedCount,
      totalCount: acc.totalCount,
      linkedAmount: acc.linkedAmount,
      totalAmount: acc.totalAmount,
      coverageRatio:
        acc.totalAmount !== 0 ? acc.linkedAmount / acc.totalAmount : null,
    }))
    .sort((left, right) => left.year - right.year);

  bridge.sort(
    (left, right) =>
      right.amount - left.amount || left.cashYear - right.cashYear,
  );

  return { byYear, bridge };
};

/** Bridge row enriched with the human document number, for display. */
export type CashVsCompetenceBridgeView = CashVsCompetenceBridgeRow & {
  documentNumber: string;
};

/** Ready-to-render reconciliation (bridge rows carry the document number). */
export type CashVsCompetenceView = {
  byYear: CashVsCompetenceYearRow[];
  bridge: CashVsCompetenceBridgeView[];
};
