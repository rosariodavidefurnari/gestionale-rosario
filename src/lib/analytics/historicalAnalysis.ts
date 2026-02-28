import type { LabeledValue } from "@/components/atomic-crm/types";

export const defaultHistoricalAnalysisModel = "gpt-5.2";

export const historicalAnalysisModelChoices: LabeledValue[] = [
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5-mini", label: "GPT-5 mini" },
  { value: "gpt-5-nano", label: "GPT-5 nano" },
];

export const historicalAnalyticsSuggestedQuestions = [
  "Perché il 2025 è andato meglio del 2024?",
  "Qual è il segnale più importante?",
  "Cosa devo controllare subito?",
  "Da dove arrivano davvero i risultati?",
] as const;

export type HistoricalAnalyticsSummary = {
  model: string;
  generatedAt: string;
  summaryMarkdown: string;
};

export type HistoricalAnalyticsAnswer = {
  question: string;
  model: string;
  generatedAt: string;
  answerMarkdown: string;
};
