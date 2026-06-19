// @vitest-environment jsdom

// QW3 controller (primary, date-independent): proves the mobile annual
// dashboard renders the cash-flow forecast card AND the deadline tracker
// ("scadenzario") for the current year, and renders NEITHER for a past year.
// Falsifiable: remove either card's wiring -> its assertion fails; remove the
// `isCurrentYear` gate -> the past-year case fails. Mirrors UI-7 parity with
// DashboardAnnual.tsx.

import "@/setupTests";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardModel } from "./dashboardModel";

const renderWithQueryClient = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

const mockUseDashboardData = vi.fn();

vi.mock("./useDashboardData", () => ({
  useDashboardData: () => mockUseDashboardData(),
}));

vi.mock("./useFiscalReality", () => ({
  useFiscalReality: () => ({ deadlineViews: null, totalOpenObligations: 0 }),
}));

vi.mock("@/hooks/useRealtimeInvalidation", () => ({
  useRealtimeInvalidation: () => {},
}));

// Keep ra-core real except the two hooks this component pulls directly.
vi.mock("ra-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ra-core")>();
  return {
    ...actual,
    useDataProvider: () => ({ getFiscalDeclaration: vi.fn() }),
    useTimeout: () => false,
  };
});

// Stub the layout wrapper to avoid router/layout deps.
vi.mock("../layout/MobileContent", () => ({
  MobileContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// The two cards under test: stubs echo the prop they receive, so the assertion
// proves both the wiring AND that the right data object reaches the card.
vi.mock("./DashboardCashFlowCard", () => ({
  DashboardCashFlowCard: ({
    forecast,
  }: {
    forecast: { inflowsTotal: number };
  }) => <div data-testid="mobile-cash-flow">{forecast.inflowsTotal}</div>,
}));

vi.mock("./DashboardDeadlineTracker", () => ({
  DashboardDeadlineTracker: ({ alerts }: { alerts: unknown }) => (
    <div data-testid="mobile-deadline-tracker">
      {alerts ? "has-alerts" : "no-alerts"}
    </div>
  ),
}));

// Remaining children + dialogs: inert stubs (not under test here).
vi.mock("./DashboardKpiCards", () => ({
  DashboardKpiCards: () => <div data-testid="kpi-cards" />,
}));
vi.mock("./DashboardAnnualAiSummaryCard", () => ({
  DashboardAnnualAiSummaryCard: () => <div data-testid="ai-summary" />,
}));
vi.mock("./DashboardFiscalWarnings", () => ({
  DashboardFiscalWarnings: () => <div data-testid="fiscal-warnings" />,
}));
vi.mock("./DashboardHistorical", () => ({
  DashboardHistorical: () => <div data-testid="historical" />,
}));
vi.mock("./DashboardLoading", () => ({
  MobileDashboardLoading: () => <div data-testid="mobile-loading" />,
}));
vi.mock("./DichiarazioneEntryDialog", () => ({
  DichiarazioneEntryDialog: () => null,
}));
vi.mock("./F24RegistrationDialog", () => ({
  F24RegistrationDialog: () => null,
}));
vi.mock("./ObligationEntryDialog", () => ({
  ObligationEntryDialog: () => null,
}));

import { MobileDashboard } from "./MobileDashboard";

const makeModel = ({
  isCurrentYear,
  selectedYear,
}: {
  isCurrentYear: boolean;
  selectedYear: number;
}): DashboardModel =>
  ({
    selectedYear,
    isCurrentYear,
    kpis: {},
    meta: {},
    revenueTrend: [],
    categoryBreakdown: [],
    quotePipeline: [],
    topClients: [],
    drilldowns: {},
    qualityFlags: [],
    fiscal: null,
    alerts: {
      unansweredQuotes: [],
      upcomingServices: [],
    },
    cashFlowForecast: isCurrentYear
      ? {
          horizonDays: 30,
          inflows: [
            {
              label: "Pagamento test",
              amount: 1234,
              date: "2026-06-25",
              type: "payment",
            },
          ],
          inflowsTotal: 1234,
          outflows: [],
          outflowsTotal: 0,
          netFlow: 1234,
        }
      : null,
  }) as unknown as DashboardModel;

const setData = (model: DashboardModel) =>
  mockUseDashboardData.mockReturnValue({
    data: model,
    outstandingReceivables: { total: 0, count: 0 },
    isPending: false,
    error: null,
    refetch: () => {},
  });

describe("MobileDashboard QW3 parity (cash flow + deadline tracker)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both the cash-flow card and the deadline tracker for the current year", () => {
    setData(makeModel({ isCurrentYear: true, selectedYear: 2026 }));

    renderWithQueryClient(<MobileDashboard />);

    const cashFlow = screen.getByTestId("mobile-cash-flow");
    expect(cashFlow).toBeInTheDocument();
    // proves the forecast object reached the card (not just that it rendered)
    expect(cashFlow).toHaveTextContent("1234");

    const tracker = screen.getByTestId("mobile-deadline-tracker");
    expect(tracker).toBeInTheDocument();
    expect(tracker).toHaveTextContent("has-alerts");
  });

  it("renders NEITHER card for a past year (gate parity with desktop)", () => {
    setData(makeModel({ isCurrentYear: false, selectedYear: 2024 }));

    renderWithQueryClient(<MobileDashboard />);

    expect(screen.queryByTestId("mobile-cash-flow")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("mobile-deadline-tracker"),
    ).not.toBeInTheDocument();
  });
});
