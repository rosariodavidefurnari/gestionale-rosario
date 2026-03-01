// @vitest-environment jsdom

import "@/setupTests";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateHistoricalCashInflowSummary = vi.fn();
const askHistoricalCashInflowQuestion = vi.fn();
const notify = vi.fn();

vi.mock("ra-core", async () => {
  const actual = await vi.importActual<typeof import("ra-core")>("ra-core");
  return {
    ...actual,
    useDataProvider: () => ({
      generateHistoricalCashInflowSummary,
      askHistoricalCashInflowQuestion,
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

import { DashboardHistoricalCashInflowAiCard } from "./DashboardHistoricalCashInflowAiCard";

const renderCard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardHistoricalCashInflowAiCard />
    </QueryClientProvider>,
  );
};

describe("DashboardHistoricalCashInflowAiCard", () => {
  beforeEach(() => {
    generateHistoricalCashInflowSummary.mockReset();
    askHistoricalCashInflowQuestion.mockReset();
    notify.mockReset();
  });

  it("renders the incassi summary action, input, guardrail, and suggested questions", () => {
    renderCard();

    expect(screen.getByText("AI: spiegami gli incassi")).toBeInTheDocument();
    expect(screen.getByText("Oppure fai una domanda")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Fai una domanda sugli incassi"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Qui l'AI usa solo gli incassi già ricevuti. Se un confronto non è corretto o non è dimostrabile, te lo dice.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Qual è stato l'anno con più incassi ricevuti?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Chiedi all'AI" }),
    ).toBeDisabled();
  });

  it("asks a suggested question and renders the answer", async () => {
    askHistoricalCashInflowQuestion.mockResolvedValue({
      question: "Qual è stato l'anno con più incassi ricevuti?",
      model: "gpt-5.2",
      generatedAt: "2026-02-28T07:00:00.000Z",
      answerMarkdown:
        "## Risposta breve\nIl 2025 è l'anno con più incassi ricevuti nella serie disponibile.",
    });

    renderCard();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Qual è stato l'anno con più incassi ricevuti?",
      }),
    );

    await waitFor(() =>
      expect(askHistoricalCashInflowQuestion).toHaveBeenCalledWith(
        "Qual è stato l'anno con più incassi ricevuti?",
      ),
    );
    expect(
      await screen.findByText(
        "Il 2025 è l'anno con più incassi ricevuti nella serie disponibile.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Domanda:/)).toBeInTheDocument();
  });

  it("generates the guided summary for cash inflow", async () => {
    generateHistoricalCashInflowSummary.mockResolvedValue({
      model: "gpt-5.2",
      generatedAt: "2026-02-28T07:00:00.000Z",
      summaryMarkdown:
        "## In breve\nIl 2025 è l'anno che ha portato più soldi incassati nella serie attuale.",
    });

    renderCard();

    fireEvent.click(
      screen.getByRole("button", { name: "Spiegami gli incassi" }),
    );

    await waitFor(() =>
      expect(generateHistoricalCashInflowSummary).toHaveBeenCalledTimes(1),
    );
    expect(
      await screen.findByText(
        "Il 2025 è l'anno che ha portato più soldi incassati nella serie attuale.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rigenera spiegazione" }),
    ).toBeInTheDocument();
  });
});
