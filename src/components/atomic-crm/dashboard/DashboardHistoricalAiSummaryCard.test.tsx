// @vitest-environment jsdom

import "@/setupTests";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateHistoricalAnalyticsSummary = vi.fn();
const askHistoricalAnalyticsQuestion = vi.fn();
const notify = vi.fn();

vi.mock("ra-core", async () => {
  const actual = await vi.importActual<typeof import("ra-core")>("ra-core");
  return {
    ...actual,
    useDataProvider: () => ({
      generateHistoricalAnalyticsSummary,
      askHistoricalAnalyticsQuestion,
    }),
    useNotify: () => notify,
  };
});

vi.mock("../root/ConfigurationContext", () => ({
  useConfigurationContext: () => ({
    aiConfig: {
      historicalAnalysisModel: "gpt-5.2",
    },
  }),
}));

import { DashboardHistoricalAiSummaryCard } from "./DashboardHistoricalAiSummaryCard";

const renderCard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardHistoricalAiSummaryCard />
    </QueryClientProvider>,
  );
};

describe("DashboardHistoricalAiSummaryCard", () => {
  beforeEach(() => {
    generateHistoricalAnalyticsSummary.mockReset();
    askHistoricalAnalyticsQuestion.mockReset();
    notify.mockReset();
  });

  it("renders the summary action, input, guardrail, and suggested questions", () => {
    renderCard();

    expect(screen.getByText("AI: spiegami questi numeri")).toBeInTheDocument();
    expect(screen.getByText("Oppure fai una domanda")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Fai una domanda su questi numeri"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "L'AI risponde usando solo i dati storici mostrati qui. Se una cosa non è dimostrabile, te lo dice.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Perché il 2025 è andato meglio del 2024?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Chiedi all'AI" }),
    ).toBeDisabled();
  });

  it("asks a suggested question and renders the answer", async () => {
    askHistoricalAnalyticsQuestion.mockResolvedValue({
      question: "Perché il 2025 è andato meglio del 2024?",
      model: "gpt-5.2",
      generatedAt: "2026-02-28T07:00:00.000Z",
      answerMarkdown:
        "## Risposta breve\nIl 2025 è più forte perché il valore del lavoro è molto più alto del 2024.",
    });

    renderCard();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Perché il 2025 è andato meglio del 2024?",
      }),
    );

    await waitFor(() =>
      expect(askHistoricalAnalyticsQuestion).toHaveBeenCalledWith(
        "Perché il 2025 è andato meglio del 2024?",
      ),
    );
    expect(
      await screen.findByText(
        "Il 2025 è più forte perché il valore del lavoro è molto più alto del 2024.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Domanda:/)).toBeInTheDocument();
  });

  it("generates the guided summary without breaking the existing flow", async () => {
    generateHistoricalAnalyticsSummary.mockResolvedValue({
      model: "gpt-5.2",
      generatedAt: "2026-02-28T07:00:00.000Z",
      summaryMarkdown:
        "## In breve\nNel 2025 l'azienda ha lavorato molto di più del 2024.",
    });

    renderCard();

    fireEvent.click(
      screen.getByRole("button", { name: "Spiegami lo storico" }),
    );

    await waitFor(() =>
      expect(generateHistoricalAnalyticsSummary).toHaveBeenCalledTimes(1),
    );
    expect(
      await screen.findByText(
        "Nel 2025 l'azienda ha lavorato molto di più del 2024.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rigenera spiegazione" }),
    ).toBeInTheDocument();
  });
});
