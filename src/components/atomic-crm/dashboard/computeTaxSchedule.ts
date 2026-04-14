import type { Payment } from "../types";
import type {
  FiscalDeclaration,
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";
import type { FiscalDeadlineComponent } from "./fiscalModelTypes";
import { diffBusinessDays, getBusinessYear } from "@/lib/dateTimezone";
import { roundFiscalOutput } from "./roundFiscalOutput";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Baseline fiscal profile derived from the most recent real declaration.
 * The "effective rate" is the real percentage the user's accountant applied,
 * not the theoretical forfettario formula (78% × 26.07% × 5%).
 *
 * Example for Rosario Furnari 2024:
 *   taxYear: 2024
 *   totalRevenue: 13740.18
 *   totalTaxes: 3900.40 (233 sost + 3667.40 INPS)
 *   effectiveRate: 0.2839 (28.39%)
 *   sostShare: 0.0597 (233 / 3900.40)
 *   inpsShare: 0.9403 (3667.40 / 3900.40)
 */
export type TaxEffectiveBaseline = {
  taxYear: number;
  totalRevenue: number;
  totalTaxes: number;
  effectiveRate: number;
  sostShare: number;
  inpsShare: number;
};

export type TaxDeadlineItemView = {
  component: FiscalDeadlineComponent;
  label: string;
  amount: number;
  competenceYear: number;
};

export type TaxDeadlineView = {
  date: string;
  label: string;
  daysUntil: number;
  items: TaxDeadlineItemView[];
  totalAmount: number;
  /**
   * True if this deadline includes "saldo" items (real taxes owed for a past
   * closed year). False if it only contains "anticipi" (forced advances that
   * will be netted against next year's balance).
   */
  hasSaldo: boolean;
};

export type TaxYtdMatured = {
  year: number;
  revenueYtd: number;
  taxesMatured: number;
  effectiveRate: number;
  baselineTaxYear: number;
};

export type TaxSchedule = {
  baseline: TaxEffectiveBaseline | null;
  ytd: TaxYtdMatured | null;
  upcomingDeadlines: TaxDeadlineView[];
  totalCashOutYear: number;
  totalSaldoPortion: number;
  totalAnticipoPortion: number;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const COMPONENT_LABELS: Record<FiscalDeadlineComponent, string> = {
  imposta_saldo: "Saldo sostitutiva",
  inps_saldo: "Saldo INPS",
  imposta_acconto_1: "1° Acconto sostitutiva",
  inps_acconto_1: "1° Acconto INPS",
  imposta_acconto_2: "2° Acconto sostitutiva",
  imposta_acconto_unico: "Acconto unico sostitutiva",
  inps_acconto_2: "2° Acconto INPS",
  interessi_erario: "Interessi rateazione Erario",
  interessi_inps: "Interessi rateazione INPS",
  bollo: "Bollo fatture",
  dichiarazione: "Dichiarazione",
};

const SALDO_COMPONENTS = new Set<FiscalDeadlineComponent>([
  "imposta_saldo",
  "inps_saldo",
]);

const HIGH_PRIORITY_COMPONENTS = new Set<FiscalDeadlineComponent>([
  "imposta_saldo",
  "inps_saldo",
  "imposta_acconto_1",
  "imposta_acconto_2",
  "imposta_acconto_unico",
  "inps_acconto_1",
  "inps_acconto_2",
  "interessi_erario",
  "interessi_inps",
]);

const sumPaymentsByYear = (payments: Payment[], year: number): number => {
  let total = 0;
  for (const p of payments) {
    if (p.status !== "ricevuto") continue;
    if (!p.payment_date) continue;
    if (getBusinessYear(p.payment_date) !== year) continue;
    const amount = p.payment_type === "rimborso" ? -p.amount : p.amount;
    total += amount;
  }
  return total;
};

/**
 * Picks the most recent closed-year declaration with real non-zero totals
 * as the baseline for effective rate computation. Projected/placeholder
 * declarations with both totals at 0 are skipped.
 *
 * We also prefer years strictly before the current one, so the baseline is
 * always a closed year with data known to the accountant.
 */
const pickBaselineDeclaration = (
  declarations: FiscalDeclaration[],
  currentYear: number,
): FiscalDeclaration | null => {
  const candidates = declarations.filter((d) => {
    if (d.tax_year >= currentYear) return false;
    const total = Number(d.total_substitute_tax) + Number(d.total_inps);
    return total > 0;
  });
  if (candidates.length === 0) return null;
  // Most recent first
  candidates.sort((a, b) => b.tax_year - a.tax_year);
  return candidates[0];
};

const buildBaseline = (
  declaration: FiscalDeclaration,
  payments: Payment[],
): TaxEffectiveBaseline | null => {
  const totalSost = Number(declaration.total_substitute_tax);
  const totalInps = Number(declaration.total_inps);
  const totalTaxes = totalSost + totalInps;
  if (totalTaxes <= 0) return null;

  const totalRevenue = sumPaymentsByYear(payments, declaration.tax_year);
  if (totalRevenue <= 0) return null;

  return {
    taxYear: declaration.tax_year,
    totalRevenue: roundFiscalOutput(totalRevenue),
    totalTaxes: roundFiscalOutput(totalTaxes),
    effectiveRate: totalTaxes / totalRevenue,
    sostShare: totalSost / totalTaxes,
    inpsShare: totalInps / totalTaxes,
  };
};

/**
 * Returns the amount of an obligation that is still owed (not yet paid via
 * any F24 submission registered in the system).
 */
const computeRemainingAmount = (
  obligation: FiscalObligation,
  paymentLines: FiscalF24PaymentLineEnriched[],
): number => {
  if (obligation.is_overridden && Number(obligation.amount) === 0) {
    return 0;
  }
  const paid = paymentLines
    .filter((pl) => pl.obligation_id === obligation.id)
    .reduce((sum, pl) => sum + Number(pl.amount), 0);
  return Math.max(0, Number(obligation.amount) - paid);
};

// ── Main function ───────────────────────────────────────────────────────────

/**
 * Computes a user-facing tax schedule from the real data in the database.
 *
 * Philosophy: no theoretical formula. Use the real declaration the accountant
 * produced last year to derive the "effective rate" (which for a forfettario
 * includes maternità, conguagli, minimali and whatever else), then apply it
 * to current-year revenue to estimate how much has been "set aside" so far.
 *
 * Future deadlines are read directly from `fiscal_obligations` rows — if the
 * user (or the import script) has inserted projected obligations, they appear
 * here 1:1. We only subtract what has already been paid via F24 submissions.
 *
 * The goal is to produce exactly two numbers the user actually cares about:
 *   1. "How much do I owe on the next due date?"
 *   2. "How much of my current income is already earmarked for the taxman?"
 */
export const computeTaxSchedule = ({
  declarations,
  obligations,
  payments,
  paymentLines,
  todayIso,
}: {
  declarations: FiscalDeclaration[];
  obligations: FiscalObligation[];
  payments: Payment[];
  paymentLines: FiscalF24PaymentLineEnriched[];
  todayIso: string;
}): TaxSchedule => {
  const currentYear = getBusinessYear(todayIso) ?? new Date().getFullYear();

  // 1. Baseline from the most recent closed-year real declaration
  const baselineDeclaration = pickBaselineDeclaration(declarations, currentYear);
  const baseline = baselineDeclaration
    ? buildBaseline(baselineDeclaration, payments)
    : null;

  // 2. YTD matured taxes: apply baseline effective rate to current revenue
  let ytd: TaxYtdMatured | null = null;
  if (baseline) {
    const revenueYtd = sumPaymentsByYear(payments, currentYear);
    ytd = {
      year: currentYear,
      revenueYtd: roundFiscalOutput(revenueYtd),
      taxesMatured: roundFiscalOutput(revenueYtd * baseline.effectiveRate),
      effectiveRate: baseline.effectiveRate,
      baselineTaxYear: baseline.taxYear,
    };
  }

  // 3. Upcoming deadlines: filter future obligations, group by date
  const futureObligations = obligations.filter((o) => {
    if (o.due_date <= todayIso) return false;
    if (!HIGH_PRIORITY_COMPONENTS.has(o.component)) return false;
    const remaining = computeRemainingAmount(o, paymentLines);
    return remaining > 0;
  });

  const byDate = new Map<string, FiscalObligation[]>();
  for (const o of futureObligations) {
    const list = byDate.get(o.due_date) ?? [];
    list.push(o);
    byDate.set(o.due_date, list);
  }

  const deadlines: TaxDeadlineView[] = [];
  for (const [date, oblgs] of byDate.entries()) {
    const items: TaxDeadlineItemView[] = oblgs
      .map((o) => ({
        component: o.component,
        label: COMPONENT_LABELS[o.component] ?? o.component,
        amount: roundFiscalOutput(computeRemainingAmount(o, paymentLines)),
        competenceYear: o.competence_year,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const totalAmount = roundFiscalOutput(
      items.reduce((sum, i) => sum + i.amount, 0),
    );
    const hasSaldo = oblgs.some((o) => SALDO_COMPONENTS.has(o.component));
    const daysUntil = diffBusinessDays(todayIso, date) ?? 0;

    // Build a human label from what's inside the deadline
    const hasAcconto = oblgs.some(
      (o) =>
        o.component === "imposta_acconto_1" ||
        o.component === "inps_acconto_1" ||
        o.component === "imposta_acconto_2" ||
        o.component === "inps_acconto_2" ||
        o.component === "imposta_acconto_unico",
    );
    let label = "Versamento F24";
    if (hasSaldo && hasAcconto) label = "Saldo + 1° Acconto";
    else if (hasSaldo) label = "Saldo annuale";
    else if (hasAcconto) label = "Acconto";

    deadlines.push({
      date,
      label,
      daysUntil,
      items,
      totalAmount,
      hasSaldo,
    });
  }

  deadlines.sort((a, b) => a.date.localeCompare(b.date));

  // 4. Aggregate totals for current year
  const deadlinesInCurrentYear = deadlines.filter(
    (d) => getBusinessYear(d.date) === currentYear,
  );

  const totalCashOutYear = roundFiscalOutput(
    deadlinesInCurrentYear.reduce((sum, d) => sum + d.totalAmount, 0),
  );

  // Saldo portion = amounts with component ∈ {imposta_saldo, inps_saldo}
  // Anticipo portion = amounts with component ∈ acconto_*
  let totalSaldoPortion = 0;
  let totalAnticipoPortion = 0;
  for (const d of deadlinesInCurrentYear) {
    for (const item of d.items) {
      if (SALDO_COMPONENTS.has(item.component)) {
        totalSaldoPortion += item.amount;
      } else {
        totalAnticipoPortion += item.amount;
      }
    }
  }

  return {
    baseline,
    ytd,
    upcomingDeadlines: deadlines,
    totalCashOutYear,
    totalSaldoPortion: roundFiscalOutput(totalSaldoPortion),
    totalAnticipoPortion: roundFiscalOutput(totalAnticipoPortion),
  };
};
