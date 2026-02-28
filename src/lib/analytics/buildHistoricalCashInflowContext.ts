import type { AnalyticsHistoryMetaRow } from "@/components/atomic-crm/dashboard/dashboardHistoryModel";

import { getAnalyticsMetricDefinition } from "./analyticsDefinitions";

export type AnalyticsYearlyCashInflowRow = {
  year: number | string;
  is_closed_year: boolean;
  is_ytd: boolean;
  as_of_date: string;
  cash_inflow: number | string | null;
  payments_count: number | string | null;
  projects_count: number | string | null;
  clients_count: number | string | null;
};

export type HistoricalCashInflowContext = {
  meta: {
    businessTimezone: string;
    asOfDate: string;
    currentYear: number;
    latestClosedYear: number | null;
    firstYearWithCashInflow: number | null;
    lastYearWithCashInflow: number | null;
  };
  metrics: Array<{
    id: string;
    label: string;
    value: number | null;
    formattedValue: string;
    comparisonLabel?: string;
    basis: "cash_inflow";
    isYtd: boolean;
    isComparable: boolean;
    subtitle: string;
  }>;
  series: {
    yearlyCashInflow: Array<{
      year: number;
      cashInflow: number;
      paymentsCount: number;
      projectsCount: number;
      clientsCount: number;
      isClosedYear: boolean;
      isYtd: boolean;
    }>;
  };
  caveats: string[];
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const pushCaveat = (caveats: string[], value: string) => {
  if (!caveats.includes(value)) {
    caveats.push(value);
  }
};

const formatCurrency = (value: number | null) =>
  value == null
    ? "N/D"
    : value.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      });

export const buildHistoricalCashInflowContext = ({
  meta,
  yearlyCashInflowRows,
}: {
  meta: AnalyticsHistoryMetaRow;
  yearlyCashInflowRows: AnalyticsYearlyCashInflowRow[];
}): HistoricalCashInflowContext => {
  const totalDefinition = getAnalyticsMetricDefinition(
    "historical_total_cash_inflow",
  )!;
  const latestDefinition = getAnalyticsMetricDefinition(
    "latest_closed_year_cash_inflow",
  )!;
  const caveats: string[] = [];

  const yearlyCashInflow = yearlyCashInflowRows
    .map((row) => ({
      year: toNumber(row.year),
      cashInflow: toNumber(row.cash_inflow),
      paymentsCount: toNumber(row.payments_count),
      projectsCount: toNumber(row.projects_count),
      clientsCount: toNumber(row.clients_count),
      isClosedYear: row.is_closed_year,
      isYtd: row.is_ytd,
    }))
    .sort((a, b) => a.year - b.year);

  const totalHistoricalCashInflow = yearlyCashInflow.reduce(
    (sum, row) => sum + row.cashInflow,
    0,
  );
  const closedYearRows = yearlyCashInflow.filter((row) => row.isClosedYear);
  const latestClosedYearRow =
    closedYearRows.length > 0
      ? [...closedYearRows].sort((a, b) => b.year - a.year)[0]
      : null;

  pushCaveat(
    caveats,
    "Questi valori sono incassi ricevuti, non compensi per competenza.",
  );
  pushCaveat(
    caveats,
    "La base temporale usa `payments.payment_date`, non `services.service_date`.",
  );
  pushCaveat(
    caveats,
    "I pagamenti con tipo `rimborso` sono esclusi per non mischiare entrate e uscite.",
  );
  pushCaveat(
    caveats,
    `${toNumber(meta.current_year)} è trattato come YTD al ${new Date(meta.as_of_date).toLocaleDateString("it-IT")}.`,
  );

  return {
    meta: {
      businessTimezone: meta.business_timezone,
      asOfDate: meta.as_of_date,
      currentYear: toNumber(meta.current_year),
      latestClosedYear:
        meta.latest_closed_year == null ? null : toNumber(meta.latest_closed_year),
      firstYearWithCashInflow:
        yearlyCashInflow.length > 0 ? yearlyCashInflow[0].year : null,
      lastYearWithCashInflow:
        yearlyCashInflow.length > 0
          ? yearlyCashInflow[yearlyCashInflow.length - 1].year
          : null,
    },
    metrics: [
      {
        id: totalDefinition.id,
        label: totalDefinition.label,
        value: totalHistoricalCashInflow,
        formattedValue: formatCurrency(totalHistoricalCashInflow),
        basis: totalDefinition.basis,
        isYtd: true,
        isComparable: true,
        subtitle: totalDefinition.defaultSubtitle,
      },
      {
        id: latestDefinition.id,
        label: latestDefinition.label,
        value: latestClosedYearRow?.cashInflow ?? null,
        formattedValue: formatCurrency(latestClosedYearRow?.cashInflow ?? null),
        comparisonLabel:
          latestClosedYearRow == null ? undefined : String(latestClosedYearRow.year),
        basis: latestDefinition.basis,
        isYtd: false,
        isComparable: latestClosedYearRow != null,
        subtitle: latestDefinition.defaultSubtitle,
      },
    ],
    series: {
      yearlyCashInflow,
    },
    caveats,
  };
};
