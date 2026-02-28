import { describe, expect, it } from "vitest";

import { buildHistoricalCashInflowContext } from "./buildHistoricalCashInflowContext";

describe("buildHistoricalCashInflowContext", () => {
  it("serializes a historical cash inflow context with explicit caveats", () => {
    const context = buildHistoricalCashInflowContext({
      meta: {
        id: 1,
        business_timezone: "Europe/Rome",
        as_of_date: "2026-02-28",
        current_year: 2026,
        latest_closed_year: 2025,
        first_year_with_data: 2024,
        last_year_with_data: 2026,
        total_years: 3,
        has_current_year_data: true,
        has_future_services: false,
      },
      yearlyCashInflowRows: [
        {
          year: 2024,
          is_closed_year: true,
          is_ytd: false,
          as_of_date: "2026-02-28",
          cash_inflow: 5000,
          payments_count: 3,
          projects_count: 2,
          clients_count: 1,
        },
        {
          year: 2025,
          is_closed_year: true,
          is_ytd: false,
          as_of_date: "2026-02-28",
          cash_inflow: 8500,
          payments_count: 5,
          projects_count: 3,
          clients_count: 2,
        },
        {
          year: 2026,
          is_closed_year: false,
          is_ytd: true,
          as_of_date: "2026-02-28",
          cash_inflow: 1000,
          payments_count: 2,
          projects_count: 1,
          clients_count: 1,
        },
      ],
    });

    expect(context.meta.firstYearWithCashInflow).toBe(2024);
    expect(context.meta.lastYearWithCashInflow).toBe(2026);
    expect(
      context.metrics.find(
        (metric) => metric.id === "historical_total_cash_inflow",
      ),
    ).toMatchObject({
      value: 14500,
      basis: "cash_inflow",
    });
    expect(
      context.metrics.find(
        (metric) => metric.id === "latest_closed_year_cash_inflow",
      ),
    ).toMatchObject({
      value: 8500,
      comparisonLabel: "2025",
    });
    expect(context.series.yearlyCashInflow.at(-1)).toMatchObject({
      year: 2026,
      cashInflow: 1000,
      isYtd: true,
    });
    expect(context.caveats).toContain(
      "Questi valori sono incassi ricevuti, non compensi per competenza.",
    );
    expect(context.caveats).toContain(
      "La base temporale usa `payments.payment_date`, non `services.service_date`.",
    );
  });

  it("returns N/D for the latest closed-year metric when no closed cash years exist", () => {
    const context = buildHistoricalCashInflowContext({
      meta: {
        id: 1,
        business_timezone: "Europe/Rome",
        as_of_date: "2026-02-28",
        current_year: 2026,
        latest_closed_year: 2025,
        first_year_with_data: null,
        last_year_with_data: null,
        total_years: 0,
        has_current_year_data: false,
        has_future_services: false,
      },
      yearlyCashInflowRows: [
        {
          year: 2026,
          is_closed_year: false,
          is_ytd: true,
          as_of_date: "2026-02-28",
          cash_inflow: 400,
          payments_count: 1,
          projects_count: 1,
          clients_count: 1,
        },
      ],
    });

    expect(
      context.metrics.find(
        (metric) => metric.id === "latest_closed_year_cash_inflow",
      ),
    ).toMatchObject({
      value: null,
      formattedValue: "N/D",
      isComparable: false,
    });
  });
});
