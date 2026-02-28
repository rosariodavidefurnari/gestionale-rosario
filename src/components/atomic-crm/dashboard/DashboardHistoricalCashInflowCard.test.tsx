// @vitest-environment jsdom

import "@/setupTests";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getHistoricalCashInflowContext = vi.fn();

vi.mock("ra-core", async () => {
  const actual = await vi.importActual<typeof import("ra-core")>("ra-core");
  return {
    ...actual,
    useDataProvider: () => ({
      getHistoricalCashInflowContext,
    }),
  };
});

import { DashboardHistoricalCashInflowCard } from "./DashboardHistoricalCashInflowCard";

const makeContext = () => ({
  meta: {
    businessTimezone: "Europe/Rome",
    asOfDate: "2026-02-28",
    currentYear: 2026,
    latestClosedYear: 2025,
    firstYearWithCashInflow: 2025,
    lastYearWithCashInflow: 2026,
  },
  metrics: [
    {
      id: "historical_total_cash_inflow",
      label: "Incassi storici totali",
      value: 23985.64,
      formattedValue: "23.986 €",
      basis: "cash_inflow" as const,
      isYtd: true,
      isComparable: true,
      subtitle: "Incassi ricevuti, inclusa la quota YTD dell'anno corrente.",
    },
    {
      id: "latest_closed_year_cash_inflow",
      label: "Ultimo anno chiuso incassato",
      value: 22241.64,
      formattedValue: "22.242 €",
      comparisonLabel: "2025",
      basis: "cash_inflow" as const,
      isYtd: false,
      isComparable: true,
      subtitle: "Ultimo anno chiuso disponibile per incassi ricevuti.",
    },
  ],
  series: {
    yearlyCashInflow: [
      {
        year: 2025,
        cashInflow: 22241.64,
        paymentsCount: 11,
        projectsCount: 9,
        clientsCount: 1,
        isClosedYear: true,
        isYtd: false,
      },
      {
        year: 2026,
        cashInflow: 1744,
        paymentsCount: 1,
        projectsCount: 1,
        clientsCount: 1,
        isClosedYear: false,
        isYtd: true,
      },
    ],
  },
  caveats: [
    "Questi valori sono incassi ricevuti, non compensi per competenza.",
  ],
});

const renderCard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardHistoricalCashInflowCard />
    </QueryClientProvider>,
  );
};

describe("DashboardHistoricalCashInflowCard", () => {
  beforeEach(() => {
    getHistoricalCashInflowContext.mockReset();
  });

  it("renders the non-AI cash inflow summary card", async () => {
    getHistoricalCashInflowContext.mockResolvedValue(makeContext());

    renderCard();

    expect(
      await screen.findByText("Incassi ricevuti nel tempo"),
    ).toBeInTheDocument();
    expect(await screen.findByText("23.986 €")).toBeInTheDocument();
    expect(await screen.findAllByText("22.242 €")).toHaveLength(2);
    expect(
      screen.getByText(
        "Qui guardi solo soldi già entrati, letti per data pagamento. Questo blocco resta separato dal valore del lavoro.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === "P" &&
        element.textContent ===
          "1 pagamento ricevuto · 1 progetto · 1 cliente",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Questi valori sono incassi ricevuti, non compensi per competenza.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the empty state when no historical cash inflow is available", async () => {
    getHistoricalCashInflowContext.mockResolvedValue({
      ...makeContext(),
      meta: {
        ...makeContext().meta,
        firstYearWithCashInflow: null,
        lastYearWithCashInflow: null,
      },
      metrics: [
        {
          ...makeContext().metrics[0],
          value: 0,
          formattedValue: "0 €",
        },
        {
          ...makeContext().metrics[1],
          value: null,
          formattedValue: "N/D",
          comparisonLabel: undefined,
          isComparable: false,
        },
      ],
      series: {
        yearlyCashInflow: [],
      },
    });

    renderCard();

    expect(
      await screen.findByText(
        "Nessun incasso storico disponibile fino al 28/02/2026.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the error state and retries loading", async () => {
    getHistoricalCashInflowContext
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(makeContext());

    renderCard();

    expect(
      await screen.findByText("Impossibile caricare gli incassi storici."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));

    await waitFor(() =>
      expect(getHistoricalCashInflowContext).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByText(
        "Qui guardi solo soldi già entrati, letti per data pagamento. Questo blocco resta separato dal valore del lavoro.",
      ),
    ).toBeInTheDocument();
  });
});
